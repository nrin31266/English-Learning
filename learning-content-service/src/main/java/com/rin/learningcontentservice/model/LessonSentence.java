package com.rin.learningcontentservice.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.sql.Timestamp;
import java.util.List;

@Entity
@Table(name = "lesson_sentences")
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LessonSentence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ───────────────────────────────────────────
    // RELATIONSHIP
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    // ───────────────────────────────────────────
    // METADATA
    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;

    // ───────────────────────────────────────────
    // TEXT CONTENT
    @Column(name = "text_raw", columnDefinition = "TEXT", nullable = false)
    private String textRaw; // Dữ liệu gốc từ WhisperX, không chỉnh sửa

//    @Column(name = "text_normalized", columnDefinition = "TEXT")
//    private String textNormalized;

    @Column(name = "text_display", columnDefinition = "TEXT")
    private String textDisplay;

    @Column(name = "translation_vi", columnDefinition = "TEXT")
    private String translationVi;

    // ───────────────────────────────────────────
    // PHONETICS
    @Column(name = "phonetic_uk", length = 1000)
    private String phoneticUk;

    @Column(name = "phonetic_us", length = 1000)
    private String phoneticUs;

    // ───────────────────────────────────────────
    // AUDIO POSITIONING
    @Column(name = "audio_start_ms")
    private Integer audioStartMs;

    @Column(name = "audio_end_ms")
    private Integer audioEndMs;

    @Column(name = "audio_segment_url", length = 500)
    private String audioSegmentUrl;

    // ───────────────────────────────────────────
    // DEBUG / RAW AI RESPONSE
    @Column(name = "ai_metadata_json", columnDefinition = "TEXT")
    private String aiMetadataJson;

    // ───────────────────────────────────────────
    // VISIBILITY
    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    // ───────────────────────────────────────────
    // TIMESTAMPS
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Timestamp createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Timestamp updatedAt;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "sentence", fetch = FetchType.LAZY)
    List<LessonWord> lessonWords;
}
