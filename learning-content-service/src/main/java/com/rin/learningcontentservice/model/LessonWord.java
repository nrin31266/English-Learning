package com.rin.learningcontentservice.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.sql.Timestamp;

@Entity
@Table(name = "lesson_words")
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LessonWord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ───────────────────────────────────────────
    // RELATIONSHIP
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sentence_id", nullable = false)
    private LessonSentence sentence;

    // ───────────────────────────────────────────
    // ORDERING
    @Column(name = "order_index", nullable = false)
    private Integer orderIndex; // 0,1,2,...

    // ───────────────────────────────────────────
    @Column(name = "word_text", nullable = false, length = 255)
    private String wordText;     // gốc

    @Column(name = "word_lower", length = 255)
    private String wordLower;    // lowercase để UI search

    @Column(name = "word_normalized", length = 255)
    private String wordNormalized; // dùng tra từ điển

    @Column(name = "word_slug", length = 255)
    private String wordSlug;      // slug


//    @Column(length = 255)
//    private String lemma;        // run, go, eat — nếu có

    // ───────────────────────────────────────────
    // CHAR POSITIONING IN DISPLAY SENTENCE
    @Column(name = "start_char_index")
    private Integer startCharIndex;  // inclusive

    @Column(name = "end_char_index")
    private Integer endCharIndex;    // exclusive

    // AUDIO POSITIONING
    @Column(name = "audio_start_ms")
    private Integer audioStartMs;

    @Column(name = "audio_end_ms")
    private Integer audioEndMs;

    // ───────────────────────────────────────────
    // FLAGS
    @Builder.Default
    @Column(name = "is_punctuation", nullable = false)
    private Boolean isPunctuation = false; // dấu câu

    @Builder.Default
    @Column(name = "is_clickable", nullable = false)
    private Boolean isClickable = true; // có thể click để tra từ

    // ───────────────────────────────────────────
    // TIMESTAMPS
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Timestamp createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Timestamp updatedAt;
}
