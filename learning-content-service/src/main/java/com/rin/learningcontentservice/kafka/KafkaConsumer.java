package com.rin.learningcontentservice.kafka;

import com.rin.englishlearning.common.constants.KafkaTopics;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class KafkaConsumer {
    @KafkaListener(
            topics = KafkaTopics.LESSON_PROCESSING_STEP_UPDATED_TOPIC,
            containerFactory = "lessonProcessingStepUpdatedKafkaListenerContainerFactory"
    )
    @Transactional
    public void handleLessonProcessingStepUpdatedEvent(Object event) {
        System.out.println("📥 Nhận LessonProcessingStepUpdatedEvent: " + event);
        // Xử lý sự kiện LessonProcessingStepUpdatedEvent ở đây
    }
}