package com.rin.englishlearning.common.event;

import com.rin.englishlearning.common.constants.LessonSourceType;
import com.rin.englishlearning.common.constants.SourceLicenseType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LessonGenerationRequestedEvent {
    private LessonSourceType sourceType; // youtube, audio_file, text...
    private String sourceUrl;            // link youtube hoặc link file
    private String aiJobId;                 // id công việc AI
    private String aiMetadataUrl;          // thông tin bổ sung cho công việc AI (ví dụ: ngôn ngữ nguồn)
    private Long lessonId;
    private SourceLicenseType sourceLicenseType;
    private String title;
    private String description;
    // Chay lai tu dau thay vi continue
    private Boolean isRestart;
}
