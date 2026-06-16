package com.rin.learningcontentservice.service;

import com.rin.englishlearning.common.constants.DifficultyLevel;
import com.rin.englishlearning.common.constants.GamificationTrigger;
import com.rin.englishlearning.common.event.GamificationRewardEvent;
import com.rin.englishlearning.common.exception.BaseErrorCode;
import com.rin.englishlearning.common.exception.BaseException;
import com.rin.englishlearning.common.utils.GamificationUtils;
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

    @Value("${app.learning.shadowing-threshold:80.0}")
    private double shadowingPassThreshold;

    /**
     * TỐI ƯU 1: Xử lý Batch chỉ với 1 lần gọi DB (Tránh lỗi N+1 Query)
     */
    @Transactional
    public void updateBatchProgress(ProgressBatchRequest request) {
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
        for (Long sentenceId : request.getSentenceIds()) {
            processSingleSentenceLogic(userId, lesson, progress, sentenceId, request.getScore(), request.getMode(), activeSentenceIds, pendingEvents);
        }

        // Lưu DB đúng 1 lần cho cả Batch
        userLessonProgressRepository.save(progress);

        // Bắn toàn bộ sự kiện qua Kafka (An toàn sau khi Commit)
        publishEventsAfterCommit(pendingEvents);
    }

    /**
     * Xử lý câu đơn lẻ
     */
    @Transactional
    public void updateProgress(ProgressUpdateRequest request) {
        String userId = requireValidUserId();
        Lesson lesson = getLessonOrThrow(request.getLessonId());
        UserLessonProgress progress = getOrCreateProgress(userId, request.getLessonId(), request.getMode(), lesson);

        List<GamificationRewardEvent> pendingEvents = new ArrayList<>();

        Set<Long> activeSentenceIds = lesson.getSentences().stream()
                .filter(s -> Boolean.TRUE.equals(s.getIsActive()))
                .map(LessonSentence::getId)
                .collect(Collectors.toSet());

        processSingleSentenceLogic(userId, lesson, progress, request.getSentenceId(), request.getScore(), request.getMode(), activeSentenceIds, pendingEvents);

        userLessonProgressRepository.save(progress);
        publishEventsAfterCommit(pendingEvents);
    }

    /**
     * TỐI ƯU 2 & 5: Hàm Core chứa logic nghiệp vụ, check ID ngoại lệ và bỏ vòng lặp lồng nhau
     */
    private void processSingleSentenceLogic(String userId, Lesson lesson, UserLessonProgress progress,
                                            Long sentenceId, Double rawScore, LearningMode mode,
                                            Set<Long> activeSentenceIds, List<GamificationRewardEvent> pendingEvents) {

        // Check 5: SentenceId phải thuộc Lesson này (Ngăn chặn hack từ Client)
        if (!activeSentenceIds.contains(sentenceId)) {
            log.warn("User {} cố gắng cập nhật sentenceId {} không hợp lệ cho lesson {}", userId, sentenceId, lesson.getId());
            return; // Bỏ qua câu lỗi, xử lý tiếp câu khác
        }

        double currentScore = rawScore != null ? rawScore : 0.0;
        double previousHighScore = progress.getHighestScores().getOrDefault(sentenceId, 0.0);

        // Xử lý tạo Event phần thưởng
        if (currentScore > previousHighScore) {
            double deltaScore = currentScore - previousHighScore;
            progress.getHighestScores().put(sentenceId, currentScore);

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

        // TỐI ƯU 4: Chấm điểm
        boolean isPassed = (mode == LearningMode.DICTATION) || (Math.round(currentScore) >= shadowingPassThreshold);

        if (isPassed) {
            boolean isNewCompletion = progress.getCompletedSentenceIds().add(sentenceId);

            if (isNewCompletion && progress.getStatus() != ProgressStatus.COMPLETED) {
                // TỐI ƯU 2: Dùng Set activeSentenceIds đếm trực tiếp, xóa bỏ stream lồng nhau
                long completedActiveCount = progress.getCompletedSentenceIds().stream()
                        .filter(activeSentenceIds::contains)
                        .count();

                if (activeSentenceIds.size() > 0 && completedActiveCount >= activeSentenceIds.size()) {
                    progress.setStatus(ProgressStatus.COMPLETED);

                    // Thêm Event hoàn thành bài học vào danh sách chờ bắn Kafka
                    pendingEvents.add(buildLessonCompletedEvent(userId, lesson, activeSentenceIds.size()));
                }
            }
        }
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
                        .completedSentenceIds(new HashSet<>())
                        .highestScores(new HashMap<>())
                        .build());

        Integer currentVersion = lesson.getVersion() == null ? 0 : lesson.getVersion();
        if (!currentVersion.equals(progress.getLessonVersion())) {
            recomputeProgress(progress, lesson, currentVersion);
        }

        if (progress.getHighestScores() == null) progress.setHighestScores(new HashMap<>());
        if (progress.getCompletedSentenceIds() == null) progress.setCompletedSentenceIds(new HashSet<>());

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
        Set<Long> allLessonSentenceIds = lesson.getSentences().stream()
                .map(LessonSentence::getId).collect(Collectors.toSet());

        Set<Long> activeSentenceIds = lesson.getSentences().stream()
                .filter(s -> Boolean.TRUE.equals(s.getIsActive()))
                .map(LessonSentence::getId).collect(Collectors.toSet());

        if (progress.getCompletedSentenceIds() != null) progress.getCompletedSentenceIds().retainAll(allLessonSentenceIds);
        else progress.setCompletedSentenceIds(new HashSet<>());

        if (progress.getHighestScores() != null) progress.getHighestScores().keySet().retainAll(allLessonSentenceIds);
        else progress.setHighestScores(new HashMap<>());

        long completedCount = activeSentenceIds.stream().filter(progress.getCompletedSentenceIds()::contains).count();
        progress.setLessonVersion(lessonVersion);
        progress.setStatus((!activeSentenceIds.isEmpty() && completedCount >= activeSentenceIds.size())
                ? ProgressStatus.COMPLETED : ProgressStatus.IN_PROGRESS);
    }
}