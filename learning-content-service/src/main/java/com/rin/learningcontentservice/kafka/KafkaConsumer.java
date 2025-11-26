package com.rin.learningcontentservice.kafka;

import com.rin.englishlearning.common.constants.KafkaTopics;
import com.rin.englishlearning.common.constants.LessonProcessingStep;
import com.rin.englishlearning.common.constants.LessonStatus;
import com.rin.englishlearning.common.event.LessonProcessingStepNotifyEvent;
import com.rin.englishlearning.common.event.LessonProcessingStepUpdatedEvent;
import com.rin.learningcontentservice.model.Lesson;
import com.rin.learningcontentservice.repository.LessonRepository;
import com.rin.learningcontentservice.service.LessonService;
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
    LessonService lessonService;

    @KafkaListener(
            topics = KafkaTopics.LESSON_PROCESSING_STEP_UPDATED_TOPIC,
            containerFactory = "lessonProcessingStepUpdatedKafkaListenerContainerFactory"
    )
    @Transactional
    public void handleLessonProcessingStepUpdatedEvent(LessonProcessingStepUpdatedEvent event) {

        System.out.println("📥 Nhận LessonProcessingStepUpdatedEvent: " + event);

        Lesson lesson = lessonRepository.findByAiJobId(event.getAiJobId())
                .orElse(null);

        if (lesson == null) {
            System.out.println("⚠️ Không tìm thấy Lesson với aiJobId: " + event.getAiJobId());
            return;
        }

        // ================================
        //     ALWAYS UPDATE DB
        // ================================
        switch (event.getProcessingStep()) {

            case SOURCE_FETCHED -> {
                lesson.setProcessingStep(LessonProcessingStep.SOURCE_FETCHED);
                lesson.setStatus(LessonStatus.PROCESSING);
                lesson.setAiMessage(event.getAiMessage());
                lesson.setAudioUrl(event.getAudioUrl());
                lesson.setSourceReferenceId(event.getSourceReferenceId());
                lesson.setDurationSeconds(event.getDurationSeconds());

                if (event.getThumbnailUrl() != null)
                    lesson.setThumbnailUrl(event.getThumbnailUrl());

                if (event.getAiMetadataUrl() != null)
                    lesson.setAiMetadataUrl(event.getAiMetadataUrl());
            }

            case TRANSCRIBED, NLP_ANALYZED -> {
                lesson.setProcessingStep(event.getProcessingStep());
                lesson.setStatus(LessonStatus.PROCESSING);
                lesson.setAiMessage(event.getAiMessage());

                if (event.getAiMetadataUrl() != null)
                    lesson.setAiMetadataUrl(event.getAiMetadataUrl());
            }

            case COMPLETED -> {
                lessonService.completeLessonWithMetadata(lesson.getId(), event.getAiMetadataUrl());
                return; // Đã lưu trong completeLessonWithMetadata, không cần lưu lại ở dưới
            }

            case FAILED -> {
                lesson.setStatus(LessonStatus.ERROR);
                lesson.setAiMessage(event.getAiMessage());
            }
        }

        // Lưu DB cho mọi trường hợp
        lessonRepository.save(lesson);

        // ================================
        //     ALWAYS NOTIFY UI
        // ================================
        var notify = new LessonProcessingStepNotifyEvent();
        notify.setAiJobId(event.getAiJobId());
        notify.setLessonId(lesson.getId());
        notify.setProcessingStep(event.getProcessingStep());
        notify.setAiMessage(event.getAiMessage());
        notify.setAudioUrl(event.getAudioUrl());
        notify.setSourceReferenceId(event.getSourceReferenceId());
        notify.setThumbnailUrl(event.getThumbnailUrl());
        notify.setDurationSeconds(event.getDurationSeconds());

        kafkaProducer.publishLessonProcessingStepNotify(notify);

        System.out.println("📤 Notify UI đã gửi: " + notify);
    }
}
