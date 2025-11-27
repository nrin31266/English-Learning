package com.rin.learningcontentservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rin.englishlearning.common.constants.LessonProcessingStep;
import com.rin.englishlearning.common.constants.LessonStatus;
import com.rin.englishlearning.common.constants.LessonType;
import com.rin.englishlearning.common.event.LessonGenerationRequestedEvent;
import com.rin.englishlearning.common.event.LessonProcessingStepNotifyEvent;
import com.rin.englishlearning.common.exception.BaseException;
import com.rin.learningcontentservice.dto.metadata.AiMetadataDto;
import com.rin.learningcontentservice.dto.metadata.SentenceMetadata;
import com.rin.learningcontentservice.dto.request.AddLessonRequest;
import com.rin.learningcontentservice.dto.request.EditLessonRequest;
import com.rin.learningcontentservice.dto.request.LessonFilterRequest;
import com.rin.learningcontentservice.dto.response.*;
import com.rin.learningcontentservice.exception.LearningContentErrorCode;
import com.rin.learningcontentservice.kafka.KafkaProducer;
import com.rin.learningcontentservice.mapper.LessonMapper;
import com.rin.learningcontentservice.model.Lesson;
import com.rin.learningcontentservice.model.LessonSentence;
import com.rin.learningcontentservice.model.LessonWord;
import com.rin.learningcontentservice.model.Topic;
import com.rin.learningcontentservice.repository.LessonRepository;
import com.rin.learningcontentservice.repository.TopicRepository;
import com.rin.learningcontentservice.repository.httpclient.LanguageProcessingClient;
import com.rin.learningcontentservice.repository.specification.LessonSpecifications;
import com.rin.learningcontentservice.utils.TextUtils;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.net.URL;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;


@Service
@RequiredArgsConstructor
@Slf4j
public class LessonService {
    private final LessonRepository lessonRepository;
    private final TopicRepository topicRepository;
    private final LessonMapper lessonMapper;
    private final TextUtils textUtils;
    private final KafkaProducer kafkaProducer;
    private final LanguageProcessingClient languageProcessingClient;
    private final RedisTemplate<String, Object> redisTemplate;
    //
    private ApplicationEventPublisher eventPublisher;


    public LessonMinimalResponse addLesson(AddLessonRequest request) {

        Topic topic = topicRepository.findBySlug(request.getTopicSlug()).orElseThrow(
                () -> new BaseException(LearningContentErrorCode.TOPIC_NOT_FOUND,
                        LearningContentErrorCode.TOPIC_NOT_FOUND.formatMessage(request.getTopicSlug()))
        );
        String lessonSlug = textUtils.toSlug(request.getTitle());
        if(lessonRepository.findBySlug(lessonSlug).isPresent()) {
            throw new BaseException(LearningContentErrorCode.LESSON_WITH_NAME_EXISTS,
                    LearningContentErrorCode.LESSON_WITH_NAME_EXISTS.formatMessage(request.getTitle()));
        }
        Lesson lesson = lessonMapper.toLesson(request);
        lesson.setTopic(topic);
        lesson.setProcessingStep(LessonProcessingStep.NONE);
        lesson.setStatus(LessonStatus.DRAFT);
        lesson.setSlug(lessonSlug);

        // If traditional, save and return
        if(request.getLessonType().equals(LessonType.TRADITIONAL)){
            lessonRepository.save(lesson);
            return lessonMapper.toLessonMinimalResponse(lesson);
        }

        createAiJob(lesson);

        // Push to message queue for processing
        log.info("Lesson {} is AI_ASSISTED, pushing to processing queue", lesson.getId());
        var event  = LessonGenerationRequestedEvent.builder()
                .sourceType(lesson.getSourceType())
                .sourceUrl(lesson.getSourceUrl())
                .aiJobId(lesson.getAiJobId())
                .aiMetadataUrl(null)
                .lessonId(lesson.getId())
                .build();
        kafkaProducer.publishLessonGenerationRequested(event);

        return lessonMapper.toLessonMinimalResponse(lesson);
    }
    // Re try
    public LessonMinimalResponse retryLessonGeneration(Long lessonId, Boolean isRestart) {
        Lesson lesson = lessonRepository.findById(lessonId).orElseThrow(
                () -> new BaseException(LearningContentErrorCode.LESSON_NOT_FOUND,
                        LearningContentErrorCode.LESSON_NOT_FOUND.formatMessage(lessonId))
        );
        if(!lesson.getLessonType().equals(LessonType.AI_ASSISTED)){
            throw new BaseException(LearningContentErrorCode.LESSON_NOT_AI_ASSISTED,
                    LearningContentErrorCode.LESSON_NOT_AI_ASSISTED.formatMessage(lessonId));
        }
        createAiJob(lesson);


        // Push to message queue for processing
        log.info("Retrying lesson generation for Lesson {}", lesson.getId());
        var event  = LessonGenerationRequestedEvent.builder()
                .sourceType(lesson.getSourceType())
                .sourceUrl(lesson.getSourceUrl())
                .aiJobId(lesson.getAiJobId())
                .aiMetadataUrl(lesson.getAiMetadataUrl())
                .lessonId(lesson.getId())
                .isRestart(isRestart)
                .build();
        kafkaProducer.publishLessonGenerationRequested(event);

        return lessonMapper.toLessonMinimalResponse(lesson);
    }

