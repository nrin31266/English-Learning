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
from src.llm.lesson_prompts import build_lesson_metadata_prompt
from src.llm.llm_service import generate_json
from src.s3_storage import cloud_service
from src.services import ai_job_service, media_service, speech_to_text_service
from src.services.file_service import fetch_json_from_url, file_exists
from src.services.shadowing.phonemizer_service import get_ipa
from src.services.spaCy_service import analyze_word
from src.utils.text_utils import clean_for_spacy

logger = logging.getLogger(__name__)

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
    title: str | None = None,
    description: str | None = None,
    language_level: str | None = None,
    source_language: str | None = None,
    source_license_type: str | None = None,
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
            title=title,
            description=description,
            languageLevel=language_level,
            sourceLanguage=source_language,
            sourceLicenseType=source_license_type,
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


def _default_source_license(event: LessonGenerationRequestedEvent) -> str:
    if event.source_license_type:
        return event.source_license_type
    if event.source_type == LessonSourceType.youtube:
        return "CREATIVE_COMMONS"
    if event.source_type == LessonSourceType.audio_file:
        return "OWNED_CONTENT"
    return "UNKNOWN"


def _clean_optional(value: str | None) -> str | None:
    if value is None:
        return None
    value = str(value).strip()
    return value or None


def _apply_requested_or_source_metadata(
    metadata: dto.LessonGenerationAiMetadataDto,
    event: LessonGenerationRequestedEvent,
) -> None:
    source = metadata.sourceFetched

    if event.source_type == LessonSourceType.youtube:
        metadata.title = _clean_optional(source.sourceTitle if source else None) or metadata.title
        metadata.description = _clean_optional(source.sourceDescription if source else None) or metadata.description
        metadata.sourceLicenseType = _default_source_license(event)
        return

    metadata.title = _clean_optional(event.title) or metadata.title
    metadata.description = _clean_optional(event.description) or metadata.description
    metadata.sourceLicenseType = _default_source_license(event)


async def _enrich_segments_with_lesson_ai(
    segments: List[dto.SegmentDto],
    metadata: dto.LessonGenerationAiMetadataDto,
    event: LessonGenerationRequestedEvent,
) -> List[dto.SegmentDto]:
    if not segments:
        return segments

    sentence_texts = [segment.text for segment in segments]

    logger.info("[NLP] Start lesson AI enrichment | segments=%s", len(segments))

    source = metadata.sourceFetched
    prompt = build_lesson_metadata_prompt(
        source_type=event.source_type.value,
        source_title=source.sourceTitle if source else None,
        existing_title=metadata.title,
        existing_description=metadata.description,
        source_license_type=event.source_license_type,
        language_hint=None,
        sentences=sentence_texts,
    )

    result = await generate_json(prompt)

    if not isinstance(result, dict):
        raise ValueError("Lesson metadata response must be a JSON object")

    sentence_results = result.get("sentences")
    if not isinstance(sentence_results, list) or len(sentence_results) != len(segments):
        raise ValueError("Lesson metadata sentence count mismatch")

    if event.source_type == LessonSourceType.audio_file:
        metadata.title = _clean_optional(metadata.title) or _clean_optional(result.get("title")) or "Generated lesson"
        metadata.description = _clean_optional(metadata.description) or _clean_optional(result.get("description")) or ""
    else:
        _apply_requested_or_source_metadata(metadata, event)

    metadata.languageLevel = str(result.get("languageLevel") or metadata.languageLevel or "B1").strip().upper()
    metadata.sourceLanguage = str(result.get("sourceLanguage") or metadata.sourceLanguage or "unknown").strip()
    metadata.sourceLicenseType = str(
        event.source_license_type
        or result.get("sourceLicenseType")
        or metadata.sourceLicenseType
        or _default_source_license(event)
    ).strip().upper()

    if metadata.languageLevel not in {"A1", "A2", "B1", "B2", "C1", "C2"}:
        metadata.languageLevel = "B1"

    if metadata.sourceLicenseType not in {
        "STANDARD_YOUTUBE",
        "CREATIVE_COMMONS",
        "OWNED_CONTENT",
        "PERMISSION_GRANTED",
        "UNKNOWN",
    }:
        metadata.sourceLicenseType = _default_source_license(event)

    for segment, analysis in zip(segments, sentence_results):
        segment.translationVi = analysis.get("translationVi", "")

    logger.info("[NLP] Completed lesson AI enrichment | segments=%s", len(segments))

    return segments


def _enrich_segments_with_ipa(segments: List[dto.SegmentDto]) -> List[dto.SegmentDto]:
    for segment in segments:
        if segment.text and not segment.phoneticUs:
            segment.phoneticUs = str(
                get_ipa(
                    segment.text,
                    keep_stress=True,
                    normalize=True,
                    remove_punctuation=True,
                    normalize_text=True,
                )
                or ""
            )
    return segments


def _need_nlp(
    metadata: dto.LessonGenerationAiMetadataDto,
    event: LessonGenerationRequestedEvent,
    is_restart: bool,
) -> bool:
    if is_restart:
        return True

    if not metadata.transcribed or not metadata.transcribed.segments:
        return False

    first_segment = metadata.transcribed.segments[0]

    if not getattr(first_segment, "translationVi", None):
        return True

    if not metadata.languageLevel or not metadata.sourceLanguage:
        return True

    if event.source_type == LessonSourceType.audio_file and (not metadata.title or not metadata.description):
        return True

    return False


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
            _apply_requested_or_source_metadata(metadata, event)

            metadata_url = await _save_metadata(event.lesson_id, metadata)
            is_skip_step1 = False

        else:
            audio_info = dto.AudioInfo.model_validate(metadata.sourceFetched)
            audio_url = audio_info.audioUrl
            audio_info = await _ensure_local_audio_file(audio_info)
            _apply_requested_or_source_metadata(metadata, event)
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
            title=metadata.title,
            description=metadata.description,
            source_license_type=metadata.sourceLicenseType,
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
            metadata.transcribed.segments = _enrich_segments_with_ipa(
                metadata.transcribed.segments
            )

            metadata_url = await _save_metadata(event.lesson_id, metadata)
            is_skip_step2 = False

        else:
            metadata.transcribed.segments = _enrich_segments_with_ipa(
                metadata.transcribed.segments
            )
            metadata_url = await _save_metadata(event.lesson_id, metadata)
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
        if _need_nlp(metadata, event, event.is_restart):
            logger.info("[LessonGeneration] Step NLP_ANALYZED started | %s", _job_tag(event.ai_job_id))

            metadata.transcribed.segments = await _enrich_segments_with_lesson_ai(
                metadata.transcribed.segments,
                metadata,
                event,
            )
            metadata.transcribed.segments = _enrich_segments_with_ipa(
                metadata.transcribed.segments
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
            title=metadata.title,
            description=metadata.description,
            language_level=metadata.languageLevel,
            source_language=metadata.sourceLanguage,
            source_license_type=metadata.sourceLicenseType,
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
            title=metadata.title,
            description=metadata.description,
            language_level=metadata.languageLevel,
            source_language=metadata.sourceLanguage,
            source_license_type=metadata.sourceLicenseType,
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
