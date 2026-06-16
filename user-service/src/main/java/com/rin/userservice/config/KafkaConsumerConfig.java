package com.rin.userservice.config;

import com.rin.englishlearning.common.event.GamificationRewardEvent;
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
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "com.rin.englishlearning.common.event");
        return props;
    }

    private <T> ConsumerFactory<String, T> consumerFactory(Class<T> eventClass) {
        return new DefaultKafkaConsumerFactory<>(
                baseProps(),
                new StringDeserializer(),
                new JsonDeserializer<>(eventClass)
        );
    }

    private <T> ConcurrentKafkaListenerContainerFactory<String, T> containerFactory(Class<T> eventClass) {
        ConcurrentKafkaListenerContainerFactory<String, T> factory =
                new ConcurrentKafkaListenerContainerFactory<>();

        factory.setConsumerFactory(consumerFactory(eventClass));
        return factory;
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, GamificationRewardEvent> gamificationRewardEventContainerFactory() {
        return containerFactory(GamificationRewardEvent.class);
    }

}
