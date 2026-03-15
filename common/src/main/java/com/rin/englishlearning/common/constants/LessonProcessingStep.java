package com.rin.englishlearning.common.constants;

import lombok.Getter;

@Getter
public enum LessonProcessingStep {
    NONE(0),
    PROCESSING_STARTED(1),
    SOURCE_FETCHED(2),        // downloaded file / youtube content fetched
    TRANSCRIBED(3),           // speech-to-text completed
    NLP_ANALYZED(4),          // NLP
    COMPLETED(5),
    FAILED(999);

    private final int order;

    LessonProcessingStep(int order){
        this.order = order;
    }

}
