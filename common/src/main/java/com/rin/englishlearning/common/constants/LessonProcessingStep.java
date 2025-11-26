package com.rin.englishlearning.common.constants;

public enum LessonProcessingStep {
    NONE,
    PROCESSING_STARTED,
    SOURCE_FETCHED,        // downloaded file / youtube content fetched
    TRANSCRIBED,           // speech-to-text completed
    NLP_ANALYZED,          // NLP analysis done (language, CEFR…)
//    POST_PROCESSED,        // alignment and cleanup finished

    COMPLETED,
    FAILED
}
