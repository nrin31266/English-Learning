package com.rin.learningcontentservice.model.shadowing;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(
        indexes = {
                @Index(name = "idx_user_sentence", columnList = "user_id,sentence_id"),
                @Index(name = "idx_user_lesson", columnList = "user_id,lesson_id")
        }
)
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class SentenceShadowingAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "lesson_id", nullable = false)
    private Long lessonId;

    @Column(name = "sentence_id", nullable = false)
    private Long sentenceId;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "progress_id", nullable = false)
    private LessonShadowingProgress lessonShadowingProgress;

    // 👉 Thay thế scores list bằng các field đơn giản
    @Builder.Default
    private Boolean completed = false;



    @Column(name = "best_score")
    private Double bestScore;

    @Column(name = "best_fluency")
    private Double bestFluency;



    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}