package com.rin.learningcontentservice.repository;

import com.rin.learningcontentservice.model.shadowing.SentenceShadowingAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SentenceShadowingAttemptRepository extends JpaRepository<SentenceShadowingAttempt, Long> {
}
