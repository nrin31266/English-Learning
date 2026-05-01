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
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LessonProcessingService {

    private final LessonRepository lessonRepository;
    private final UserLessonProgressRepository userLessonProgressRepository;

    // Ngưỡng điểm phát âm chuẩn chỉ dùng cho Shadowing
    private static final double SHADOWING_PASS_THRESHOLD = 80.0;
// LessonProcessingService.java

    @Transactional // Đảm bảo tính toàn vẹn dữ liệu
    public void updateBatchProgress(ProgressBatchRequest request) {
        for (Long sentenceId : request.getSentenceIds()) {
            // Build lại request lẻ từ data của request batch
            ProgressUpdateRequest singleRequest = ProgressUpdateRequest.builder()
                    .lessonId(request.getLessonId())
                    .sentenceId(sentenceId)
                    .mode(request.getMode())
                    .score(request.getScore())
                    .build();

            // Gọi lại logic update cũ mà ông đã viết
            this.updateProgress(singleRequest);
        }
    }
    @Transactional
    public void updateProgress(ProgressUpdateRequest request) {

        String userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BaseException(BaseErrorCode.UNAUTHORIZED);
        }

        // 1. Lấy lesson
        Lesson lesson = lessonRepository.findById(request.getLessonId())
                .orElseThrow(() -> new BaseException(LearningContentErrorCode.LESSON_NOT_FOUND));

        // 2. Lấy progress (tạo mới nếu chưa có)
        UserLessonProgress progress = userLessonProgressRepository
                .findByUserIdAndLessonIdAndMode(userId, request.getLessonId(), request.getMode())
                .orElseGet(() -> UserLessonProgress.builder()
                        .userId(userId)
                        .lessonId(request.getLessonId())
                        .mode(request.getMode())
                        .lessonVersion(0)
                        .status(ProgressStatus.IN_PROGRESS)
                        .completedSentenceIds(new HashSet<>())
                        .build());

        // 3. Kiểm tra version để dọn dẹp data nếu Admin có sửa bài học
        Integer currentLessonVersion = lesson.getVersion() == null ? 0 : lesson.getVersion();
        if (!currentLessonVersion.equals(progress.getLessonVersion())) {
            recomputeProgress(progress, lesson, currentLessonVersion);
        }

        // 4. Logic "Qua môn" (Passed) linh hoạt theo Mode
        boolean isPassed = false;

        if (request.getMode() == LearningMode.SHADOWING) {
            // Shadowing: Làm tròn điểm trước khi so sánh (VD: 79.6 -> 80) để đồng bộ với Frontend
            isPassed = request.getScore() != null && Math.round(request.getScore()) >= SHADOWING_PASS_THRESHOLD;
        } else if (request.getMode() == LearningMode.DICTATION) {
            // Dictation: Cứ nộp là qua
            isPassed = true;
        }

        // 5. Nếu đạt yêu cầu -> Đánh dấu hoàn thành & lưu DB
        if (isPassed) {

            // Nếu set.add() trả về true nghĩa là câu này chưa từng hoàn thành trước đó
            boolean isNewCompletion = progress.getCompletedSentenceIds().add(request.getSentenceId());

            if (isNewCompletion) {
                // Đếm số câu đang active của bài học
                long activeTotal = lesson.getSentences().stream()
                        .filter(s -> Boolean.TRUE.equals(s.getIsActive()))
                        .count();

                // Đếm số câu hoàn thành nằm trong danh sách active
                long completedActive = progress.getCompletedSentenceIds().stream()
                        .filter(id -> lesson.getSentences().stream()
                                .anyMatch(s -> s.getId().equals(id) && Boolean.TRUE.equals(s.getIsActive())))
                        .count();

                // Kiểm tra xem đã hoàn thành toàn bộ bài chưa
                if (activeTotal > 0 && completedActive >= activeTotal) {
                    progress.setStatus(ProgressStatus.COMPLETED);
                }

                userLessonProgressRepository.save(progress);

                log.info("Lưu tiến độ âm thầm: userId={}, lessonId={}, sentenceId={}, mode={}, score={}",
                        userId, request.getLessonId(), request.getSentenceId(), request.getMode(), request.getScore());
            }
        }
    }

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

        long completedCount = activeSentenceIds.stream()
                .filter(progress.getCompletedSentenceIds()::contains)
                .count();

        int total = activeSentenceIds.size();

        progress.setLessonVersion(lessonVersion);
        progress.setStatus((total > 0 && completedCount >= total) ? ProgressStatus.COMPLETED : ProgressStatus.IN_PROGRESS);

        log.info("Recomputed progress for lesson {}: totalActive={}, completedValid={}",
                lesson.getId(), total, completedCount);
    }


}