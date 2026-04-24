package com.rin.learningcontentservice.model.shadowing;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        indexes = {
                @Index(name = "idx_user_lesson_progress", columnList = "user_id,lesson_id", unique = true)
        }
)
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class LessonShadowingProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "lesson_id", nullable = false)
    private Long lessonId;

    @Column(name = "lesson_version")
    private Integer lessonVersion;

    @Column(name = "completed_sentences", nullable = false)
    @Builder.Default
    private Integer completedSentences = 0;

    @Column(name = "total_sentences", nullable = false)
    @Builder.Default
    private Integer totalSentences = 0;

    @OneToMany(mappedBy = "lessonShadowingProgress", fetch = FetchType.LAZY, orphanRemoval = true, cascade = CascadeType.ALL)
    @Builder.Default
    private List<SentenceShadowingAttempt> sentenceAttempts = new ArrayList<>();

    @Column(name = "completed", nullable = false)
    @Builder.Default
    private Boolean completed = false;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}