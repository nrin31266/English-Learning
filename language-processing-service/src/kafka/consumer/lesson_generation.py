# src/kafka/consumer/lesson_generation.py
import asyncio
import json
import logging
import os
from typing import List

from src import dto
from src.enum import LessonProcessingStep, LessonSourceType
from src.kafka.event import (
    LessonGenerationRequestedEvent,
    LessonProcessingStepUpdatedEvent,
)
from src.kafka.producer import publish_lesson_processing_step_updated
from src.llm.analyzer import analyze_sentence_batch
from src.s3_storage import cloud_service
from src.services import ai_job_service, media_service, speech_to_text_service
from src.services.file_service import fetch_json_from_url, file_exists
from src.services.spaCy_service import analyze_word
from src.utils.chunk_utils import chunk_list
from src.utils.text_utils import clean_for_spacy

logger = logging.getLogger(__name__)

NLP_BATCH_SIZE = int(os.getenv("NLP_BATCH_SIZE", "100"))
NLP_MAX_CONCURRENCY = int(os.getenv("NLP_MAX_CONCURRENCY", "1"))
SPACY_PROGRESS_EVERY = int(os.getenv("SPACY_PROGRESS_EVERY", "50"))
LESSON_GENERATION_START_DELAY = float(os.getenv("LESSON_GENERATION_START_DELAY", "2"))


def _job_tag(ai_job_id: str | None) -> str:
    return f"ai_job_id={ai_job_id or '-'}"


async def _is_cancelled(ai_job_id: str | None) -> bool:
    if not ai_job_id:
        return False

    cancelled = await ai_job_service.ai_job_was_cancelled(ai_job_id)

    if cancelled:
        logger.info("[LessonGeneration] Cancelled | %s", _job_tag(ai_job_id))

    return cancelled


async def _load_metadata(
    url: str | None,
    is_restart: bool,
) -> dto.LessonGenerationAiMetadataDto:
    if not url or is_restart:
        return dto.LessonGenerationAiMetadataDto()

    try:
        data = await fetch_json_from_url(url)

        if not data:
            return dto.LessonGenerationAiMetadataDto()

        return dto.LessonGenerationAiMetadataDto.model_validate(data)

    except Exception as e:
        logger.warning("[LessonGeneration] Load metadata failed: %s", e)
        return dto.LessonGenerationAiMetadataDto()


async def _save_metadata(
    lesson_id: int | None,
    metadata: dto.LessonGenerationAiMetadataDto,
) -> str | None:
    if not lesson_id:
        return None

    return await cloud_service.upload_json_content(
        json.dumps(metadata.model_dump(by_alias=True), ensure_ascii=False),
        public_id=f"lps/lessons/{lesson_id}/ai-metadata",
    )


async def _publish_step(
    ai_job_id: str | None,
    step: LessonProcessingStep,
    message: str,
    audio_url: str | None = None,
    source_reference_id: str | None = None,
    thumbnail_url: str | None = None,
    is_skip: bool = False,
    metadata_url: str | None = None,
    duration_seconds: int = 0,
) -> None:
    await publish_lesson_processing_step_updated(
        LessonProcessingStepUpdatedEvent(
            aiJobId=ai_job_id,
            processingStep=step,
            audioUrl=audio_url,
            sourceReferenceId=source_reference_id,
            thumbnailUrl=thumbnail_url,
            isSkip=is_skip,
            aiMetadataUrl=metadata_url,
            durationSeconds=duration_seconds,
            aiMessage=message,
        )
    )

    logger.info(
        "[LessonGeneration] Step published | %s | step=%s | skip=%s | %s",
        _job_tag(ai_job_id),
        step,
        is_skip,
        message,
    )


async def _download_audio_by_source(
    event: LessonGenerationRequestedEvent,
) -> dto.AudioInfo:
    request = dto.MediaAudioCreateRequest(input_url=event.source_url)

    if event.source_type == LessonSourceType.youtube:
        return await media_service.download_youtube_audio(request)

    return await media_service.download_audio_file(request)


async def _ensure_local_audio_file(audio_info: dto.AudioInfo) -> dto.AudioInfo:
    if file_exists(audio_info.file_path):
        logger.info("[LessonGeneration] Local audio exists | path=%s", audio_info.file_path)
        return audio_info

    downloaded = await media_service.download_audio_file(
        dto.MediaAudioCreateRequest(
            input_url=audio_info.audioUrl,
            audio_name=audio_info.sourceReferenceId,
        )
    )

    audio_info.file_path = downloaded.file_path

    logger.info("[LessonGeneration] Local audio downloaded | path=%s", audio_info.file_path)

    return audio_info


