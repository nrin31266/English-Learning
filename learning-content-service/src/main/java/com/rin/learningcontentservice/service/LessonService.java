package com.rin.learningcontentservice.service;

import com.rin.englishlearning.common.constants.LessonProcessingStep;
import com.rin.englishlearning.common.constants.LessonStatus;
import com.rin.englishlearning.common.constants.LessonType;
import com.rin.englishlearning.common.exception.BaseException;
import com.rin.learningcontentservice.dto.request.AddLessonRequest;
import com.rin.learningcontentservice.dto.response.LessonMinimalResponse;
import com.rin.learningcontentservice.dto.response.TopicResponse;
import com.rin.learningcontentservice.exception.LearningContentErrorCode;
import com.rin.learningcontentservice.mapper.LessonMapper;
import com.rin.learningcontentservice.model.Lesson;
import com.rin.learningcontentservice.model.Topic;
import com.rin.learningcontentservice.repository.LessonRepository;
import com.rin.learningcontentservice.repository.TopicRepository;
import com.rin.learningcontentservice.utils.TextUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class LessonService {
    private final LessonRepository lessonRepository;
    private final TopicRepository topicRepository;
    private final LessonMapper lessonMapper;
    private final TextUtils textUtils;
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
        }

        return lessonMapper.toLessonMinimalResponse(lesson);
    }


}
