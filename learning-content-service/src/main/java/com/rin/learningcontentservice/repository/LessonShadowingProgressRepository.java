package com.rin.learningcontentservice.repository;

import com.rin.learningcontentservice.model.shadowing.LessonShadowingProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

import java.util.Optional;

public interface LessonShadowingProgressRepository extends JpaRepository<LessonShadowingProgress, Long> {
    Optional<LessonShadowingProgress> findByUserIdAndLessonId(String userId, Long ldId);

    @Modifying
    void removeByLessonId(Long lessonId);
}