    private void createAiJob(Lesson lesson) {
        try {
            AIJobResponse aiJobResponse = languageProcessingClient.createAIJob().getResult();
            lesson.setAiJobId(aiJobResponse.getId());
            lesson.setAiMessage("AI job created with ID: " + aiJobResponse.getId());
            lesson.setProcessingStep(LessonProcessingStep.PROCESSING_STARTED);
            lesson.setStatus(LessonStatus.PROCESSING);
            lessonRepository.save(lesson);
        }catch (BaseException e){
            log.error("Failed to create AI job for lesson {}: {}", lesson.getId(), e.getMessage());
            throw new BaseException(LearningContentErrorCode.AI_JOB_CREATION_FAILED,
                    LearningContentErrorCode.AI_JOB_CREATION_FAILED.formatMessage(e.getMessage()));
        }
    }

    @Transactional
    public Page<LessonResponse> getAllLessons(LessonFilterRequest filter, Pageable pageable) {
        Page<Lesson> page = lessonRepository.findAll(
                LessonSpecifications.filter(filter),
                pageable
        );

        return page.map(lessonMapper::toLessonResponse);
    }

    @Transactional
    public LessonDetailsResponse getLessonDetails(String slug) {
        Lesson lesson = lessonRepository.findBySlug(slug).orElseThrow(
                () -> new BaseException(LearningContentErrorCode.LESSON_NOT_FOUND,
                        LearningContentErrorCode.LESSON_NOT_FOUND.formatMessage(slug))
        );
        return lessonMapper.toLessonDetailsResponse(lesson);
    }

    public LessonMinimalResponse cancelAiProcessing(Long lessonId) {
        Lesson lesson = lessonRepository.findById(lessonId).orElseThrow(
                () -> new BaseException(LearningContentErrorCode.LESSON_NOT_FOUND,
                        LearningContentErrorCode.LESSON_NOT_FOUND.formatMessage(lessonId))
        );
        lesson.setStatus(LessonStatus.DRAFT);
        lesson.setPublishedAt(null);
        lesson.setAiMessage("AI processing cancelled.");

        lessonRepository.save(lesson);
        // 30 minutes expiration
        redisTemplate.opsForValue().set(
                "aiJobStatus:" + lesson.getAiJobId(), "CANCELLED",
                30 * 60, TimeUnit.SECONDS
        );
        return lessonMapper.toLessonMinimalResponse(lesson);
    }

