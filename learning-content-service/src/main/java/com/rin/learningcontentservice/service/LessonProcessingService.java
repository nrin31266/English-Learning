package com.rin.learningcontentservice.service;

import com.rin.englishlearning.common.exception.BaseErrorCode;
import com.rin.englishlearning.common.exception.BaseException;
import com.rin.learningcontentservice.dto.request.ProgressBatchRequest;
import com.rin.learningcontentservice.dto.request.ProgressUpdateRequest;
import com.rin.learningcontentservice.exception.LearningContentErrorCode;
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

    /**
     * Ngưỡng điểm để vượt qua chế độ Shadowing.
     * Cấu hình thông qua properties/env, giá trị mặc định là 80.0.
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

        // Truy xuất tiến độ hiện tại hoặc khởi tạo bản ghi mới nếu chưa tồn tại
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

        // Đối chiếu và cập nhật lại tiến độ nếu version của bài học đã bị thay đổi bởi Administrator
        Integer currentLessonVersion = lesson.getVersion() == null ? 0 : lesson.getVersion();
        if (!currentLessonVersion.equals(progress.getLessonVersion())) {
            recomputeProgress(progress, lesson, currentLessonVersion);
        }

        // Khởi tạo cấu trúc dữ liệu JSONB nếu rỗng để tránh NullPointerException
        if (progress.getHighestScores() == null) {
            progress.setHighestScores(new HashMap<>());
        }

        double currentScore = request.getScore() != null ? request.getScore() : 0.0;
        double previousHighScore = progress.getHighestScores().getOrDefault(request.getSentenceId(), 0.0);
        double xpToAward = 0.0;

        // Tính toán Delta XP: Chỉ cấp phát XP thưởng khi điểm hiện tại vượt qua kỷ lục đã lưu
        if (currentScore > previousHighScore) {
            xpToAward = currentScore - previousHighScore;
            progress.getHighestScores().put(request.getSentenceId(), currentScore);
        }

        // Kích hoạt tiến trình Gamification qua Kafka nếu có sự gia tăng về điểm kinh nghiệm
        if (xpToAward > 0) {
            // TODO: Triển khai Kafka Publisher gửi message chứa (userId, xpToAward) sang user-service
            log.info("Gamification Event Triggered: userId={}, xpAwarded={}", userId, xpToAward);
        }

        // Đánh giá tiêu chí hoàn thành dựa trên chế độ học (Learning Mode)
        boolean isPassed = false;
        if (request.getMode() == LearningMode.SHADOWING) {
            isPassed = Math.round(currentScore) >= shadowingPassThreshold;
        } else if (request.getMode() == LearningMode.DICTATION) {
            // Chế độ Dictation yêu cầu tính chính xác tuyệt đối, logic validate đã được xử lý tại client-side
            isPassed = true;
        }

        if (isPassed) {
            // Ghi nhận hoàn thành câu. Set.add() trả về true nếu ID chưa tồn tại trong tập hợp
            boolean isNewCompletion = progress.getCompletedSentenceIds().add(request.getSentenceId());

            if (isNewCompletion) {
                long activeTotal = lesson.getSentences().stream()
                        .filter(s -> Boolean.TRUE.equals(s.getIsActive()))
                        .count();

                long completedActive = progress.getCompletedSentenceIds().stream()
                        .filter(id -> lesson.getSentences().stream()
                                .anyMatch(s -> s.getId().equals(id) && Boolean.TRUE.equals(s.getIsActive())))
                        .count();

                // Cập nhật trạng thái tổng thể của bài học nếu hoàn thành toàn bộ nội dung active
                if (activeTotal > 0 && completedActive >= activeTotal) {
                    progress.setStatus(ProgressStatus.COMPLETED);
                }
            }
        }

        // Lưu trữ trạng thái tiến độ, đảm bảo các cập nhật về highestScores và lessonVersion luôn được persist
        userLessonProgressRepository.save(progress);
    }

    /**
     * Tính toán và đồng bộ lại trạng thái tiến độ dựa trên dữ liệu cấu trúc bài học mới nhất.
     */
    private void recomputeProgress(UserLessonProgress progress, Lesson lesson, Integer lessonVersion) {
        Set<Long> allLessonSentenceIds = lesson.getSentences().stream()
                .map(LessonSentence::getId)
                .collect(Collectors.toSet());

        Set<Long> activeSentenceIds = lesson.getSentences().stream()
                .filter(s -> Boolean.TRUE.equals(s.getIsActive()))
                .map(LessonSentence::getId)
                .collect(Collectors.toSet());

        // Loại bỏ các ID câu học đã hoàn thành không còn tồn tại trong bài học
        if (progress.getCompletedSentenceIds() != null) {
            progress.getCompletedSentenceIds().retainAll(allLessonSentenceIds);
        } else {
            progress.setCompletedSentenceIds(new HashSet<>());
        }

        // Đồng bộ dữ liệu JSONB: Xóa kỷ lục điểm của các câu học đã bị gỡ bỏ
        if (progress.getHighestScores() != null) {
            progress.getHighestScores().keySet().retainAll(allLessonSentenceIds);
        }

        long completedCount = activeSentenceIds.stream()
                .filter(progress.getCompletedSentenceIds()::contains)
                .count();

        progress.setLessonVersion(lessonVersion);
        progress.setStatus((activeSentenceIds.size() > 0 && completedCount >= activeSentenceIds.size())
                ? ProgressStatus.COMPLETED : ProgressStatus.IN_PROGRESS);
    }
}