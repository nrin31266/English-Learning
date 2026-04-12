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
@CompoundIndex(name = "text_pos_idx", def = "{'text': 1, 'pos': 1}", unique = true)
public class Word {

    @Id
    String id; // "text|pos"

    String text;      // từ gốc
    String pos;       // VERB, NOUN, ADJ
    String lemma;     // dạng từ điển
    String context;   // câu gốc

    Phonetics phonetics;
    List<Definition> definitions;

    WordCreationStatus status;  // "PENDING" hoặc "READY"
    LocalDateTime pendingStartedAt;


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
        String meaning;        // nghĩa tiếng Anh đơn giản
        String example;        // câu ví dụ
        String translationVi;  // nghĩa tiếng Việt
    }
}