    @Transactional
    public void completeLessonWithMetadata(Long lessonId, String aiMetadataUrl) {
        Lesson lesson = lessonRepository.findById(lessonId).orElseThrow(
                () -> new BaseException(LearningContentErrorCode.LESSON_NOT_FOUND,
                        LearningContentErrorCode.LESSON_NOT_FOUND.formatMessage(lessonId))
        );

        AiMetadataDto metadata = fetchMetadataFromUrl(aiMetadataUrl);
        if (metadata == null) {
            throw new BaseException(
                    LearningContentErrorCode.AI_JOB_CREATION_FAILED,
                    "AI metadata is null for lesson " + lessonId
            );
        }

        // ───────────────────────────────────────────
        // 1. Cập nhật thông tin Lesson từ sourceFetched
        if (metadata.getSourceFetched() != null) {
            var sf = metadata.getSourceFetched();

            if (sf.getDuration() != null) {
                lesson.setDurationSeconds(sf.getDuration().intValue());
            }

            if (sf.getAudioUrl() != null) {
                lesson.setAudioUrl(sf.getAudioUrl());
            }

            if (sf.getSourceReferenceId() != null) {
                lesson.setSourceReferenceId(sf.getSourceReferenceId());
            }

            if (sf.getThumbnailUrl() != null) {
                lesson.setThumbnailUrl(sf.getThumbnailUrl());
            }
        }

        lesson.setAiMetadataUrl(aiMetadataUrl);

        // ───────────────────────────────────────────
        // 2. Xây sentences & words từ transcribed + nlpAnalyzed
        List<LessonSentence> builtSentences = new ArrayList<>();

        if (metadata.getTranscribed() == null ||
                metadata.getTranscribed().getSegments() == null ||
                metadata.getTranscribed().getSegments().isEmpty()) {

            log.warn("No segments found in metadata for lesson {}", lessonId);
        } else {
            var segments = metadata.getTranscribed().getSegments();

            // Map NLP sentences theo orderIndex để join với segment
            Map<Integer, SentenceMetadata> nlpSentenceMap = new HashMap<>();
            if (metadata.getNlpAnalyzed() != null &&
                    metadata.getNlpAnalyzed().getSentences() != null) {
                for (SentenceMetadata s : metadata.getNlpAnalyzed().getSentences()) {
                    nlpSentenceMap.put(s.getOrderIndex(), s);
                }
            }

            for (int idx = 0; idx < segments.size(); idx++) {
                var seg = segments.get(idx);
                var nlpSentence = nlpSentenceMap.get(idx); // join theo orderIndex = index segment

                String textRaw = seg.getText() != null ? seg.getText().trim() : "";

                LessonSentence lessonSentence = LessonSentence.builder()
                        .lesson(lesson)
                        .orderIndex(idx)
                        .textRaw(textRaw)
                        .textDisplay(textRaw) // Sau này nếu muốn chuẩn hoá thì sửa ở đây
                        .translationVi(nlpSentence != null ? nlpSentence.getTranslationVi() : null)
                        .phoneticUk(nlpSentence != null ? nlpSentence.getPhoneticUk() : null)
                        .phoneticUs(nlpSentence != null ? nlpSentence.getPhoneticUs() : null)
                        .audioStartMs(seg.getStart() != null ? (int) Math.round(seg.getStart() * 1000) : null)
                        .audioEndMs(seg.getEnd() != null ? (int) Math.round(seg.getEnd() * 1000) : null)
                        .build();

                // ───────────────────────────────────
                // Build LessonWord cho từng segment.words
                List<LessonWord> lessonWords = new ArrayList<>();
                if (seg.getWords() != null && !seg.getWords().isEmpty()) {
                    int charCursor = 0;
                    String baseText = textRaw;

                    for (int wIdx = 0; wIdx < seg.getWords().size(); wIdx++) {
                        var w = seg.getWords().get(wIdx);
                        String wordText = w.getWord() != null ? w.getWord() : "";

                        // Tìm vị trí word trong câu để set start/end_char_index
                        int startChar = -1;
                        int endChar = -1;
                        if (!wordText.isEmpty()) {
                            startChar = baseText.indexOf(wordText, charCursor);
                            if (startChar >= 0) {
                                endChar = startChar + wordText.length();
                                charCursor = endChar;
                            }
                        }

                        boolean isPunct = textUtils.hasPunctuation(wordText);
                        String normalizedLower = textUtils.normalizeWordLower(wordText);
                        String slug = normalizedLower != null && !normalizedLower.isEmpty()
                                ? textUtils.toSlug(normalizedLower)
                                : null;

                        LessonWord lessonWord = LessonWord.builder()
                                .sentence(lessonSentence)
                                .orderIndex(wIdx)
                                .wordText(wordText)
                                .wordLower(normalizedLower)
                                .wordNormalized(normalizedLower)
                                .wordSlug(slug)
                                .startCharIndex(startChar >= 0 ? startChar : null)
                                .endCharIndex(endChar >= 0 ? endChar : null)
                                .audioStartMs(w.getStart() != null ? (int) Math.round(w.getStart() * 1000) : null)
                                .audioEndMs(w.getEnd() != null ? (int) Math.round(w.getEnd() * 1000) : null)
                                .isPunctuation(isPunct)
                                .isClickable(true)
                                .build();

                        lessonWords.add(lessonWord);
                    }
                }

                lessonSentence.setLessonWords(lessonWords);
                builtSentences.add(lessonSentence);
            }
        }

        // ───────────────────────────────────────────
        // 2b. Gắn sentences vào lesson theo kiểu orphanRemoval-safe
        if (!builtSentences.isEmpty()) {
            List<LessonSentence> target = lesson.getSentences();
            if (target == null) {
                target = new ArrayList<>();
                lesson.setSentences(target);
            } else {
                // orphanRemoval = true → clear trên chính collection hiện tại
                target.clear();
            }

            for (LessonSentence s : builtSentences) {
                s.setLesson(lesson); // đảm bảo owning side
                target.add(s);
            }

            lesson.setTotalSentences(target.size());
        } else {
            // không có câu nào → clear luôn nếu đang có
            if (lesson.getSentences() != null) {
                lesson.getSentences().clear();
            }
            lesson.setTotalSentences(0);
        }

        // ───────────────────────────────────────────
        // 3. Cập nhật trạng thái Lesson
        lesson.setProcessingStep(LessonProcessingStep.COMPLETED);
        lesson.setStatus(LessonStatus.READY);
        lesson.setAiMessage("Lesson generation completed successfully from AI metadata.");

        lessonRepository.save(lesson);

        //Push notification to UI
//        kafkaProducer.publishLessonProcessingStepNotify(
//                LessonProcessingStepNotifyEvent.builder()
//                        .lessonId(lesson.getId())
//                        .processingStep(LessonProcessingStep.COMPLETED)
//                        .aiMessage("Lesson generation completed successfully.")
//                        .build()
//        );
        eventPublisher.publishEvent(
                LessonProcessingStepNotifyEvent.builder()
                        .lessonId(lesson.getId())
                        .processingStep(LessonProcessingStep.COMPLETED)
                        .aiMessage("Lesson generation completed successfully.")
                        .build()
        );
    }


