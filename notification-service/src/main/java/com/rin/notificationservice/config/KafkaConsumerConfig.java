package com.rin.notificationservice.config;

import com.rin.englishlearning.common.event.LessonProcessingStepNotifyEvent;
import com.rin.englishlearning.common.event.LessonProcessingStepUpdatedEvent;
import com.rin.englishlearning.common.event.VocabSubTopicProgressEvent;
import com.rin.englishlearning.common.event.VocabSubTopicReadyEvent;
import com.rin.englishlearning.common.event.VocabSubtopicsGeneratedEvent;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.support.serializer.JsonDeserializer;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class KafkaConsumerConfig {
    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;
    @Value("${spring.kafka.consumer.group-id}")
    private String groupId;
    private Map<String, Object> baseProps() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "*");
        return props;
    }

    @Bean
    public ConsumerFactory<String, LessonProcessingStepNotifyEvent> lessonProcessingStepNotifyEventConsumerFactory() {
        Map<String, Object> props = baseProps();
        return new DefaultKafkaConsumerFactory<>(
                props,
                new StringDeserializer(),
                new JsonDeserializer<>(LessonProcessingStepNotifyEvent.class)
        );
    }
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, LessonProcessingStepNotifyEvent> lessonProcessingStepNotifyEventConcurrentKafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, LessonProcessingStepNotifyEvent> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(lessonProcessingStepNotifyEventConsumerFactory());
        return factory;
    }

    @Bean
    public ConsumerFactory<String, VocabSubTopicReadyEvent> vocabSubTopicReadyEventConsumerFactory() {
        Map<String, Object> props = baseProps();
        return new DefaultKafkaConsumerFactory<>(
                props,
                new StringDeserializer(),
                new JsonDeserializer<>(VocabSubTopicReadyEvent.class)
        );
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, VocabSubTopicReadyEvent> vocabSubTopicReadyEventContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, VocabSubTopicReadyEvent> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(vocabSubTopicReadyEventConsumerFactory());
        return factory;
    }

    @Bean
    public ConsumerFactory<String, VocabSubtopicsGeneratedEvent> vocabSubtopicsGeneratedEventConsumerFactory() {
        Map<String, Object> props = baseProps();
        return new DefaultKafkaConsumerFactory<>(
                props,
                new StringDeserializer(),
                new JsonDeserializer<>(VocabSubtopicsGeneratedEvent.class)
        );
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, VocabSubtopicsGeneratedEvent> vocabSubtopicsGeneratedEventContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, VocabSubtopicsGeneratedEvent> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(vocabSubtopicsGeneratedEventConsumerFactory());
        return factory;
    }

    @Bean
    public ConsumerFactory<String, VocabSubTopicProgressEvent> vocabSubTopicProgressEventConsumerFactory() {
        Map<String, Object> props = baseProps();
        return new DefaultKafkaConsumerFactory<>(
                props,
                new StringDeserializer(),
                new JsonDeserializer<>(VocabSubTopicProgressEvent.class)
        );
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, VocabSubTopicProgressEvent> vocabSubTopicProgressEventContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, VocabSubTopicProgressEvent> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(vocabSubTopicProgressEventConsumerFactory());
        return factory;
    }
}
