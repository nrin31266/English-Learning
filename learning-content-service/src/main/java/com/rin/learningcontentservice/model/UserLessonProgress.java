package com.rin.learningcontentservice.model;


import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.sql.Timestamp;
import java.util.HashMap;
import java.util.Map;

@Entity
@Table(
        name = "user_lesson_progress",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"user_id", "lesson_id", "mode"})
        },
        indexes = @Index(name = "idx_user_lesson_progress_lookup", columnList = "user_id, lesson_id, mode")
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
    @Column(name = "progress_items", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<Long, ProgressItem> progressItems = new HashMap<>();

    @Column(name = "lesson_score")
    private Double lessonScore;

    @Builder.Default
    @Column(name = "completed_sentence_count")
    private Integer completedSentenceCount = 0;

    @Builder.Default
    @Column(name = "total_sentence_count")
    private Integer totalSentenceCount = 0;

    @Column(name = "completed_at")
    private Long completedAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Timestamp updatedAt;

}
