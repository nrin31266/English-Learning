package com.rin.dictionaryservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WordReadyRequest {
    private String wordKey;
    private String pos;
}
