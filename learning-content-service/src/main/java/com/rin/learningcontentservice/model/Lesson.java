package com.rin.learningcontentservice.model;

import com.rin.englishlearning.common.constants.*;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.sql.Timestamp;
import java.util.List;

@Entity
@Table(name = "lessons")
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class Lesson {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ───────────────────────────────────────────
    // Topic reference
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id", nullable = false)
    private Topic topic;

    // ───────────────────────────────────────────
    // Basic info
    @Column(nullable = false)
    private String title;

    private String thumbnailUrl;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column
    private LessonType lessonType; // ai_assisted, traditional

    @Enumerated(EnumType.STRING)
    private LessonProcessingStep processingStep;

    @Enumerated(EnumType.STRING)
    @Column(name = "language_level")
    private CefrLevel languageLevel; // CEFR A1–C2

    // ───────────────────────────────────────────
    // Source info
    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false)
    private LessonSourceType sourceType; // youtube, audio_file, text…

    @Column(name = "source_url", length = 500)
    private String sourceUrl;

    @Column(name = "source_reference_id")
    private String sourceReferenceId;  // YouTube video ID, internal file ID…

    @Column(name = "source_language")
    private String sourceLanguage; // e.g. en-US, en-UK

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    // ───────────────────────────────────────────
    // Metadata for processing
    @Column(name = "total_sentences")
    private Integer totalSentences;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LessonStatus status; // draft, processing, ready, error…

    @Column(name = "ai_job_id")
    private String aiJobId;

    // ───────────────────────────────────────────
    // Feature toggles
    @Column(name = "enable_dictation", nullable = false)
    private Boolean enableDictation = true;

    @Column(name = "enable_shadowing", nullable = false)
    private Boolean enableShadowing = true;

    // ───────────────────────────────────────────
    // Timestamps
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Timestamp createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Timestamp updatedAt;

    @Column(name = "published_at")
    private Timestamp publishedAt;


    @OneToMany(mappedBy = "lesson", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<LessonSentence> sentences;

}
