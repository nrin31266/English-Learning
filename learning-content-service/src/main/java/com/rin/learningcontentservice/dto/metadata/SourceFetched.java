package com.rin.learningcontentservice.dto.metadata;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SourceFetched {
    @JsonProperty("file_path")
    private String filePath;

    private Integer duration;

    private String sourceReferenceId;

    private String thumbnailUrl;

    private String audioUrl;
}