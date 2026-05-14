package com.rin.dictionaryservice.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Document(collection = "vocab_tags")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VocabTag {

    @Id
    private String id;

    private String name;

    private String slug;

    private Integer sortOrder;

    private Boolean isActive;
}