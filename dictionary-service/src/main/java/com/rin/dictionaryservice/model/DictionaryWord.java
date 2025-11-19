package com.rin.dictionaryservice.model;

import com.rin.dictionaryservice.model.sub.Definition;
import com.rin.dictionaryservice.model.sub.Phonetics;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;

import java.time.LocalDateTime;
import java.util.List;

@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Getter
@Setter
@ToString
@EqualsAndHashCode
@Document(collection = "dictionary_words")
public class DictionaryWord {

    @Id
    String id;

    // Base word, lowercase, for lookup
    String word;

    // Original formatted word
    String originWord;

    Boolean isValidWord = true;
    String wordType = "normal";
    String cefrLevel;

    // JSON → object
    Phonetics phonetics;

    // JSON array → list of objects
    List<Definition> definitions;

    String audioUs;
    String audioUk;

    @CreatedDate
    LocalDateTime createdAt;

    @LastModifiedDate
    LocalDateTime updatedAt;
}