async def _enrich_words_with_spacy(
    sentence_text: str,
    words: List[dto.WordDto],
) -> List[dto.WordDto]:
    if not words or not sentence_text:
        return words

    enriched_words = []

    for word_obj in words:
        word_text = word_obj.word

        if not word_text:
            enriched_words.append(word_obj)
            continue

        clean_word = clean_for_spacy(word_text)

        if not clean_word:
            word_obj.posTag = "PUNCT"
            word_obj.entityType = None
            enriched_words.append(word_obj)
            continue

        try:
            analysis = await analyze_word(clean_word, sentence_text)

            word_obj.posTag = analysis.get("pos", "NOUN")
            word_obj.entityType = analysis.get("ent_type", None)
            word_obj.lemma = analysis.get("lemma", None)

        except Exception as e:
            logger.warning("[SpaCy] Word enrich failed | word=%s | err=%s", word_text, e)

            word_obj.posTag = "NOUN"
            word_obj.entityType = None

        enriched_words.append(word_obj)

    return enriched_words


async def _enrich_segments_with_spacy(
    segments: List[dto.SegmentDto],
) -> List[dto.SegmentDto]:
    if not segments:
        return segments

    logger.info("[SpaCy] Start enriching segments | total=%s", len(segments))

    for idx, segment in enumerate(segments, start=1):
        if segment.words and segment.text:
            segment.words = await _enrich_words_with_spacy(
                sentence_text=segment.text,
                words=segment.words,
            )

        if SPACY_PROGRESS_EVERY > 0 and idx % SPACY_PROGRESS_EVERY == 0:
            logger.info("[SpaCy] Progress | processed=%s/%s", idx, len(segments))

    logger.info("[SpaCy] Completed | total=%s", len(segments))

    return segments


async def _enrich_segments_with_nlp(
    segments: List[dto.SegmentDto],
    batch_size: int = NLP_BATCH_SIZE,
    max_concurrency: int = NLP_MAX_CONCURRENCY,
) -> List[dto.SegmentDto]:
    if not segments:
        return segments

    sentence_texts = [segment.text for segment in segments]
    chunks = list(chunk_list(sentence_texts, batch_size))
    all_results = []

    total_chunks = len(chunks)
    total_waves = (total_chunks + max_concurrency - 1) // max_concurrency

    logger.info(
        "[NLP] Start sentence analysis | segments=%s | chunks=%s | batch_size=%s | concurrency=%s",
        len(segments),
        total_chunks,
        batch_size,
        max_concurrency,
    )

    for start in range(0, total_chunks, max_concurrency):
        wave = chunks[start:start + max_concurrency]
        wave_index = start // max_concurrency + 1

        logger.info(
            "[NLP] Processing wave | wave=%s/%s | chunks=%s",
            wave_index,
            total_waves,
            len(wave),
        )

        results = await asyncio.gather(
            *[analyze_sentence_batch(chunk) for chunk in wave],
            return_exceptions=True,
        )

        for chunk, result in zip(wave, results):
            if isinstance(result, Exception):
                logger.exception(
                    "[NLP] Chunk failed | chunk_size=%s | first_sentence=%s",
                    len(chunk),
                    chunk[0][:200] if chunk else "<empty>",
                )
                raise result

            all_results.extend(result)

    for segment, analysis in zip(segments, all_results):
        segment.phoneticUs = analysis.get("phoneticUs", "")
        segment.translationVi = analysis.get("translationVi", "")

    logger.info("[NLP] Completed sentence analysis | segments=%s", len(segments))

    return segments


def _need_nlp(metadata: dto.LessonGenerationAiMetadataDto, is_restart: bool) -> bool:
    if is_restart:
        return True

    if not metadata.transcribed or not metadata.transcribed.segments:
        return False

    first_segment = metadata.transcribed.segments[0]

    return not getattr(first_segment, "phoneticUs", None)


