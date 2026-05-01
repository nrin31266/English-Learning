package com.rin.learningcontentservice.repository;

import com.rin.learningcontentservice.model.LearningMode;
import com.rin.learningcontentservice.model.UserLessonProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

import java.util.List;
import java.util.Optional;

public interface UserLessonProgressRepository extends JpaRepository<UserLessonProgress,Long> {
    Optional<UserLessonProgress> findByUserIdAndLessonIdAndMode(String userId, Long lessonId, LearningMode mode);
    List<UserLessonProgress> findByUserIdAndLessonId(String userId, Long lessonId);
    @Modifying
    void deleteByLessonId(Long lessonId);

    List<UserLessonProgress> findByUserIdAndLessonIdIn(String userId, List<Long> lessonIds);
}
