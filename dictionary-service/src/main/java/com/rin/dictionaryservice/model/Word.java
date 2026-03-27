package com.rin.dictionaryservice.model;

import com.rin.dictionaryservice.model.sub.Audio;
import com.rin.dictionaryservice.model.sub.Pronunciation;
import com.rin.dictionaryservice.model.sub.Sentence;
import com.rin.dictionaryservice.model.sub.WordCreationStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;

import java.time.LocalDateTime;
import java.util.List;


@Document(collection = "words")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Word {

    @Id
    String id; // lemma_pos

    String lemma;
    String pos;

    String displayWord;

    WordCreationStatus status; // PENDING, READY, FAILED

    Pronunciation pronunciation;

    List<Sentence> sentences;


    Audio audio;

    String cefrLevel;

    @CreatedDate
    LocalDateTime createdAt;

    @LastModifiedDate
    LocalDateTime updatedAt;
}
