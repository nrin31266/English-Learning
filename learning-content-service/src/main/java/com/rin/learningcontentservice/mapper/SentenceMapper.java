package com.rin.learningcontentservice.mapper;

import com.rin.learningcontentservice.dto.response.LessonSentenceDetailsResponse;
import com.rin.learningcontentservice.model.LessonSentence;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;


@Mapper(componentModel = "spring")
public interface SentenceMapper {
    @Mapping(target = "lessonId", source = "lesson.id")
    LessonSentenceDetailsResponse  toDetailsResponse(LessonSentence lessonSentence);
}
