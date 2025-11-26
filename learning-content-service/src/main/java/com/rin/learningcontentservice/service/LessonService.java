package com.rin.learningcontentservice.service;

import com.rin.englishlearning.common.constants.LessonProcessingStep;
import com.rin.englishlearning.common.constants.LessonStatus;
import com.rin.englishlearning.common.constants.LessonType;
import com.rin.englishlearning.common.event.LessonGenerationRequestedEvent;
import com.rin.englishlearning.common.exception.BaseException;
import com.rin.learningcontentservice.dto.request.AddLessonRequest;
import com.rin.learningcontentservice.dto.request.LessonFilterRequest;
import com.rin.learningcontentservice.dto.response.*;
import com.rin.learningcontentservice.exception.LearningContentErrorCode;
import com.rin.learningcontentservice.kafka.KafkaProducer;
import com.rin.learningcontentservice.mapper.LessonMapper;
import com.rin.learningcontentservice.model.Lesson;
import com.rin.learningcontentservice.model.Topic;
import com.rin.learningcontentservice.repository.LessonRepository;
import com.rin.learningcontentservice.repository.TopicRepository;
import com.rin.learningcontentservice.repository.httpclient.LanguageProcessingClient;
import com.rin.learningcontentservice.repository.specification.LessonSpecifications;
import com.rin.learningcontentservice.utils.TextUtils;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

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



}
