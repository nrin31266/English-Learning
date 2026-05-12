package com.rin.dictionaryservice.dto;

import lombok.Data;
import java.util.List;

@Data
public class UpdateVocabTopicRequest {
    String title;
    String description;
    List<String> tags;
    String cefrRange;
    String thumbnailUrl;
}
