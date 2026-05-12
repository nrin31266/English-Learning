package com.rin.dictionaryservice.model;

import com.rin.dictionaryservice.constant.WordCreationStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "words")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@CompoundIndex(name = "text_pos_idx", def = "{'key': 1, 'pos': 1}", unique = true)
@CompoundIndex(name = "processing_idx", def = "{'status': 1, 'retryCount': 1, 'createdAt': 1}")
@CompoundIndex(
        name = "recover_idx",
        def = "{'status': 1, 'processingStartedAt': 1}"
)
public class Word {

    @Id
    String id; // "text|pos"

    String text;      // từ gốc
    String pos;       // VERB, NOUN, ADJ
    String key;       // don't, -> dont
    String lemma;     // dạng từ điển
    String entityType; // PERSON, GPE, ORG, ...
    String context;   // câu gốc
    String summaryVi; // nghĩa Vi tóm tắt
    Phonetics phonetics;
    CefrLevel cefrLevel; // CEFR level (A1, A2, B1, B2, C1, C2)
    List<Definition> definitions;

    @Builder.Default
    WordCreationStatus status = WordCreationStatus.PENDING;
    // PENDING, PROCESSING, READY, FAILED

    // 🔥 PROCESSING INFO
    private LocalDateTime processingStartedAt; // đổi tên từ pendingStartedAt
    @Builder.Default
    Integer retryCount = 0;
    private LocalDateTime lastRetryAt;
    private String lockedBy;

    @Builder.Default
    boolean isPhrase = false;  // true nếu là cụm từ (collocation, idiom...)
    String phraseType;         // COLLOCATION, IDIOM, PHRASAL_VERB, FIXED_EXPRESSION

    @CreatedDate
    LocalDateTime createdAt;

    @LastModifiedDate
    LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Phonetics {
        String uk;
        String ukAudioUrl;
        String us;
        String usAudioUrl;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Definition {
        String definition;   // EN
        String meaningVi;    // VI - Ép AI gen cực kỳ ngắn gọn
        String example;      // Câu ví dụ ngắn (EN)
        String viExample;    // Dịch câu ví dụ sang VI
        CefrLevel level;     // A1, A2, B1...
    }
}