package com.rin.learningcontentservice.kafka;

import com.rin.englishlearning.common.constants.KafkaTopics;
import com.rin.englishlearning.common.constants.LessonProcessingStep;
import com.rin.englishlearning.common.constants.LessonStatus;
import com.rin.englishlearning.common.event.LessonProcessingStepNotifyEvent;
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
    KafkaProducer kafkaProducer;
    @KafkaListener(
            topics = KafkaTopics.LESSON_PROCESSING_STEP_UPDATED_TOPIC,
            containerFactory = "lessonProcessingStepUpdatedKafkaListenerContainerFactory"
    )
    @Transactional
    public void handleLessonProcessingStepUpdatedEvent(LessonProcessingStepUpdatedEvent event) {
        System.out.println("📥 Nhận LessonProcessingStepUpdatedEvent: " + event);
        // Xử lý sự kiện LessonProcessingStepUpdatedEvent ở đây
        Lesson lesson = lessonRepository.findByAiJobId(event.getAiJobId()).orElse(null);
        if(lesson == null) {
            System.out.println("⚠️ Không tìm thấy Lesson với aiJobId: " + event.getAiJobId());
            return;
        }else if(event.getProcessingStep().equals(LessonProcessingStep.SOURCE_FETCHED)){
            lesson.setProcessingStep(event.getProcessingStep());
            lesson.setAiMessage(event.getAiMessage());
            lesson.setAudioUrl(event.getAudioUrl());
            lesson.setSourceReferenceId(event.getSourceReferenceId());
            if(event.getThumbnailUrl() != null){
                lesson.setThumbnailUrl(event.getThumbnailUrl());
            }
            lessonRepository.save(lesson);
        }else if(event.getProcessingStep().equals(LessonProcessingStep.FAILED)){
            // Khong cap nhap processingStep neu FAILED
            lesson.setStatus(LessonStatus.ERROR);
            lesson.setAiMessage(event.getAiMessage());
            lessonRepository.save(lesson);

        }
        var notifyEvent = new LessonProcessingStepNotifyEvent();
        notifyEvent.setAiJobId(event.getAiJobId());
        notifyEvent.setLessonId(lesson.getId());
        notifyEvent.setProcessingStep(event.getProcessingStep());
        notifyEvent.setAiMessage(event.getAiMessage());
        if(event.getProcessingStep().equals(LessonProcessingStep.SOURCE_FETCHED)){
            notifyEvent.setAudioUrl(event.getAudioUrl());
            notifyEvent.setSourceReferenceId(event.getSourceReferenceId());
            notifyEvent.setThumbnailUrl(event.getThumbnailUrl());
        }
        kafkaProducer.publishLessonProcessingStepNotify(notifyEvent);
        
    }
}