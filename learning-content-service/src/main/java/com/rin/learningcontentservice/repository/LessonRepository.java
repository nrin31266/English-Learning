package com.rin.learningcontentservice.repository;

import com.rin.learningcontentservice.model.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LessonRepository extends JpaRepository<Lesson, Long> {
    Optional<Lesson> findBySlug(String slug);
}
