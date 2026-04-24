package com.rin.learningcontentservice.mapper;

import com.rin.learningcontentservice.dto.response.LessonShadowingProgressDto;
import com.rin.learningcontentservice.model.shadowing.LessonShadowingProgress;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface LessonShadowingProgressMapper {
    LessonShadowingProgressDto lessonShadowingProgressDto(LessonShadowingProgress lessonShadowingProgress);
}
