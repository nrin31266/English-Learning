package com.rin.learningcontentservice.dto.projection;

public interface HomeLessonProjection {
    Long getId();
    Long getTopicId();
    String getTitle();
    String getThumbnailUrl();
    String getSlug();
    String getLanguageLevel(); // Enum sẽ được map thành String
    String getSourceType();
    Integer getDurationSeconds();
    Boolean getEnableDictation();
    Boolean getEnableShadowing();


    Integer getActiveSentenceCount();
}