async def handle_lesson_generation_requested(
    event: LessonGenerationRequestedEvent,
) -> None:
    logger.info(
        "[LessonGeneration] Started | %s | lesson_id=%s | source_type=%s | restart=%s",
        _job_tag(event.ai_job_id),
        event.lesson_id,
        event.source_type,
        event.is_restart,
    )

    try:
        if LESSON_GENERATION_START_DELAY > 0:
            await asyncio.sleep(LESSON_GENERATION_START_DELAY)

        if await _is_cancelled(event.ai_job_id):
            return

        metadata = await _load_metadata(event.ai_meta_data_url, event.is_restart)
        metadata_url = event.ai_meta_data_url

        logger.info(
            "[LessonGeneration] Metadata loaded | %s | lesson_id=%s | has_source=%s | has_transcribed=%s",
            _job_tag(event.ai_job_id),
            event.lesson_id,
            metadata.sourceFetched is not None,
            metadata.transcribed is not None,
        )

        # STEP 1: Source audio
        if metadata.sourceFetched is None or event.is_restart:
            logger.info("[LessonGeneration] Step SOURCE_FETCHED started | %s", _job_tag(event.ai_job_id))

            audio_info = await _download_audio_by_source(event)

            if await _is_cancelled(event.ai_job_id):
                return

            audio_url = await cloud_service.upload_file(
                audio_info.file_path,
                public_id=f"lps/lessons/audio/{audio_info.sourceReferenceId}",
                resource_type="video",
            )

            audio_info.audioUrl = audio_url
            metadata.sourceFetched = dto.SourceFetchedDto.model_validate(
                audio_info.model_dump(by_alias=True)
            )

            metadata_url = await _save_metadata(event.lesson_id, metadata)
            is_skip_step1 = False

        else:
            audio_info = dto.AudioInfo.model_validate(metadata.sourceFetched)
            audio_url = audio_info.audioUrl
            audio_info = await _ensure_local_audio_file(audio_info)
            is_skip_step1 = True

        if metadata.sourceFetched and not metadata.sourceFetched.duration:
            duration = await speech_to_text_service.get_audio_duration(audio_info.file_path)
            metadata.sourceFetched.duration = int(duration)
            metadata_url = await _save_metadata(event.lesson_id, metadata)

        if await _is_cancelled(event.ai_job_id):
            return

        await _publish_step(
            ai_job_id=event.ai_job_id,
            step=LessonProcessingStep.SOURCE_FETCHED,
            message="Audio source fetched successfully.",
            audio_url=audio_url,
            source_reference_id=audio_info.sourceReferenceId,
            thumbnail_url=audio_info.thumbnailUrl,
            is_skip=is_skip_step1,
            metadata_url=metadata_url,
            duration_seconds=(
                int(metadata.sourceFetched.duration or 0)
                if metadata.sourceFetched
                else 0
            ),
        )

        logger.info("[LessonGeneration] Step SOURCE_FETCHED completed | %s", _job_tag(event.ai_job_id))

        # STEP 2: Transcribe
        if metadata.transcribed is None or event.is_restart:
            logger.info("[LessonGeneration] Step TRANSCRIBED started | %s", _job_tag(event.ai_job_id))

            raw = await speech_to_text_service.transcribe(audio_info.file_path)
            metadata.transcribed = dto.TranscribedDto.model_validate(raw)

            metadata.transcribed.segments = await _enrich_segments_with_spacy(
                metadata.transcribed.segments
            )

            metadata_url = await _save_metadata(event.lesson_id, metadata)
            is_skip_step2 = False

        else:
            is_skip_step2 = True

        if await _is_cancelled(event.ai_job_id):
            return

        await _publish_step(
            ai_job_id=event.ai_job_id,
            step=LessonProcessingStep.TRANSCRIBED,
            message="Audio transcribed successfully.",
            audio_url=audio_url,
            is_skip=is_skip_step2,
            metadata_url=metadata_url,
        )

        logger.info("[LessonGeneration] Step TRANSCRIBED completed | %s", _job_tag(event.ai_job_id))

        # STEP 3: NLP analysis
        if _need_nlp(metadata, event.is_restart):
            logger.info("[LessonGeneration] Step NLP_ANALYZED started | %s", _job_tag(event.ai_job_id))

            metadata.transcribed.segments = await _enrich_segments_with_nlp(
                metadata.transcribed.segments,
                batch_size=NLP_BATCH_SIZE,
                max_concurrency=NLP_MAX_CONCURRENCY,
            )

            metadata_url = await _save_metadata(event.lesson_id, metadata)
            is_skip_step3 = False

        else:
            is_skip_step3 = True

        await _publish_step(
            ai_job_id=event.ai_job_id,
            step=LessonProcessingStep.NLP_ANALYZED,
            message="Phonetics and translation completed successfully.",
            metadata_url=metadata_url,
            is_skip=is_skip_step3,
        )

        logger.info("[LessonGeneration] Step NLP_ANALYZED completed | %s", _job_tag(event.ai_job_id))

        if await _is_cancelled(event.ai_job_id):
            return

        await _publish_step(
            ai_job_id=event.ai_job_id,
            step=LessonProcessingStep.COMPLETED,
            message="Lesson generation completed successfully.",
            metadata_url=metadata_url,
            is_skip=False,
        )

        logger.info("[LessonGeneration] Completed | %s", _job_tag(event.ai_job_id))

    except Exception as e:
        logger.exception(
            "[LessonGeneration] Failed | %s | err=%s",
            _job_tag(event.ai_job_id),
            e,
        )

        await publish_lesson_processing_step_updated(
            LessonProcessingStepUpdatedEvent(
                aiMessage=f"Lesson generation failed: {e}",
                processingStep=LessonProcessingStep.FAILED,
                aiJobId=event.ai_job_id,
            )
        )

    finally:
        logger.info("[LessonGeneration] Done | %s", _job_tag(event.ai_job_id))