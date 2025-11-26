package com.rin.learningcontentservice.dto.metadata;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Transcribed {
    private java.util.List<SegmentMetadata> segments;
}