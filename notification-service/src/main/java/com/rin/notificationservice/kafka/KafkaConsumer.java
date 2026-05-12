package com.rin.notificationservice.kafka;

import com.rin.englishlearning.common.constants.KafkaTopics;
import com.rin.englishlearning.common.constants.LessonProcessingStep;
import com.rin.englishlearning.common.constants.LessonStatus;
import com.rin.englishlearning.common.event.LessonProcessingStepNotifyEvent;
import com.rin.englishlearning.common.event.VocabSubTopicReadyEvent;
import com.rin.englishlearning.common.event.VocabSubtopicsGeneratedEvent;
import com.rin.englishlearning.common.event.LessonProcessingStepUpdatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class KafkaConsumer {
    SimpMessagingTemplate messagingTemplate;

    @KafkaListener(
            topics = KafkaTopics.LESSON_PROCESSING_STEP_NOTIFY_TOPIC,
            containerFactory = "lessonProcessingStepNotifyEventConcurrentKafkaListenerContainerFactory"
    )
    public void handleLessonProcessingStepUpdatedEvent(LessonProcessingStepNotifyEvent event) {
        log.info("Received LessonProcessingStepNotifyEvent: lessonId={}, step={}", event.getLessonId(), event.getProcessingStep());
        String destination = "/topic/learning-contents/lessons/" + event.getLessonId() + "/processing-step";
        messagingTemplate.convertAndSend(destination, event);
    }

    @KafkaListener(
            topics = KafkaTopics.VOCAB_SUBTOPIC_READY_TOPIC,
            containerFactory = "vocabSubTopicReadyEventContainerFactory"
    )
    public void handleVocabSubTopicReady(VocabSubTopicReadyEvent event) {
        log.info("Received VocabSubTopicReadyEvent: subtopic={}, topicReady={}", event.getSubtopicId(), event.isTopicReady());
        messagingTemplate.convertAndSend("/topic/vocab/subtopic-ready", event);
        if (event.isTopicReady()) {
            messagingTemplate.convertAndSend("/topic/vocab/topic-ready/" + event.getTopicId(), event);
        }
    }

    @KafkaListener(
            topics = KafkaTopics.VOCAB_SUBTOPICS_GENERATED_TOPIC,
            containerFactory = "vocabSubtopicsGeneratedEventContainerFactory"
    )
    public void handleVocabSubtopicsGenerated(VocabSubtopicsGeneratedEvent event) {
        log.info("Received VocabSubtopicsGeneratedEvent: topicId={}, count={}", event.getTopicId(), event.getSubtopicCount());
        // Broadcast to a flat topic path (STOMP simple broker does NOT support wildcards like * or +)
        // The topicId is carried in the event payload — Frontend filters by topicId if needed.
        messagingTemplate.convertAndSend("/topic/vocab/subtopics-generated", event);
    }
}