    private AiMetadataDto fetchMetadataFromUrl(String url) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(new URL(url), AiMetadataDto.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch metadata file", e);
        }
    }


    @Transactional
    public void deleteLesson(Long lessonId) {
        Lesson lesson = lessonRepository.findById(lessonId).orElseThrow(
                () -> new BaseException(LearningContentErrorCode.LESSON_NOT_FOUND,
                        LearningContentErrorCode.LESSON_NOT_FOUND.formatMessage(lessonId))
        );
        lessonRepository.delete(lesson);
    }

    @Transactional
    public LessonResponse updateLesson(Long id, EditLessonRequest request) {
        Lesson lesson = lessonRepository.findById(id).orElseThrow(
                () -> new BaseException(LearningContentErrorCode.LESSON_NOT_FOUND,
                        LearningContentErrorCode.LESSON_NOT_FOUND.formatMessage(id))
        );
        lessonMapper.updateLessonFromRequest(request, lesson);
        return lessonMapper.toLessonResponse(lesson);
    }

    public void publishOrUnpublishLesson(Long lessonId, Boolean publish) {
        Lesson lesson = lessonRepository.findById(lessonId).orElseThrow(
                () -> new BaseException(LearningContentErrorCode.LESSON_NOT_FOUND,
                        LearningContentErrorCode.LESSON_NOT_FOUND.formatMessage(lessonId))
        );
        if (publish) {
            lesson.setPublishedAt(Timestamp.valueOf(LocalDateTime.now()));
        } else {
            lesson.setPublishedAt(null);
        }
        lessonRepository.save(lesson);
    }

}
