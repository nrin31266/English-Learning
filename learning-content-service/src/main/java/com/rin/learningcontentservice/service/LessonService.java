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
import com.rin.learningcontentservice.model.*;
import com.rin.learningcontentservice.repository.LessonRepository;
import com.rin.learningcontentservice.repository.TopicRepository;
import com.rin.learningcontentservice.repository.UserLessonProgressRepository;
import com.rin.learningcontentservice.repository.httpclient.LanguageProcessingClient;
import com.rin.learningcontentservice.repository.specification.LessonSpecifications;
import com.rin.learningcontentservice.utils.SecurityUtils;
import com.rin.learningcontentservice.utils.TextUtils;
import com.rin.learningcontentservice.utils.TimeUtils;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
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
    private final UserLessonProgressRepository userLessonProgressRepository;
    //
    private final ApplicationEventPublisher eventPublisher;


    public LessonSummaryResponse addLesson(AddLessonRequest request) {

        Topic topic = topicRepository.findBySlug(request.getTopicSlug()).orElseThrow(
                () -> new BaseException(LearningContentErrorCode.TOPIC_NOT_FOUND,
                        LearningContentErrorCode.TOPIC_NOT_FOUND.formatMessage(request.getTopicSlug()))
        );

        Lesson lesson = lessonMapper.toLesson(request);

        lesson.setTopic(topic);
        lesson.setProcessingStep(LessonProcessingStep.NONE);
        lesson.setStatus(LessonStatus.DRAFT);
        lesson.setSlug(TextUtils.createSlug(request.getTitle()));

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
    public LessonDetailsResponse getLessonDetails(Long id) {
        Lesson lesson = lessonRepository.findById(id).orElseThrow(
                () -> new BaseException(
                        LearningContentErrorCode.LESSON_NOT_FOUND,
                        LearningContentErrorCode.LESSON_NOT_FOUND.formatMessage(id)
                )
        );

        var ld = lessonMapper.toLessonDetailsResponse(lesson);

        // sort sentences theo orderIndex
        ld.setSentences(
                ld.getSentences().stream()
                        .sorted(Comparator.comparing(LessonSentenceDetailsResponse::getOrderIndex))
                        .toList()
        );

        return ld;
    }
    @Transactional
    public LessonDetailsResponse getLessonDetailsWithoutInActivateSentences(Long id) {
        var ld = getLessonDetails(id);

        ld.setSentences(
                ld.getSentences().stream()
                        .filter(s -> s.getIsActive() != null && s.getIsActive())
                        .toList()
        );

        // attach progress
        attachProgressOverview(ld);

        return ld;
    }

    private void attachProgressOverview(LessonDetailsResponse ld) {
        // 1. Luôn khởi tạo 2 DTO mặc định (rỗng) ngay từ đầu
        UserLessonProgressDto shadowingDto = buildEmptyProgressDto("SHADOWING");
        UserLessonProgressDto dictationDto = buildEmptyProgressDto("DICTATION");

        String userId = SecurityUtils.getCurrentUserId();

        // 2. Chỉ thực hiện truy vấn và ghi đè dữ liệu nếu User đã đăng nhập
        if (userId != null) {
            // Query 1 lần lấy ra tiến độ của tất cả các Mode cho bài học này
            List<UserLessonProgress> progresses = userLessonProgressRepository
                    .findByUserIdAndLessonId(userId, ld.getId());

            // Phân loại và map dữ liệu thực tế từ DB vào DTO
            for (UserLessonProgress p : progresses) {
                if ("SHADOWING".equals(p.getMode().name())) {
                    shadowingDto = mapToProgressDto(p);
                } else if ("DICTATION".equals(p.getMode().name())) {
                    dictationDto = mapToProgressDto(p);
                }
            }
        }

        // 3. Xây dựng Overview DTO
        // Nếu userId == null, nó sẽ dùng 2 DTO rỗng đã khởi tạo ở bước 1
        LessonProgressOverviewDto overviewDto = LessonProgressOverviewDto.builder()
                .shadowing(shadowingDto)
                .dictation(dictationDto)
                .build();

        // 4. Gắn vào response trả về
        ld.setProgressOverview(overviewDto);
    }
    private UserLessonProgressDto mapToProgressDto(UserLessonProgress progress) {
        return UserLessonProgressDto.builder()
                .mode(progress.getMode().name())
                .status(progress.getStatus())
                .completedSentenceIds(progress.getCompletedSentenceIds())
                .totalCompletedSentences(
                        progress.getCompletedSentenceIds() != null ? progress.getCompletedSentenceIds().size() : 0
                )
                .build();
    }

    private UserLessonProgressDto buildEmptyProgressDto(String mode) {
        return UserLessonProgressDto.builder()
                .mode(mode)
                .status(ProgressStatus.IN_PROGRESS)
                .completedSentenceIds(new HashSet<>())
                .totalCompletedSentences(0)
                .build();
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
    private void removeUserProcessIfExists(Lesson lesson) {
        // Đổi sang Repo mới
        userLessonProgressRepository.deleteByLessonId(lesson.getId());
    }
    @Transactional
    public void completeLessonWithMetadata(Long lessonId, String aiMetadataUrl) {

        Lesson lesson = lessonRepository.findById(lessonId).orElseThrow(
                () -> new BaseException(
                        LearningContentErrorCode.LESSON_NOT_FOUND,
                        LearningContentErrorCode.LESSON_NOT_FOUND.formatMessage(lessonId)
                )
        );

        removeUserProcessIfExists(lesson);

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

        // 🔥 XÓA toàn bộ code liên quan đến nlpSentenceMap
        // Không cần mapping nữa vì dữ liệu đã có sẵn trong segment

        for (int idx = 0; idx < segments.size(); idx++) {
            SegmentMetadata seg = segments.get(idx);

            String textRaw = seg.getText() != null ? seg.getText().trim() : "";

            LessonSentence lessonSentence = LessonSentence.builder()
                    .lesson(lesson)
                    .orderIndex(idx)
                    .textRaw(textRaw)
                    .textDisplay(textRaw)
                    .translationVi(seg.getTranslationVi())  // 👈 Lấy trực tiếp từ segment
                    .phoneticUs(seg.getPhoneticUs())        // 👈 Lấy trực tiếp từ segment
                    .audioStartMs(TimeUtils.toMs(seg.getStart()))
                    .audioEndMs(TimeUtils.toMs(seg.getEnd()))
                    .build();

            List<LessonWord> words = buildWords(lessonSentence, seg);

            for (LessonWord w : words) {
                w.setSentence(lessonSentence);
            }
            lessonSentence.setLessonWords(words);
            lessonSentence.setLesson(lesson);

            builtSentences.add(lessonSentence);
        }

        return builtSentences;
    }

    private List<LessonWord> buildWords(
            LessonSentence lessonSentence,
            SegmentMetadata seg
    ) {

        List<LessonWord> lessonWords = new ArrayList<>();

        if (seg.getWords() == null || seg.getWords().isEmpty()) {
            return lessonWords;
        }


        for (int wIdx = 0; wIdx < seg.getWords().size(); wIdx++) {

            WordMetadata w = seg.getWords().get(wIdx);

            String wordText = w.getWord() != null ? w.getWord().trim() : "";
            boolean hasPunctuation = TextUtils.hasPunctuation(wordText);

            LessonWord lessonWord = LessonWord.builder()
                    .sentence(lessonSentence)
                    .orderIndex(wIdx)
                    .wordText(wordText)
                    .posTag(w.getPosTag())
                    .lemma(w.getLemma())
                    .entityType(w.getEntityType())
                    .wordNormalized(TextUtils.normalizeWordLower(TextUtils.normalizeWordSoft(wordText)))
                    .audioStartMs(TimeUtils.toMs(w.getStart()))
                    .audioEndMs(TimeUtils.toMs(w.getEnd()))
                    .hasPunctuation(hasPunctuation)
                    .isClickable(true)
                    .build();

            lessonWords.add(lessonWord);
        }

        return lessonWords;
    }
    private void attachSentencesToLesson(Lesson lesson, List<LessonSentence> builtSentences) {
        // 🔥 Clear collection
        if (lesson.getSentences() == null) {
            lesson.setSentences(new ArrayList<>());
        } else {
            lesson.getSentences().clear();
        }

        // 🔥 Add từng sentence và đảm bảo both sides
        for (LessonSentence sentence : builtSentences) {
            sentence.setLesson(lesson);  // 🔥 CRITICAL: set owning side
            lesson.getSentences().add(sentence);
        }

        // Update total sentences
        lesson.setTotalSentences(builtSentences.size());
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
        // Đổi sang Repo mới
        userLessonProgressRepository.deleteByLessonId(lessonId);
        lessonRepository.delete(lesson);
    }

    @Transactional
    public LessonResponse updateLesson(Long id, EditLessonRequest request) {
        Lesson lesson = lessonRepository.findById(id).orElseThrow(
                () -> new BaseException(LearningContentErrorCode.LESSON_NOT_FOUND,
                        LearningContentErrorCode.LESSON_NOT_FOUND.formatMessage(id))
        );
        lessonMapper.updateLessonFromRequest(request, lesson);
        lesson.setSlug(TextUtils.createSlug(lesson.getSlug()));
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
