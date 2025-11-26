package com.rin.learningcontentservice.dto.metadata;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiMetadataDto {

    private SourceFetched sourceFetched;

    private Transcribed transcribed;

    private NlpAnalyzed nlpAnalyzed;
}