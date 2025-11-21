package com.rin.learningcontentservice.repository;

import com.rin.learningcontentservice.model.LessonWord;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonWordRepository extends JpaRepository<LessonWord, Long> {
}
