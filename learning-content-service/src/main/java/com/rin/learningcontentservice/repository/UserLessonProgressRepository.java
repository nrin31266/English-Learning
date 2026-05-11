package com.rin.learningcontentservice.repository;

import com.rin.learningcontentservice.model.LearningMode;
import com.rin.learningcontentservice.model.ProgressStatus;
import com.rin.learningcontentservice.model.UserLessonProgress;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserLessonProgressRepository extends JpaRepository<UserLessonProgress,Long> {
    Optional<UserLessonProgress> findByUserIdAndLessonIdAndMode(String userId, Long lessonId, LearningMode mode);
    List<UserLessonProgress> findByUserIdAndLessonId(String userId, Long lessonId);
    @Modifying
    void deleteByLessonId(Long lessonId);

    List<UserLessonProgress> findByUserIdAndLessonIdIn(String userId, List<Long> lessonIds);

    /**
     * Returns distinct (lesson_id, mode) pairs for in-progress lessons
     * that belong to published lessons only.
     * Each pair represents one learning mode the user needs to resume.
     */
    @Query(value = """
        SELECT ulp.lesson_id, ulp.mode
        FROM user_lesson_progress ulp
        INNER JOIN lessons l ON l.id = ulp.lesson_id
        WHERE ulp.user_id = :userId
          AND ulp.status = :status
          AND l.published_at IS NOT NULL
        GROUP BY ulp.lesson_id, ulp.mode
        ORDER BY MAX(ulp.updated_at) DESC
        """,
        countQuery = """
        SELECT COUNT(DISTINCT (ulp.lesson_id, ulp.mode))
        FROM user_lesson_progress ulp
        INNER JOIN lessons l ON l.id = ulp.lesson_id
        WHERE ulp.user_id = :userId
          AND ulp.status = :status
          AND l.published_at IS NOT NULL
        """,
        nativeQuery = true)
    Page<Object[]> findDistinctLessonIdAndModeByUserIdAndStatus(
            @Param("userId") String userId,
            @Param("status") String status,
            Pageable pageable);

    @Query("SELECT ulp FROM UserLessonProgress ulp WHERE ulp.userId = :userId AND ulp.lessonId IN :lessonIds AND ulp.status = :status")
    List<UserLessonProgress> findByUserIdAndLessonIdInAndStatus(
            @Param("userId") String userId,
            @Param("lessonIds") List<Long> lessonIds,
            @Param("status") ProgressStatus status);
}
