package com.rin.learningcontentservice.service;

import com.rin.englishlearning.common.constants.LessonProcessingStep;
import com.rin.englishlearning.common.constants.LessonStatus;
import com.rin.englishlearning.common.constants.LessonType;
import com.rin.englishlearning.common.event.LessonGenerationRequestedEvent;
import com.rin.englishlearning.common.exception.BaseException;
import com.rin.learningcontentservice.dto.request.AddLessonRequest;
import com.rin.learningcontentservice.dto.request.LessonFilterRequest;
import com.rin.learningcontentservice.dto.response.LessonMinimalResponse;
import com.rin.learningcontentservice.dto.response.LessonResponse;
import com.rin.learningcontentservice.dto.response.TopicResponse;
import com.rin.learningcontentservice.exception.LearningContentErrorCode;
import com.rin.learningcontentservice.kafka.KafkaProducer;
import com.rin.learningcontentservice.mapper.LessonMapper;
import com.rin.learningcontentservice.model.Lesson;
import com.rin.learningcontentservice.model.Topic;
import com.rin.learningcontentservice.repository.LessonRepository;
import com.rin.learningcontentservice.repository.TopicRepository;
import com.rin.learningcontentservice.repository.specification.LessonSpecifications;
import com.rin.learningcontentservice.utils.TextUtils;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;



@Service
@RequiredArgsConstructor
@Slf4j
public class LessonService {
    private final LessonRepository lessonRepository;
    private final TopicRepository topicRepository;
    private final LessonMapper lessonMapper;
    private final TextUtils textUtils;
    private final KafkaProducer kafkaProducer;
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
        lessonRepository.save(lesson);

        if(lesson.getLessonType().equals(LessonType.AI_ASSISTED)){
            // Push to message queue for processing
            log.info("Lesson {} is AI_ASSISTED, pushing to processing queue", lesson.getId());
            var event  = LessonGenerationRequestedEvent.builder()
                    .lessonId(lesson.getId())
                    .sourceType(lesson.getSourceType())
                    .sourceUrl(lesson.getSourceUrl())
                    .build();
            kafkaProducer.publishLessonGenerationRequested(event);
        }

        return lessonMapper.toLessonMinimalResponse(lesson);
    }
    // Re try
    public LessonMinimalResponse retryLessonGeneration(Long lessonId) {
        Lesson lesson = lessonRepository.findById(lessonId).orElseThrow(
                () -> new BaseException(LearningContentErrorCode.LESSON_NOT_FOUND,
                        LearningContentErrorCode.LESSON_NOT_FOUND.formatMessage(lessonId))
        );
        if(!lesson.getLessonType().equals(LessonType.AI_ASSISTED)){
            throw new BaseException(LearningContentErrorCode.LESSON_NOT_AI_ASSISTED,
                    LearningContentErrorCode.LESSON_NOT_AI_ASSISTED.formatMessage(lessonId));
        }
        // Reset processing step
        lesson.setProcessingStep(LessonProcessingStep.NONE);
        lesson.setStatus(LessonStatus.DRAFT);
        lessonRepository.save(lesson);

        // Push to message queue for processing
        log.info("Retrying lesson generation for Lesson {}", lesson.getId());
        var event  = LessonGenerationRequestedEvent.builder()
                .lessonId(lesson.getId())
                .sourceType(lesson.getSourceType())
                .sourceUrl(lesson.getSourceUrl())
                .audioUrl(lesson.getAudioUrl())
                .sourceReferenceId(lesson.getSourceReferenceId())
                .build();
        kafkaProducer.publishLessonGenerationRequested(event);

        return lessonMapper.toLessonMinimalResponse(lesson);
    }

    @Transactional
    public Page<LessonResponse> getAllLessons(LessonFilterRequest filter, Pageable pageable) {
        Page<Lesson> page = lessonRepository.findAll(
                LessonSpecifications.filter(filter),
                pageable
        );

        return page.map(lessonMapper::toLessonResponse);
    }



}
