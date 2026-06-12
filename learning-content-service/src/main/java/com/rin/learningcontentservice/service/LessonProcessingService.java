package com.rin.learningcontentservice.service;

import com.rin.englishlearning.common.event.GamificationRewardEvent;
import com.rin.englishlearning.common.exception.BaseErrorCode;
import com.rin.englishlearning.common.exception.BaseException;
import com.rin.learningcontentservice.dto.request.ProgressBatchRequest;
import com.rin.learningcontentservice.dto.request.ProgressUpdateRequest;
import com.rin.learningcontentservice.exception.LearningContentErrorCode;
import com.rin.learningcontentservice.kafka.KafkaProducer;
import com.rin.learningcontentservice.model.*;
import com.rin.learningcontentservice.repository.LessonRepository;
import com.rin.learningcontentservice.repository.UserLessonProgressRepository;
import com.rin.learningcontentservice.utils.SecurityUtils;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LessonProcessingService {

    private final LessonRepository lessonRepository;
    private final UserLessonProgressRepository userLessonProgressRepository;
    private final KafkaProducer kafkaProducer;

    /**
     * Ngưỡng điểm yêu cầu để vượt qua chế độ học Shadowing.
     */
    @Value("${app.learning.shadowing-threshold:80.0}")
    private double shadowingPassThreshold;

    @Transactional
    public void updateBatchProgress(ProgressBatchRequest request) {
        for (Long sentenceId : request.getSentenceIds()) {
            ProgressUpdateRequest singleRequest = ProgressUpdateRequest.builder()
                    .lessonId(request.getLessonId())
                    .sentenceId(sentenceId)
                    .mode(request.getMode())
                    .score(request.getScore())
                    .build();
            this.updateProgress(singleRequest);
        }
    }

    @Transactional
    public void updateProgress(ProgressUpdateRequest request) {
        String userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BaseException(BaseErrorCode.UNAUTHORIZED);
        }

        Lesson lesson = lessonRepository.findById(request.getLessonId())
                .orElseThrow(() -> new BaseException(LearningContentErrorCode.LESSON_NOT_FOUND));

        UserLessonProgress progress = userLessonProgressRepository
                .findByUserIdAndLessonIdAndMode(userId, request.getLessonId(), request.getMode())
                .orElseGet(() -> UserLessonProgress.builder()
                        .userId(userId)
                        .lessonId(request.getLessonId())
                        .mode(request.getMode())
                        .lessonVersion(0)
                        .status(ProgressStatus.IN_PROGRESS)
                        .completedSentenceIds(new HashSet<>())
                        .highestScores(new HashMap<>())
                        .build());

        Integer currentLessonVersion = lesson.getVersion() == null ? 0 : lesson.getVersion();
        if (!currentLessonVersion.equals(progress.getLessonVersion())) {
            recomputeProgress(progress, lesson, currentLessonVersion);
        }

        if (progress.getHighestScores() == null) {
            progress.setHighestScores(new HashMap<>());
        }

        double currentScore = request.getScore() != null ? request.getScore() : 0.0;
        double previousHighScore = progress.getHighestScores().getOrDefault(request.getSentenceId(), 0.0);

        // Đánh giá hiệu suất: Chỉ xử lý Gamification Event nếu có sự gia tăng điểm số thực tế
        if (currentScore > previousHighScore) {
            double deltaScore = currentScore - previousHighScore;
            progress.getHighestScores().put(request.getSentenceId(), currentScore);

            // Trích xuất metadata phục vụ Gamification Service
            double multiplier = extractMultiplier(lesson.getLanguageLevel().name());
            String source = request.getMode().name();


             GamificationRewardEvent event = GamificationRewardEvent.builder()
                     .userId(userId)
                     .deltaScore(deltaScore)
                     .multiplier(multiplier)
                     .source(source)
                     .build();
            kafkaProducer.publishGamificationRewardEvent(event);

            log.info("Gamification Event Published: userId={}, deltaScore={}, multiplier={}, source={}",
                    userId, deltaScore, multiplier, source);
        }

        // Đánh giá tiêu chí hoàn thành học phần
        boolean isPassed = false;
        if (request.getMode() == LearningMode.SHADOWING) {
            isPassed = Math.round(currentScore) >= shadowingPassThreshold;
        } else if (request.getMode() == LearningMode.DICTATION) {
            isPassed = true;
        }

        if (isPassed) {
            boolean isNewCompletion = progress.getCompletedSentenceIds().add(request.getSentenceId());

            if (isNewCompletion) {
                long activeTotal = lesson.getSentences().stream()
                        .filter(s -> Boolean.TRUE.equals(s.getIsActive()))
                        .count();

                long completedActive = progress.getCompletedSentenceIds().stream()
                        .filter(id -> lesson.getSentences().stream()
                                .anyMatch(s -> s.getId().equals(id) && Boolean.TRUE.equals(s.getIsActive())))
                        .count();

                if (activeTotal > 0 && completedActive >= activeTotal) {
                    progress.setStatus(ProgressStatus.COMPLETED);
                }
            }
        }

        userLessonProgressRepository.save(progress);
    }

    /**
     * Đồng bộ lại tiến độ học tập dựa trên cấu trúc mới nhất của Lesson (Xử lý khi Admin cập nhật bài học).
     */
    private void recomputeProgress(UserLessonProgress progress, Lesson lesson, Integer lessonVersion) {
        Set<Long> allLessonSentenceIds = lesson.getSentences().stream()
                .map(LessonSentence::getId)
                .collect(Collectors.toSet());

        Set<Long> activeSentenceIds = lesson.getSentences().stream()
                .filter(s -> Boolean.TRUE.equals(s.getIsActive()))
                .map(LessonSentence::getId)
                .collect(Collectors.toSet());

        if (progress.getCompletedSentenceIds() != null) {
            progress.getCompletedSentenceIds().retainAll(allLessonSentenceIds);
        } else {
            progress.setCompletedSentenceIds(new HashSet<>());
        }

        if (progress.getHighestScores() != null) {
            progress.getHighestScores().keySet().retainAll(allLessonSentenceIds);
        }

        long completedCount = activeSentenceIds.stream()
                .filter(progress.getCompletedSentenceIds()::contains)
                .count();

        progress.setLessonVersion(lessonVersion);
        progress.setStatus((!activeSentenceIds.isEmpty() && completedCount >= activeSentenceIds.size())
                ? ProgressStatus.COMPLETED : ProgressStatus.IN_PROGRESS);
    }


    private double extractMultiplier(String languageLevel) {
        if (languageLevel == null || languageLevel.trim().isEmpty()) {
            return 1.0;
        }
        return switch (languageLevel.toUpperCase()) {
            case "A1", "EASY" -> 1.0;
            case "A2" -> 1.5;
            case "B1", "MEDIUM" -> 2.0;
            case "B2" -> 2.5;
            case "C1", "HARD" -> 3.0;
            case "C2", "EXPERT" -> 3.5;
            default -> 1.0;
        };
    }
}