package com.rin.dictionaryservice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;

@Data
public class VocabSessionSubmitRequest {
    @NotBlank @Size(max = 80) String sessionId;
    @NotEmpty @Size(max = 50) List<@Valid VocabSessionWordRequest> words;
}
