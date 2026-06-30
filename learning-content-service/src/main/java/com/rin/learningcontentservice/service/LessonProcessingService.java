package com.rin.learningcontentservice.service;

import com.rin.englishlearning.common.constants.DifficultyLevel;
import com.rin.englishlearning.common.constants.GamificationTrigger;
import com.rin.englishlearning.common.event.GamificationRewardEvent;
import com.rin.englishlearning.common.exception.BaseErrorCode;
import com.rin.englishlearning.common.exception.BaseException;
import com.rin.englishlearning.common.utils.GamificationUtils;
import com.rin.learningcontentservice.dto.request.ProgressBatchRequest;
import com.rin.learningcontentservice.dto.request.ProgressUpdateRequest;
import com.rin.learningcontentservice.dto.response.ProgressUpdateResponse;
import com.rin.learningcontentservice.dto.response.UserLessonProgressDto;
import com.rin.learningcontentservice.exception.LearningContentErrorCode;
import com.rin.learningcontentservice.kafka.KafkaProducer;
import com.rin.learningcontentservice.model.*;
import com.rin.learningcontentservice.repository.LessonRepository;
import com.rin.learningcontentservice.repository.UserLessonProgressRepository;
import com.rin.learningcontentservice.utils.SecurityUtils;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LessonProcessingService {

    private final LessonRepository lessonRepository;
    private final UserLessonProgressRepository userLessonProgressRepository;
    private final KafkaProducer kafkaProducer;

    /**
     * TỐI ƯU 1: Xử lý Batch chỉ với 1 lần gọi DB (Tránh lỗi N+1 Query)
     */
    @Transactional
    public ProgressUpdateResponse updateBatchProgress(ProgressBatchRequest request) {
        String userId = requireValidUserId();
        Lesson lesson = getLessonOrThrow(request.getLessonId());
        UserLessonProgress progress = getOrCreateProgress(userId, request.getLessonId(), request.getMode(), lesson);

        List<GamificationRewardEvent> pendingEvents = new ArrayList<>();

        // Gom nhóm các Active Sentences để tra cứu O(1)
        Set<Long> activeSentenceIds = lesson.getSentences().stream()
                .filter(s -> Boolean.TRUE.equals(s.getIsActive()))
                .map(LessonSentence::getId)
                .collect(Collectors.toSet());

        // Lặp xử lý trên RAM, không gọi xuống DB
        boolean justCompletedLesson = false;
        for (Long sentenceId : request.getSentenceIds()) {
            justCompletedLesson |= processSingleSentenceLogic(userId, lesson, progress, sentenceId, request.getScore(), request.getMode(), activeSentenceIds, pendingEvents);
        }

        // Lưu DB đúng 1 lần cho cả Batch
        userLessonProgressRepository.save(progress);

        // Bắn toàn bộ sự kiện qua Kafka (An toàn sau khi Commit)
        publishEventsAfterCommit(pendingEvents);
        return buildResponse(progress, justCompletedLesson);
    }

    /**
     * Xử lý câu đơn lẻ
     */
    @Transactional
    public ProgressUpdateResponse updateProgress(ProgressUpdateRequest request) {
        String userId = requireValidUserId();
        Lesson lesson = getLessonOrThrow(request.getLessonId());
        UserLessonProgress progress = getOrCreateProgress(userId, request.getLessonId(), request.getMode(), lesson);

        List<GamificationRewardEvent> pendingEvents = new ArrayList<>();

        Set<Long> activeSentenceIds = lesson.getSentences().stream()
                .filter(s -> Boolean.TRUE.equals(s.getIsActive()))
                .map(LessonSentence::getId)
                .collect(Collectors.toSet());

        boolean justCompletedLesson = processSingleSentenceLogic(userId, lesson, progress, request.getSentenceId(), request.getScore(), request.getMode(), activeSentenceIds, pendingEvents);

        userLessonProgressRepository.save(progress);
        publishEventsAfterCommit(pendingEvents);
        return buildResponse(progress, justCompletedLesson);
    }

    /**
     * TỐI ƯU 2 & 5: Hàm Core chứa logic nghiệp vụ, check ID ngoại lệ và bỏ vòng lặp lồng nhau
     */
    private boolean processSingleSentenceLogic(String userId, Lesson lesson, UserLessonProgress progress,
                                            Long sentenceId, Double rawScore, LearningMode mode,
                                            Set<Long> activeSentenceIds, List<GamificationRewardEvent> pendingEvents) {

        // Check 5: SentenceId phải thuộc Lesson này (Ngăn chặn hack từ Client)
        if (!activeSentenceIds.contains(sentenceId)) {
            log.warn("User {} cố gắng cập nhật sentenceId {} không hợp lệ cho lesson {}", userId, sentenceId, lesson.getId());
            return false; // Bỏ qua câu lỗi, xử lý tiếp câu khác
        }

        double currentScore = rawScore != null ? rawScore : 0.0;
        long now = System.currentTimeMillis();
        ProgressItem item = progress.getProgressItems().get(sentenceId);
        double previousHighScore = item != null && item.getBestScore() != null ? item.getBestScore() : 0.0;

        if (item == null) {
            item = ProgressItem.builder()
                    .bestScore(currentScore)
                    .latestScore(currentScore)
                    .attemptCount(1)
                    .firstCompletedAt(now)
                    .lastPracticedAt(now)
                    .build();
            progress.getProgressItems().put(sentenceId, item);
        } else {
            item.setLatestScore(currentScore);
            item.setAttemptCount((item.getAttemptCount() == null ? 0 : item.getAttemptCount()) + 1);
            item.setLastPracticedAt(now);
            if (currentScore > previousHighScore) item.setBestScore(currentScore);
        }

        // Xử lý tạo Event phần thưởng
        if (currentScore > previousHighScore) {
            double deltaScore = currentScore - previousHighScore;
            DifficultyLevel difficulty = extractDifficulty(lesson);
            GamificationTrigger trigger = mode == LearningMode.DICTATION
                    ? GamificationTrigger.SENTENCE_DICTATION
                    : GamificationTrigger.SENTENCE_SHADOWING;
            double multiplier = GamificationUtils.extractMultiplier(difficulty);

            pendingEvents.add(GamificationRewardEvent.builder()
                    .userId(userId)
                    .deltaScore(deltaScore)

                    .trigger(trigger)
                    .targetId(String.valueOf(sentenceId))
                    .timestamp(System.currentTimeMillis())
                    .difficulty(difficulty)
                    .build());
        }

        int completedCount = (int) activeSentenceIds.stream().filter(progress.getProgressItems()::containsKey).count();
        progress.setCompletedSentenceCount(completedCount);
        progress.setTotalSentenceCount(activeSentenceIds.size());

        boolean justCompletedLesson = progress.getStatus() != ProgressStatus.COMPLETED
                && !activeSentenceIds.isEmpty()
                && completedCount == activeSentenceIds.size();
        if (justCompletedLesson) {
            progress.setStatus(ProgressStatus.COMPLETED);
            progress.setCompletedAt(now);
            progress.setLessonScore(calculateLessonScore(progress, activeSentenceIds));
            pendingEvents.add(buildLessonCompletedEvent(userId, lesson, activeSentenceIds.size()));
        } else if (progress.getStatus() == ProgressStatus.COMPLETED && currentScore > previousHighScore) {
            progress.setLessonScore(calculateLessonScore(progress, activeSentenceIds));
        }
        return justCompletedLesson;
    }

    /**
     * TỐI ƯU 3: Cơ chế chống Dual-Write. Chỉ bắn Kafka KHI VÀ CHỈ KHI Database đã commit thành công.
     */
    private void publishEventsAfterCommit(List<GamificationRewardEvent> events) {
        if (events.isEmpty()) return;

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    events.forEach(event -> {
                        kafkaProducer.publishGamificationRewardEvent(event);
                        log.info("Kafka Event Published after DB Commit: trigger={}", event.getTrigger());
                    });
                }
            });
        } else {
            // Fallback nếu chạy ngoài Transaction
            events.forEach(kafkaProducer::publishGamificationRewardEvent);
        }
    }

    // --- CÁC HÀM TIỆN ÍCH HỖ TRỢ (Giúp code chính đọc như văn xuôi) ---

    private String requireValidUserId() {
        String userId = SecurityUtils.getCurrentUserId();
        if (userId == null) throw new BaseException(BaseErrorCode.UNAUTHORIZED);
        return userId;
    }

    private Lesson getLessonOrThrow(Long lessonId) {
        return lessonRepository.findById(lessonId)
                .orElseThrow(() -> new BaseException(LearningContentErrorCode.LESSON_NOT_FOUND));
    }

    private UserLessonProgress getOrCreateProgress(String userId, Long lessonId, LearningMode mode, Lesson lesson) {
        UserLessonProgress progress = userLessonProgressRepository
                .findByUserIdAndLessonIdAndMode(userId, lessonId, mode)
                .orElseGet(() -> UserLessonProgress.builder()
                        .userId(userId).lessonId(lessonId).mode(mode).lessonVersion(0)
                        .status(ProgressStatus.IN_PROGRESS)
                        .progressItems(new HashMap<>())
                        .build());

        if (progress.getProgressItems() == null) progress.setProgressItems(new HashMap<>());

        Integer currentVersion = lesson.getVersion() == null ? 0 : lesson.getVersion();
        if (!currentVersion.equals(progress.getLessonVersion())) {
            recomputeProgress(progress, lesson, currentVersion);
        }

        return progress;
    }

    private DifficultyLevel extractDifficulty(Lesson lesson) {
        try {
            return lesson.getLanguageLevel() != null
                    ? DifficultyLevel.valueOf(lesson.getLanguageLevel().name())
                    : DifficultyLevel.UNKNOWN;
        } catch (IllegalArgumentException e) {
            return DifficultyLevel.UNKNOWN;
        }
    }

    private GamificationRewardEvent buildLessonCompletedEvent(String userId, Lesson lesson, long totalSentences) {
        DifficultyLevel difficulty = extractDifficulty(lesson);
        return GamificationRewardEvent.builder()
                .userId(userId)
                .deltaScore(totalSentences * 10.0)
                .trigger(GamificationTrigger.LESSON_COMPLETED)
                .targetId(String.valueOf(lesson.getId()))
                .timestamp(System.currentTimeMillis())
                .difficulty(difficulty)
                .build();
    }

    private void recomputeProgress(UserLessonProgress progress, Lesson lesson, Integer lessonVersion) {
        Set<Long> activeSentenceIds = lesson.getSentences().stream()
                .filter(s -> Boolean.TRUE.equals(s.getIsActive()))
                .map(LessonSentence::getId).collect(Collectors.toSet());

        if (progress.getProgressItems() == null) progress.setProgressItems(new HashMap<>());
        progress.getProgressItems().keySet().retainAll(activeSentenceIds);
        int completedCount = (int) activeSentenceIds.stream().filter(progress.getProgressItems()::containsKey).count();
        progress.setLessonVersion(lessonVersion);
        progress.setCompletedSentenceCount(completedCount);
        progress.setTotalSentenceCount(activeSentenceIds.size());
        if (!activeSentenceIds.isEmpty() && completedCount == activeSentenceIds.size()) {
            progress.setStatus(ProgressStatus.COMPLETED);
            if (progress.getCompletedAt() == null) progress.setCompletedAt(System.currentTimeMillis());
            progress.setLessonScore(calculateLessonScore(progress, activeSentenceIds));
        } else {
            progress.setStatus(ProgressStatus.IN_PROGRESS);
            progress.setCompletedAt(null);
            progress.setLessonScore(null);
        }
    }

    private double calculateLessonScore(UserLessonProgress progress, Set<Long> activeSentenceIds) {
        return activeSentenceIds.stream()
                .map(progress.getProgressItems()::get)
                .filter(Objects::nonNull)
                .mapToDouble(item -> item.getBestScore() == null ? 0.0 : item.getBestScore())
                .average().orElse(0.0);
    }

    private ProgressUpdateResponse buildResponse(UserLessonProgress progress, boolean justCompletedLesson) {
        UserLessonProgressDto dto = UserLessonProgressDto.builder()
                .mode(progress.getMode().name()).status(progress.getStatus())
                .progressItems(progress.getProgressItems()).lessonScore(progress.getLessonScore())
                .completedSentenceCount(progress.getCompletedSentenceCount())
                .totalSentenceCount(progress.getTotalSentenceCount()).completedAt(progress.getCompletedAt())
                .build();
        return ProgressUpdateResponse.builder().progress(dto).justCompletedLesson(justCompletedLesson).build();
    }
}
