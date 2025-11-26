package com.rin.notificationservice.kafka;

import com.rin.englishlearning.common.constants.KafkaTopics;
import com.rin.englishlearning.common.constants.LessonProcessingStep;
import com.rin.englishlearning.common.constants.LessonStatus;
import com.rin.englishlearning.common.event.LessonProcessingStepUpdatedEvent;
import com.rin.learningcontentservice.model.Lesson;
import com.rin.learningcontentservice.repository.LessonRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class KafkaConsumer {
    LessonRepository lessonRepository;

    @KafkaListener(
            topics = KafkaTopics.LESSON_PROCESSING_STEP_UPDATED_TOPIC,
            containerFactory = "lessonProcessingStepUpdatedKafkaListenerContainerFactory"
    )
    @Transactional
    public void handleLessonProcessingStepUpdatedEvent(LessonProcessingStepUpdatedEvent event) {
        System.out.println("📥 Nhận LessonProcessingStepUpdatedEvent: " + event);
        // Xử lý sự kiện LessonProcessingStepUpdatedEvent ở đây
        Lesson lesson = lessonRepository.findById(event.getLessonId()).orElseThrow();

        if(event.getProcessingStep().equals(LessonProcessingStep.PROCESSING_STARTED)){
            lesson.setProcessingStep(event.getProcessingStep());
            lesson.setAiJobId(event.getAiJobId());
            lesson.setStatus(LessonStatus.PROCESSING);
            lessonRepository.save(lesson);
        }else if(event.getProcessingStep().equals(LessonProcessingStep.SOURCE_FETCHED)){
            lesson.setProcessingStep(event.getProcessingStep());
            lesson.setAudioUrl(event.getAudioUrl());
            lesson.setSourceReferenceId(event.getSourceReferenceId());
            lessonRepository.save(lesson);
        }else{

        }
    }
}