package com.rin.englishlearning.common.constants;

public enum LessonProcessingStep {
    NONE,

    FETCH_SOURCE,           // download file / youtube content
    TRANSCRIBE,             // speech-to-text
    NLP_ANALYSIS,           // detect language, CEFR, etc
    POST_PROCESSING,        // cleanup, align timing

    COMPLETED,
    FAILED
}
