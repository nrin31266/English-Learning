package com.rin.learningcontentservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rin.englishlearning.common.constants.LessonProcessingStep;
import com.rin.englishlearning.common.constants.LessonStatus;
import com.rin.englishlearning.common.constants.LessonType;
import com.rin.englishlearning.common.event.LessonGenerationRequestedEvent;
import com.rin.englishlearning.common.event.LessonProcessingStepNotifyEvent;
import com.rin.englishlearning.common.event.LessonProcessingStepUpdatedEvent;
import com.rin.englishlearning.common.exception.BaseException;
import com.rin.learningcontentservice.dto.metadata.lesson_genaration.*;
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
import com.rin.learningcontentservice.utils.TimeUtils;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URL;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;


@Service
@RequiredArgsConstructor
@Slf4j
public class LessonService {
    private final LessonRepository lessonRepository;
    private final TopicRepository topicRepository;
    private final LessonMapper lessonMapper;
    private final KafkaProducer kafkaProducer;
    private final LanguageProcessingClient languageProcessingClient;
    private final RedisTemplate<String, Object> redisTemplate;
    //
    private final ApplicationEventPublisher eventPublisher;


    public LessonSummaryResponse addLesson(AddLessonRequest request) {

        Topic topic = topicRepository.findBySlug(request.getTopicSlug()).orElseThrow(
                () -> new BaseException(LearningContentErrorCode.TOPIC_NOT_FOUND,
                        LearningContentErrorCode.TOPIC_NOT_FOUND.formatMessage(request.getTopicSlug()))
        );
        String lessonSlug = TextUtils.toSlug(request.getTitle());
        if (lessonRepository.findBySlug(lessonSlug).isPresent()) {
            throw new BaseException(LearningContentErrorCode.LESSON_WITH_NAME_EXISTS,
                    LearningContentErrorCode.LESSON_WITH_NAME_EXISTS.formatMessage(request.getTitle()));
        }
        Lesson lesson = lessonMapper.toLesson(request);
        lesson.setTopic(topic);
        lesson.setProcessingStep(LessonProcessingStep.NONE);
        lesson.setStatus(LessonStatus.DRAFT);
        lesson.setSlug(lessonSlug);

        // If traditional, save and return
        if (request.getLessonType().equals(LessonType.TRADITIONAL)) {
            lessonRepository.save(lesson);
            return lessonMapper.toLessonSummaryResponse(lesson);
        }

        createAiJob(lesson);

        // Push to message queue for processing
        log.info("Lesson {} is AI_ASSISTED, pushing to processing queue", lesson.getId());
        var event = LessonGenerationRequestedEvent.builder()
                .sourceType(lesson.getSourceType())
                .sourceUrl(lesson.getSourceUrl())
                .aiJobId(lesson.getAiJobId())
                .lessonId(lesson.getId())
                .build();
        kafkaProducer.publishLessonGenerationRequested(event);

        return lessonMapper.toLessonSummaryResponse(lesson);
    }

    // Re try
    public LessonSummaryResponse retryLessonGeneration(Long lessonId, Boolean isRestart) {
        Lesson lesson = lessonRepository.findById(lessonId).orElseThrow(
                () -> new BaseException(LearningContentErrorCode.LESSON_NOT_FOUND,
                        LearningContentErrorCode.LESSON_NOT_FOUND.formatMessage(lessonId))
        );
        if (!lesson.getLessonType().equals(LessonType.AI_ASSISTED)) {
            throw new BaseException(LearningContentErrorCode.LESSON_NOT_AI_ASSISTED,
                    LearningContentErrorCode.LESSON_NOT_AI_ASSISTED.formatMessage(lessonId));
        }
        createAiJob(lesson);


        // Push to message queue for processing
        log.info("Retrying lesson generation for Lesson {}", lesson.getId());
        var event = LessonGenerationRequestedEvent.builder()
                .sourceType(lesson.getSourceType())
                .sourceUrl(lesson.getSourceUrl())
                .aiJobId(lesson.getAiJobId())
                .aiMetadataUrl(lesson.getAiMetadataUrl())
                .lessonId(lesson.getId())
                .isRestart(isRestart)
                .build();
        kafkaProducer.publishLessonGenerationRequested(event);

        return lessonMapper.toLessonSummaryResponse(lesson);
    }

