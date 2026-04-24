package com.rin.learningcontentservice.service;

import com.rin.englishlearning.common.exception.BaseErrorCode;
import com.rin.englishlearning.common.exception.BaseException;
import com.rin.learningcontentservice.dto.response.ShadowingScoreResponse;
import com.rin.learningcontentservice.exception.LearningContentErrorCode;
import com.rin.learningcontentservice.mapper.LessonShadowingProgressMapper;
import com.rin.learningcontentservice.model.Lesson;
import com.rin.learningcontentservice.model.LessonSentence;
import com.rin.learningcontentservice.model.shadowing.LessonShadowingProgress;
import com.rin.learningcontentservice.model.shadowing.SentenceShadowingAttempt;
import com.rin.learningcontentservice.repository.LessonRepository;
import com.rin.learningcontentservice.repository.LessonShadowingProgressRepository;
import com.rin.learningcontentservice.repository.SentenceShadowingAttemptRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LessonProcessingService {

    private final LessonShadowingProgressRepository lessonShadowingProgressRepository;
    private final LessonRepository lessonRepository;
    private final SentenceShadowingAttemptRepository sentenceShadowingAttemptRepository;
    private static final int SHADOWING_THRESHOLD = 80;
    private final LessonShadowingProgressMapper lessonShadowingProgressMapper;

    @Transactional
    public ShadowingScoreResponse save(
            Double fluencyScore,
            Double weightedAccuracy,
            Long lessonId,
            Long sentenceId
    ) {

        String userId = getCurrentUserId();
        if (userId == null) {
            throw new BaseException(BaseErrorCode.UNAUTHORIZED);
        }

        // 1. Lấy lesson
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new BaseException(LearningContentErrorCode.LESSON_NOT_FOUND));

        // 2. Lấy progress
        LessonShadowingProgress progress =
                lessonShadowingProgressRepository
                        .findByUserIdAndLessonId(userId, lessonId)
                        .orElseThrow(() -> new BaseException(LearningContentErrorCode.LESSON_PROGRESS_NOT_FOUND));

        // 3. Kiểm tra version
        Integer lessonVersion = lesson.getVersion() == null ? 0 : lesson.getVersion();
        if (!lessonVersion.equals(progress.getLessonVersion())) {
            recomputeProgress(progress, lesson, lessonVersion);
        }

        // 4. Tìm attempt cho sentenceId
        SentenceShadowingAttempt attempt = progress.getSentenceAttempts().stream()
                .filter(a -> a.getSentenceId().equals(sentenceId))
                .findFirst()
                .orElse(null);

        // 5. Tạo mới nếu chưa có
        if (attempt == null) {
            attempt = SentenceShadowingAttempt.builder()
                    .userId(userId)
                    .lessonId(lessonId)
                    .sentenceId(sentenceId)
                    .lessonShadowingProgress(progress)
                    .completed(false)
                    .build();
            progress.getSentenceAttempts().add(attempt);
        }

        // ❌ Nếu đã 100% thì bỏ luôn
        if (attempt.getBestScore() != null && attempt.getBestScore() >= 100.0) {
            log.info("Already 100%, ignoring request for sentenceId={}", sentenceId);
            return ShadowingScoreResponse.builder()
                    .lessonCompleted(progress.getCompleted())
                    .attemptCompleted(attempt.getCompleted())
                    .attemptId(attempt.getId())
                    .build();
        }

        // Kiểm tra có phải điểm tốt hơn không
        boolean isBetterScore = attempt.getBestScore() == null || weightedAccuracy > attempt.getBestScore();

        if (isBetterScore) {


            // ✅ Update best score
            attempt.setBestScore(weightedAccuracy);
            attempt.setBestFluency(fluencyScore);

            // ✅ Check completed (nếu đạt threshold)
            boolean isCompleted = (int) Math.round(weightedAccuracy) >= SHADOWING_THRESHOLD;
            if (isCompleted) {
                attempt.setCompleted(true);
            }

            sentenceShadowingAttemptRepository.save(attempt);

            log.info("Improved score → saved. userId={}, lessonId={}, sentenceId={}, score={}",
                    userId, lessonId, sentenceId, weightedAccuracy);

        } else {
            log.info("Score not improved → ignored. userId={}, lessonId={}, sentenceId={}, score={}, bestScore={}",
                    userId, lessonId, sentenceId, weightedAccuracy, attempt.getBestScore());
        }

        // Tính lại tổng số câu đã completed
        long completedCount = progress.getSentenceAttempts().stream()
                .filter(SentenceShadowingAttempt::getCompleted)
                .count();

        progress.setCompletedSentences((int) completedCount);
        progress.setCompleted(progress.getTotalSentences() > 0 && completedCount >= progress.getTotalSentences());

        // Lưu progress
        progress = lessonShadowingProgressRepository.save(progress);

        return ShadowingScoreResponse.builder()
                .lessonCompleted(progress.getCompleted())
                .attemptCompleted(attempt.getCompleted())
                .attemptId(attempt.getId())
                .build();
    }

    private void recomputeProgress(
            LessonShadowingProgress progress,
            Lesson lesson,
            Integer lessonVersion
    ) {
        // 1. Lấy ALL sentence IDs từ lesson (dùng để cleanup)
        Set<Long> allLessonSentenceIds = lesson.getSentences().stream()
                .map(LessonSentence::getId)
                .collect(Collectors.toSet());

        // 2. Lấy ACTIVE sentence IDs (business rule)
        Set<Long> activeSentenceIds = lesson.getSentences().stream()
                .filter(s -> Boolean.TRUE.equals(s.getIsActive()))
                .map(LessonSentence::getId)
                .collect(Collectors.toSet());

        // 3. Lấy COMPLETED sentence IDs từ attempts (source of truth)
        Set<Long> completedSentenceIds = progress.getSentenceAttempts().stream()
                .filter(SentenceShadowingAttempt::getCompleted)
                .map(SentenceShadowingAttempt::getSentenceId)
                .collect(Collectors.toSet());

        // 4. Remove stale attempts (câu không còn trong lesson)
        progress.getSentenceAttempts().removeIf(attempt ->
                !allLessonSentenceIds.contains(attempt.getSentenceId())
        );

        // 5. Recompute completedCount: ACTIVE ⋂ COMPLETED
        long completedCount = activeSentenceIds.stream()
                .filter(completedSentenceIds::contains)
                .count();

        int total = activeSentenceIds.size();

        // 6. Update progress
        progress.setTotalSentences(total);
        progress.setCompletedSentences((int) completedCount);
        progress.setLessonVersion(lessonVersion);
        progress.setCompleted(total > 0 && completedCount >= total);

        log.info("Recomputed progress for lesson {}: total={}, completed={}, attemptsSize={}",
                lesson.getId(), total, completedCount, progress.getSentenceAttempts().size());
    }

    private String getCurrentUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof Jwt jwt) {
            return jwt.getSubject();
        }

        return null;
    }
}