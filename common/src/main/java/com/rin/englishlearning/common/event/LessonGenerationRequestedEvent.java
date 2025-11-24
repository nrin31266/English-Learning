package com.rin.englishlearning.common.event;

import com.rin.englishlearning.common.constants.LessonSourceType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LessonGenerationRequestedEvent {
    private Long lessonId;
    private LessonSourceType sourceType; // youtube, audio_file, text...
    private String sourceUrl;            // link youtube hoặc link file
}
