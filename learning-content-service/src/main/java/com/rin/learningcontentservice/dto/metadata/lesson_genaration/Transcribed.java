package com.rin.learningcontentservice.dto.metadata.lesson_genaration;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Transcribed {
    List<SegmentMetadata> segments;
}