package com.rin.englishlearning.common.constants;

public final class KafkaTopics {
    private KafkaTopics() {
        /* This utility class should not be instantiated */
    }


    public static final String LESSON_GENERATION_REQUESTED_TOPIC = "lesson-generation-requested-v1";
    public static final String LESSON_PROCESSING_STEP_UPDATED_TOPIC = "lesson-processing-step-updated-v1";
    public static final String LESSON_PROCESSING_STEP_NOTIFY_TOPIC = "lesson-processing-step-notify-v1";
    public static final String WORD_ANALYZED_TOPIC= "word-analyzed-v1";
    public static final String WORD_QUEUE_HANDLER_TOPIC= "word-queue-handler-v1";


}
