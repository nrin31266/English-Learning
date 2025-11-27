package com.rin.learningcontentservice.kafka;

import com.rin.englishlearning.common.event.LessonProcessingStepNotifyEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class LessonCompletedKafkaPublisher {

    private final KafkaProducer kafkaProducer;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleLessonCompletedListener(LessonProcessingStepNotifyEvent event) {
        kafkaProducer.publishLessonProcessingStepNotify(event);
    }
}
