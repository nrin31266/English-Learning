package com.rin.learningcontentservice.repository;

import com.rin.learningcontentservice.model.LessonSentence;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LessonSentenceRepository extends JpaRepository<LessonSentence,Long> {

    List<LessonSentence> findByLessonIdAndOrderIndexGreaterThan(Long lessonId, int orderIndex);
}
