package com.rin.notificationservice.kafka;

import com.rin.englishlearning.common.constants.KafkaTopics;
import com.rin.englishlearning.common.constants.LessonProcessingStep;
import com.rin.englishlearning.common.constants.LessonStatus;
import com.rin.englishlearning.common.event.LessonProcessingStepNotifyEvent;
import com.rin.englishlearning.common.event.LessonProcessingStepUpdatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class KafkaConsumer {
    SimpMessagingTemplate messagingTemplate;

    @KafkaListener(
            topics = KafkaTopics.LESSON_PROCESSING_STEP_NOTIFY_TOPIC,
            containerFactory = "lessonProcessingStepNotifyEventConcurrentKafkaListenerContainerFactory"
    )
    public void handleLessonProcessingStepUpdatedEvent(LessonProcessingStepNotifyEvent event) {
        System.out.println("📥 Nhận LessonProcessingStepUpdatedEvent: " + event);
        // Xử lý sự kiện LessonProcessingStepUpdatedEvent ở đây
        String destination = "/topic/learning-contents/lessons/" + event.getLessonId() + "/processing-step";
        messagingTemplate.convertAndSend(destination, event);
    }
}