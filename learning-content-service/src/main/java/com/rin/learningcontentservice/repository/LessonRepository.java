package com.rin.learningcontentservice.repository;

import com.rin.learningcontentservice.model.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonRepository extends JpaRepository<Lesson, Long> {
}
