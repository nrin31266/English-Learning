package com.rin.dictionaryservice.dto;

import lombok.Data;
import java.util.List;

@Data
public class CreateVocabTopicRequest {
    String title;
    String description;
    List<String> tags;
    String cefrRange;
    int estimatedWordCount;
    String thumbnailUrl;
}
