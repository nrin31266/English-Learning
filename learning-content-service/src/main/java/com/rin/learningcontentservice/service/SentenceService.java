package com.rin.learningcontentservice.service;

import com.rin.englishlearning.common.exception.BaseException;
import com.rin.learningcontentservice.dto.request.SplitSentenceRequest;
import com.rin.learningcontentservice.dto.response.LessonSentenceDetailsResponse;
import com.rin.learningcontentservice.exception.LearningContentErrorCode;
import com.rin.learningcontentservice.mapper.SentenceMapper;
import com.rin.learningcontentservice.model.Lesson;
import com.rin.learningcontentservice.model.LessonSentence;
import com.rin.learningcontentservice.model.LessonWord;
import com.rin.learningcontentservice.repository.LessonRepository;
import com.rin.learningcontentservice.repository.LessonSentenceRepository;
import com.rin.learningcontentservice.repository.LessonWordRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.Iterator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SentenceService {
    private final LessonSentenceRepository lessonSentenceRepository;
    private final LessonRepository lessonRepository;
    private final SentenceMapper lessonSentenceMapper;
    private final LessonWordRepository lessonWordRepository;

    public void markSentenceActiveOrInactive(Long sentenceId, Boolean active) {
        LessonSentence sentence = lessonSentenceRepository.findById(sentenceId)
                .orElseThrow(() -> new BaseException(LearningContentErrorCode.SENTENCE_NOT_FOUND,
                        LearningContentErrorCode.SENTENCE_NOT_FOUND.formatMessage(sentenceId)));
        sentence.setIsActive(active);
        lessonSentenceRepository.save(sentence);
    }

    @Transactional
    public List<LessonSentenceDetailsResponse> splitSentence(Long sentenceId, SplitSentenceRequest request) {

        LessonSentence sentence = lessonSentenceRepository.findById(sentenceId)
                .orElseThrow(() -> new RuntimeException("Sentence not found"));

        LessonWord splitAfterWord = sentence.getLessonWords().stream()
                .filter(w -> w.getId().equals(request.getSplitAfterWordId()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Word not found"));

        // Shift orderIndex sentence phía sau
        List<LessonSentence> sentencesAfter =
                lessonSentenceRepository.findByLessonIdAndOrderIndexGreaterThan(
                        sentence.getLesson().getId(),
                        sentence.getOrderIndex());

        sentencesAfter.forEach(s -> s.setOrderIndex(s.getOrderIndex() + 1));
        // Tìm word đầu tiên của câu 2 trước khi move
        LessonWord firstWordOfSentence2 = sentence.getLessonWords().stream()
                .filter(w -> w.getOrderIndex() > splitAfterWord.getOrderIndex())
                .min(Comparator.comparing(LessonWord::getOrderIndex))
                .orElseThrow();


        // 👉 Tạo sentence2 (rỗng)
        LessonSentence sentence2 = LessonSentence.builder()
                .lesson(sentence.getLesson())
                .orderIndex(sentence.getOrderIndex() + 1)
                .textRaw(sentence.getTextRaw())
                .textDisplay(request.getSentence2().getTextDisplay().trim())
                .translationVi(request.getSentence2().getTranslationVi().trim())
                .phoneticUk(request.getSentence2().getPhoneticUk().trim())
                .phoneticUs(request.getSentence2().getPhoneticUs().trim())
                .audioStartMs(firstWordOfSentence2.getAudioStartMs())
                .audioEndMs(sentence.getAudioEndMs())
                .isActive(true)
                .lessonWords(new ArrayList<>())
                .build();

        LessonSentence savedSentence2 = lessonSentenceRepository.save(sentence2);

        List<LessonWord> wordsToMove = sentence.getLessonWords().stream()
                .filter(w -> w.getOrderIndex() > splitAfterWord.getOrderIndex())
                .sorted(Comparator.comparing(LessonWord::getOrderIndex))
                .toList();

        sentence.getLessonWords().removeAll(wordsToMove);

        int newIndex = 0;
        for (LessonWord w : wordsToMove) {
            w.setSentence(savedSentence2);
            w.setOrderIndex(newIndex++);
            savedSentence2.getLessonWords().add(w);
        }
        // Recalculate startCharIndex/endCharIndex cho words câu 2
        int offset = firstWordOfSentence2.getStartCharIndex();
        savedSentence2.getLessonWords().forEach(w -> {
            w.setStartCharIndex(w.getStartCharIndex() - offset);
            w.setEndCharIndex(w.getEndCharIndex() - offset);
        });

        // Update sentence1
        sentence.setTextDisplay(request.getSentence1().getTextDisplay().trim());
        sentence.setTranslationVi(request.getSentence1().getTranslationVi().trim());
        sentence.setPhoneticUk(request.getSentence1().getPhoneticUk().trim());
        sentence.setPhoneticUs(request.getSentence1().getPhoneticUs().trim());
        sentence.setAudioEndMs(splitAfterWord.getAudioEndMs());

        // Save
        lessonSentenceRepository.saveAll(sentencesAfter);
        lessonSentenceRepository.save(sentence);

        Lesson lesson = sentence.getLesson();
        lesson.setTotalSentences((lesson.getTotalSentences() != null ? lesson.getTotalSentences() : 0) + 1);
        lessonRepository.save(lesson);
        lessonSentenceRepository.flush();

        return List.of(
                lessonSentenceMapper.toDetailsResponse(sentence),
                lessonSentenceMapper.toDetailsResponse(savedSentence2)
        );
    }

}
