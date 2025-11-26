package com.rin.learningcontentservice.repository;

import com.rin.learningcontentservice.model.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface LessonRepository extends JpaRepository<Lesson, Long>, JpaSpecificationExecutor<Lesson> {
    Optional<Lesson> findBySlug(String slug);
    Optional<Lesson> findByAiJobId(String aiJobId);
}
