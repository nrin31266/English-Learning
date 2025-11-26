package com.rin.learningcontentservice.mapper;

import com.rin.learningcontentservice.dto.request.AddLessonRequest;
import com.rin.learningcontentservice.dto.response.LessonDetailsResponse;
import com.rin.learningcontentservice.dto.response.LessonMinimalResponse;
import com.rin.learningcontentservice.dto.response.LessonResponse;
import com.rin.learningcontentservice.model.Lesson;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface LessonMapper {
    Lesson toLesson(AddLessonRequest lessonRequest);

    LessonMinimalResponse toLessonMinimalResponse(Lesson lesson);

    LessonResponse toLessonResponse(Lesson lesson);

    LessonDetailsResponse toLessonDetailsResponse(Lesson lesson);


}
