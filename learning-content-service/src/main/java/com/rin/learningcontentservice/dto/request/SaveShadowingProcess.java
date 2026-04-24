package com.rin.learningcontentservice.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SaveShadowingProcess {
    Double fluencyScore;
    Double score;
}
