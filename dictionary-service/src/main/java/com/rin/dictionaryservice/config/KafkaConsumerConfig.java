package com.rin.dictionaryservice.config;

import com.rin.englishlearning.common.event.WordAnalyzedEvent;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
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
    public ConsumerFactory<String, WordAnalyzedEvent> wordAnalyzedEventConsumerFactory() {
        Map<String, Object> props = baseProps();
        return new org.springframework.kafka.core.DefaultKafkaConsumerFactory<>(
                props,
                new StringDeserializer(),
                new JsonDeserializer<>(WordAnalyzedEvent.class)
        );
    }
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, WordAnalyzedEvent> wordAnalyzedEventKafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, WordAnalyzedEvent> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(wordAnalyzedEventConsumerFactory());
        return factory;
    }
//    @Bean
//    public ConsumerFactory<String, LessonProcessingStepUpdatedEvent> lessonProcessingStepUpdatedConsumerFactory() {
//        Map<String, Object> props = baseProps();
//        return new org.springframework.kafka.core.DefaultKafkaConsumerFactory<>(
//                props,
//                new StringDeserializer(),
//                new JsonDeserializer<>(LessonProcessingStepUpdatedEvent.class)
//        );
//    }
//    @Bean
//    public ConcurrentKafkaListenerContainerFactory<String, LessonProcessingStepUpdatedEvent> lessonProcessingStepUpdatedKafkaListenerContainerFactory() {
//        ConcurrentKafkaListenerContainerFactory<String, LessonProcessingStepUpdatedEvent> factory = new ConcurrentKafkaListenerContainerFactory<>();
//        factory.setConsumerFactory(lessonProcessingStepUpdatedConsumerFactory());
//        return factory;
//    }
}
