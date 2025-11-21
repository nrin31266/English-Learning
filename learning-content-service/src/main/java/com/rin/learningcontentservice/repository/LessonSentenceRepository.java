package com.rin.learningcontentservice.repository;

import com.rin.learningcontentservice.model.LessonSentence;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonSentenceRepository extends JpaRepository<LessonSentence,Long> {
}
