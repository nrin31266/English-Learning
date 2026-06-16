package com.rin.userservice.messaging;

import com.rin.englishlearning.common.constants.KafkaTopics;
import com.rin.englishlearning.common.event.NotificationPushEvent;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class GamificationEventPublisher {

    KafkaTemplate<String, Object> kafkaTemplate;

    public void sendNotificationPushEvent(NotificationPushEvent event) {
        kafkaTemplate.send(KafkaTopics.NOTIFICATION_PUSH_TOPIC, event);
        log.info("Đã đẩy NotificationPushEvent sang Kafka: userId={}, module={}, actionType={}",
                event.getUserId(), event.getModule(), event.getActionType());
    }
}