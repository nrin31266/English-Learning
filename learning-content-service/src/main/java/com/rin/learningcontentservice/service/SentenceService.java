package com.rin.learningcontentservice.service;

import com.rin.englishlearning.common.exception.BaseException;
import com.rin.learningcontentservice.exception.LearningContentErrorCode;
import com.rin.learningcontentservice.model.LessonSentence;
import com.rin.learningcontentservice.repository.LessonSentenceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class SentenceService {
    private final LessonSentenceRepository lessonSentenceRepository;

    public void markSentenceActiveOrInactive(Long sentenceId, Boolean active) {
        LessonSentence sentence = lessonSentenceRepository.findById(sentenceId)
                .orElseThrow(() -> new BaseException(LearningContentErrorCode.SENTENCE_NOT_FOUND,
                        LearningContentErrorCode.SENTENCE_NOT_FOUND.formatMessage(sentenceId)));
        sentence.setIsActive(active);
        lessonSentenceRepository.save(sentence);
        log.info("Sentence with id: {} marked as {}", sentenceId, active ? "active" : "inactive");
    }
}
