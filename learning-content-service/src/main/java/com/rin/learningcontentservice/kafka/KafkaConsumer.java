package com.rin.learningcontentservice.kafka;

import com.rin.englishlearning.common.constants.KafkaTopics;
import com.rin.englishlearning.common.event.LessonProcessingStepUpdatedEvent;
import com.rin.learningcontentservice.service.LessonService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class KafkaConsumer {

    private final LessonService lessonService;

    @KafkaListener(
            topics = KafkaTopics.LESSON_PROCESSING_STEP_UPDATED_TOPIC,
            containerFactory = "lessonProcessingStepUpdatedKafkaListenerContainerFactory"
    )
    public void handleLessonProcessingStepUpdatedEvent(LessonProcessingStepUpdatedEvent event) {

        log.info("📥 Nhận LessonProcessingStepUpdatedEvent: {}", event);
        if (event == null || event.getAiJobId() == null) {
            log.warn("Event hoặc aiJobId bị null");
            return;
        }

        lessonService.handleLessonProcessingStepUpdated(event);
    }
}