    private void createAiJob(Lesson lesson) {
        try {
            AIJobResponse aiJobResponse = languageProcessingClient.createAIJob().getResult();
            lesson.setAiJobId(aiJobResponse.getId());
            lesson.setAiMessage("AI job created with ID: " + aiJobResponse.getId());
            lesson.setProcessingStep(LessonProcessingStep.PROCESSING_STARTED);
            lesson.setStatus(LessonStatus.PROCESSING);
            lessonRepository.save(lesson);
        } catch (BaseException e) {
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
        var ld = lessonMapper.toLessonDetailsResponse(lesson);
        // sort
        ld.setSentences(
                ld.getSentences().stream()
                        .sorted(Comparator.comparing(LessonSentenceDetailsResponse::getOrderIndex))
                        .toList()
        );

        return ld;
    }
    @Transactional
    public LessonDetailsResponse getLessonDetailsWithoutInActivateSentences(String slug) {
        var ld = getLessonDetails(slug);
        ld.setSentences(
                ld.getSentences().stream()
                        .filter(s -> s.getIsActive() != null && s.getIsActive())
                        .toList()
        );
        return ld;
    }

    public LessonSummaryResponse cancelLessonGeneration(Long lessonId) {
        Lesson lesson = lessonRepository.findById(lessonId).orElseThrow(
                () -> new BaseException(LearningContentErrorCode.LESSON_NOT_FOUND,
                        LearningContentErrorCode.LESSON_NOT_FOUND.formatMessage(lessonId))
        );
        // 1. Check state (optional)
        if (lesson.getStatus() != LessonStatus.PROCESSING) {
            throw new BaseException(LearningContentErrorCode.INVALID_STATE,
                    LearningContentErrorCode.INVALID_STATE.formatMessage(lessonId, "PROCESSING"));
        }
        // 2. Set Redis TRƯỚC khi update DB
        redisTemplate.opsForValue().set(
                "aiJobStatus:" + lesson.getAiJobId(),
                "CANCELLED",
                12, TimeUnit.HOURS
        );

        // 3. Update DB sau (aiMessage có thể thêm timestamp)
        lesson.setStatus(LessonStatus.DRAFT);
        lesson.setPublishedAt(null);
        lesson.setAiMessage(String.format(
                "AI processing cancelled by user at %s",
                LocalDateTime.now()
        ));
        lessonRepository.save(lesson);

        // 4. Audit log (optional)
        log.info("Lesson {} cancelled by user, AI job {}", lessonId, lesson.getAiJobId());

        return lessonMapper.toLessonSummaryResponse(lesson);

    }
    @Transactional
    public void completeLessonWithMetadata(Long lessonId, String aiMetadataUrl) {

        Lesson lesson = lessonRepository.findById(lessonId).orElseThrow(
                () -> new BaseException(
                        LearningContentErrorCode.LESSON_NOT_FOUND,
                        LearningContentErrorCode.LESSON_NOT_FOUND.formatMessage(lessonId)
                )
        );

        AiMetadataDto metadata = fetchMetadataFromUrl(aiMetadataUrl);
        if (metadata == null) {
            throw new BaseException(
                    LearningContentErrorCode.AI_JOB_CREATION_FAILED,
                    "AI metadata is null for lesson " + lessonId
            );
        }

        updateLessonFromSourceFetched(lesson, metadata.getSourceFetched());

        List<LessonSentence> sentences = buildSentences(lesson, metadata);

        attachSentencesToLesson(lesson, sentences);

        finalizeLesson(lesson, aiMetadataUrl);

        lessonRepository.save(lesson);

        eventPublisher.publishEvent(
                LessonProcessingStepNotifyEvent.builder()
                        .lessonId(lesson.getId())
                        .processingStep(LessonProcessingStep.COMPLETED)
                        .aiMessage("Lesson generation completed successfully.")
                        .build()
        );
    }



    private void updateLessonFromSourceFetched(Lesson lesson, SourceFetched sf) {

        if (sf == null) {
            return;
        }

        if (sf.getDuration() != null) {
            lesson.setDurationSeconds(Math.toIntExact(sf.getDuration()));
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

    private List<LessonSentence> buildSentences(Lesson lesson, AiMetadataDto metadata) {

        List<LessonSentence> builtSentences = new ArrayList<>();

        if (metadata.getTranscribed() == null ||
                metadata.getTranscribed().getSegments() == null ||
                metadata.getTranscribed().getSegments().isEmpty()) {

            log.warn("No segments found in metadata for lesson {}", lesson.getId());
            return builtSentences;
        }

        List<SegmentMetadata> segments = metadata.getTranscribed().getSegments();

        Map<Integer, SentenceMetadata> nlpSentenceMap = new HashMap<>();
        if (metadata.getNlpAnalyzed() != null &&
                metadata.getNlpAnalyzed().getSentences() != null) {

            for (SentenceMetadata s : metadata.getNlpAnalyzed().getSentences()) {
                nlpSentenceMap.put(s.getOrderIndex(), s);
            }
        }

        for (int idx = 0; idx < segments.size(); idx++) {

            SegmentMetadata seg = segments.get(idx);
            SentenceMetadata nlpSentence = nlpSentenceMap.get(idx);

            String textRaw = seg.getText() != null ? seg.getText().trim() : "";

            LessonSentence lessonSentence = LessonSentence.builder()
                    .lesson(lesson)
                    .orderIndex(idx)
                    .textRaw(textRaw)
                    .textDisplay(textRaw)
                    .translationVi(nlpSentence != null ? nlpSentence.getTranslationVi() : null)
                    .phoneticUk(nlpSentence != null ? nlpSentence.getPhoneticUk() : null)
                    .phoneticUs(nlpSentence != null ? nlpSentence.getPhoneticUs() : null)
                    .audioStartMs(TimeUtils.toMs(seg.getStart()))
                    .audioEndMs(TimeUtils.toMs(seg.getEnd()))
                    .build();

            lessonSentence.setLessonWords(buildWords(lessonSentence, seg, textRaw));

            builtSentences.add(lessonSentence);
        }

        return builtSentences;
    }

    private List<LessonWord> buildWords(
            LessonSentence lessonSentence,
            SegmentMetadata seg,
            String baseText
    ) {

        List<LessonWord> lessonWords = new ArrayList<>();

        if (seg.getWords() == null || seg.getWords().isEmpty()) {
            return lessonWords;
        }

        int charCursor = 0;

        for (int wIdx = 0; wIdx < seg.getWords().size(); wIdx++) {

            WordMetadata w = seg.getWords().get(wIdx);

            String wordText = w.getWord() != null ? w.getWord().trim() : "";

            int startChar = -1;
            int endChar = -1;

            if (!wordText.isEmpty()) {
                startChar = baseText.indexOf(wordText, charCursor);
                if (startChar >= 0) {
                    endChar = startChar + wordText.length();
                    charCursor = endChar;
                }
            }

            boolean isPunct = TextUtils.hasPunctuation(wordText);

            String normalizedLower = TextUtils.normalizeWordLower(wordText);

            String slug = !normalizedLower.isEmpty()
                    ? TextUtils.toSlug(normalizedLower)
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
                    .audioStartMs(TimeUtils.toMs(w.getStart()))
                    .audioEndMs(TimeUtils.toMs(w.getEnd()))
                    .isPunctuation(isPunct)
                    .isClickable(true)
                    .build();

            lessonWords.add(lessonWord);
        }

        return lessonWords;
    }

    private void attachSentencesToLesson(Lesson lesson, List<LessonSentence> builtSentences) {

        List<LessonSentence> target = lesson.getSentences();

        if (target == null) {
            target = new ArrayList<>();
            lesson.setSentences(target);
        } else {
            target.clear();
        }

        if (!builtSentences.isEmpty()) {

            target.addAll(builtSentences);

            lesson.setTotalSentences(target.size());

        } else {

            lesson.setTotalSentences(0);
        }
    }

    private void finalizeLesson(Lesson lesson, String aiMetadataUrl) {

        lesson.setAiMetadataUrl(aiMetadataUrl);

        lesson.setProcessingStep(LessonProcessingStep.COMPLETED);

        lesson.setStatus(LessonStatus.READY);

        lesson.setAiMessage("Lesson generation completed successfully from AI metadata.");
    }




    private AiMetadataDto fetchMetadataFromUrl(String url) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(new URL(url), AiMetadataDto.class);
        } catch (IOException e) {
            throw new BaseException(LearningContentErrorCode.AI_METADATA_FETCH_FAILED,
                    "Failed to fetch metadata from URL: " + url);
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
        if (Boolean.TRUE.equals(publish)) {
            lesson.setPublishedAt(Timestamp.valueOf(LocalDateTime.now()));
        } else {
            lesson.setPublishedAt(null);
        }
        lessonRepository.save(lesson);
    }


    @Transactional
    public void handleLessonProcessingStepUpdated(LessonProcessingStepUpdatedEvent event) {

        Lesson lesson = lessonRepository.findByAiJobId(event.getAiJobId())
                .orElseThrow(() -> new RuntimeException("Lesson not found with aiJobId: " + event.getAiJobId()));

        LessonProcessingStep currentStep = lesson.getProcessingStep();
        LessonProcessingStep incomingStep = event.getProcessingStep();

        // ===== Idempotency check =====
        if (currentStep != null && currentStep.getOrder() >= incomingStep.getOrder()) {
            log.info("⚠️ Skip duplicate/old step. current={}, incoming={}", currentStep, incomingStep);
            return;
        }

        log.info("🔄 Processing step {} for lesson {}", incomingStep, lesson.getId());

        switch (incomingStep) {

            case SOURCE_FETCHED -> updateSourceFetched(lesson, event);

            case TRANSCRIBED, NLP_ANALYZED -> updateProcessingStep(lesson, event);

            case COMPLETED -> {
                completeLessonWithMetadata(lesson.getId(), event.getAiMetadataUrl());
                return;
            }

            case FAILED -> failLesson(lesson, event);

            default -> {
                log.warn("⚠️ Unknown processing step: {}", incomingStep);
                return;
            }
        }

        lessonRepository.save(lesson);

        sendNotifyToUI(event, lesson.getId());

        log.info("✅ Step {} processed for lesson {}", incomingStep, lesson.getId());
    }
    private void updateSourceFetched(Lesson lesson, LessonProcessingStepUpdatedEvent event) {

        lesson.setProcessingStep(LessonProcessingStep.SOURCE_FETCHED);
        lesson.setStatus(LessonStatus.PROCESSING);
        lesson.setAiMessage(event.getAiMessage());
        lesson.setAudioUrl(event.getAudioUrl());
        lesson.setSourceReferenceId(event.getSourceReferenceId());
        lesson.setDurationSeconds(event.getDurationSeconds());

        if (event.getThumbnailUrl() != null) {
            lesson.setThumbnailUrl(event.getThumbnailUrl());
        }

        if (event.getAiMetadataUrl() != null) {
            lesson.setAiMetadataUrl(event.getAiMetadataUrl());
        }
    }
    private void updateProcessingStep(Lesson lesson, LessonProcessingStepUpdatedEvent event) {

        lesson.setProcessingStep(event.getProcessingStep());
        lesson.setStatus(LessonStatus.PROCESSING);
        lesson.setAiMessage(event.getAiMessage());

        if (event.getAiMetadataUrl() != null) {
            lesson.setAiMetadataUrl(event.getAiMetadataUrl());
        }
    }
    private void failLesson(Lesson lesson, LessonProcessingStepUpdatedEvent event) {
        lesson.setProcessingStep(LessonProcessingStep.FAILED);
        lesson.setStatus(LessonStatus.ERROR);
        lesson.setAiMessage(event.getAiMessage());
    }
    private void sendNotifyToUI(LessonProcessingStepUpdatedEvent event, Long lessonId) {

        var notify = new LessonProcessingStepNotifyEvent();

        notify.setAiJobId(event.getAiJobId());
        notify.setLessonId(lessonId);
        notify.setProcessingStep(event.getProcessingStep());
        notify.setAiMessage(event.getAiMessage());
        notify.setAudioUrl(event.getAudioUrl());
        notify.setSourceReferenceId(event.getSourceReferenceId());
        notify.setThumbnailUrl(event.getThumbnailUrl());
        notify.setDurationSeconds(event.getDurationSeconds());

        kafkaProducer.publishLessonProcessingStepNotify(notify);

        log.info("📤 Notify UI: {}", notify);
    }
}
