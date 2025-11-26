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

        Lesson lesson = lessonRepository.findByAiJobId(event.getAiJobId())
                .orElse(null);

        if (lesson == null) {
            System.out.println("⚠️ Không tìm thấy Lesson với aiJobId: " + event.getAiJobId());
            return;
        }

        // --- CASE 1: SKIP (không update DB, chỉ notify UI) ---
        if (Boolean.TRUE.equals(event.getIsSkip())) {
            publishNotify(event, lesson.getId());
            return;
        }

        // --- CASE 2: NORMAL PROCESSING ---
        switch (event.getProcessingStep()) {

            case SOURCE_FETCHED -> {
                lesson.setProcessingStep(LessonProcessingStep.SOURCE_FETCHED);
                lesson.setStatus(LessonStatus.PROCESSING);
                lesson.setAiMessage(event.getAiMessage());
                lesson.setAudioUrl(event.getAudioUrl());
                lesson.setSourceReferenceId(event.getSourceReferenceId());

                if (event.getThumbnailUrl() != null)
                    lesson.setThumbnailUrl(event.getThumbnailUrl());

                if (event.getAiMetadataUrl() != null)
                    lesson.setAiMetadataUrl(event.getAiMetadataUrl());

                lessonRepository.save(lesson);
            }

            case TRANSCRIBED, NLP_ANALYZED -> {
                lesson.setProcessingStep(event.getProcessingStep());
                lesson.setStatus(LessonStatus.PROCESSING);
                lesson.setAiMessage(event.getAiMessage());

                if (event.getAiMetadataUrl() != null)
                    lesson.setAiMetadataUrl(event.getAiMetadataUrl());

                lessonRepository.save(lesson);
            }

            case COMPLETED -> {
                lesson.setProcessingStep(LessonProcessingStep.COMPLETED);
                lesson.setStatus(LessonStatus.READY);
                lesson.setAiMessage(event.getAiMessage());

                if (event.getAiMetadataUrl() != null)
                    lesson.setAiMetadataUrl(event.getAiMetadataUrl());

                lessonRepository.save(lesson);
            }

            case FAILED -> {
                lesson.setStatus(LessonStatus.ERROR);
                lesson.setAiMessage(event.getAiMessage());
                lessonRepository.save(lesson);
            }
        }

        // --- ALWAYS NOTIFY UI ---
        publishNotify(event, lesson.getId());
    }

    /**
     * ALWAYS publish notify event, skip or non-skip
     */
    private void publishNotify(LessonProcessingStepUpdatedEvent event, Long lessonId) {

        var notify = new LessonProcessingStepNotifyEvent();
        notify.setAiJobId(event.getAiJobId());
        notify.setLessonId(lessonId);
        notify.setProcessingStep(event.getProcessingStep());
        notify.setAiMessage(event.getAiMessage());
        notify.setAudioUrl(event.getAudioUrl());
        notify.setSourceReferenceId(event.getSourceReferenceId());
        notify.setThumbnailUrl(event.getThumbnailUrl());

        kafkaProducer.publishLessonProcessingStepNotify(notify);
    }
}
