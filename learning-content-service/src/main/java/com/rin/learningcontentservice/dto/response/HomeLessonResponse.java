package com.rin.learningcontentservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class HomeLessonResponse {
    private Long id;
    private String topicSlug; // Nếu cần thì truyền vào lúc map
    private String title;
    private String thumbnailUrl;
    private String slug;
    private String languageLevel; // Đổi thành String do map từ Projection
    private String sourceType;
    private Integer durationSeconds;
    private Boolean enableDictation;
    private Boolean enableShadowing;

    // Status gốc
    private String shadowingStatus;
    private String dictationStatus;

    // MỚI: Phần trăm tiến độ (0 - 100)
    private Integer shadowingProgressPercent;
    private Integer dictationProgressPercent;
    private Integer activeSentenceCount;
}
