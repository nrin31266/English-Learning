package com.rin.dictionaryservice.kafka;

import com.rin.englishlearning.common.constants.KafkaTopics;
import com.rin.englishlearning.common.event.VocabSubTopicReadyEvent;
import com.rin.englishlearning.common.event.VocabSubtopicsGeneratedEvent;
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

    public void sendVocabSubTopicReady(VocabSubTopicReadyEvent event) {
        kafkaTemplate.send(KafkaTopics.VOCAB_SUBTOPIC_READY_TOPIC, event.getSubtopicId(), event);
        log.info("[Kafka] VocabSubTopicReady sent: subtopic={}, topicReady={}", event.getSubtopicId(), event.isTopicReady());
    }

    public void sendVocabSubtopicsGenerated(VocabSubtopicsGeneratedEvent event) {
        kafkaTemplate.send(KafkaTopics.VOCAB_SUBTOPICS_GENERATED_TOPIC, event.getTopicId(), event);
        log.info("[Kafka] VocabSubtopicsGenerated sent: topicId={}, count={}", event.getTopicId(), event.getSubtopicCount());
    }
}
