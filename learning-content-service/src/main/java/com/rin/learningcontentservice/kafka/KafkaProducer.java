package com.rin.learningcontentservice.kafka;

import com.rin.englishlearning.common.constants.KafkaTopics;
import com.rin.englishlearning.common.event.LessonGenerationRequestedEvent;
import com.rin.englishlearning.common.event.LessonProcessingStepUpdatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class KafkaProducer {
    KafkaTemplate<String, Object> kafkaTemplate;

    public void publishLessonGenerationRequested(LessonGenerationRequestedEvent event) {
        kafkaTemplate.send(KafkaTopics.LESSON_GENERATION_REQUESTED_TOPIC, event)
                .whenComplete((result, ex) -> {
                    if (ex == null) {
                        log.info("✅ Gửi LessonGenerationRequestedEvent thành công tới topic {}", KafkaTopics.LESSON_GENERATION_REQUESTED_TOPIC);
                    } else {
                        log.error("❌ Lỗi gửi LessonGenerationRequestedEvent: {}", ex.getMessage());
                    }
                });
    }
}
