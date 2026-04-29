package com.rin.learningcontentservice.model;


import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.sql.Timestamp;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(
        name = "user_lesson_progress",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"user_id", "lesson_id", "mode"})
        }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserLessonProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "lesson_id", nullable = false)
    private Long lessonId;

    // Sử dụng Enum + @Enumerated(EnumType.STRING) để DB lưu chữ "SHADOWING" thay vì số 0
    @Enumerated(EnumType.STRING)
    @Column(name = "mode", nullable = false, length = 50)
    private LearningMode mode;

    // Tương tự cho status
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "status", nullable = false, length = 50)
    private ProgressStatus status = ProgressStatus.IN_PROGRESS;
    @Column(name = "lesson_version")
    @Builder.Default
    private Integer lessonVersion = 0;
    @Builder.Default
    @Column(name = "completed_sentence_ids", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Set<Long> completedSentenceIds = new HashSet<>();

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Timestamp updatedAt;

    // --- Helper Methods ---
    public void markSentenceCompleted(Long sentenceId) {
        if (this.completedSentenceIds == null) {
            this.completedSentenceIds = new HashSet<>();
        }
        this.completedSentenceIds.add(sentenceId);
    }
}