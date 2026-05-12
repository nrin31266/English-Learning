package com.rin.dictionaryservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AiGenerateRequest {
    private String system_prompt;
    private String user_prompt;
}
