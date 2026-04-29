package com.rin.learningcontentservice.mapper;

import com.rin.learningcontentservice.dto.request.AddLessonRequest;
import com.rin.learningcontentservice.dto.request.EditLessonRequest;
import com.rin.learningcontentservice.dto.response.HomeLessonResponse;
import com.rin.learningcontentservice.dto.response.LessonDetailsResponse;
import com.rin.learningcontentservice.dto.response.LessonSummaryResponse;
import com.rin.learningcontentservice.dto.response.LessonResponse;
import com.rin.learningcontentservice.model.Lesson;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface LessonMapper {
    Lesson toLesson(AddLessonRequest lessonRequest);

    LessonSummaryResponse toLessonSummaryResponse(Lesson lesson);


    LessonResponse toLessonResponse(Lesson lesson);

    HomeLessonResponse  toHomeLessonResponse(Lesson lesson);


    LessonDetailsResponse toLessonDetailsResponse(Lesson lesson);

    void updateLessonFromRequest(EditLessonRequest lessonRequest, @MappingTarget Lesson lesson);
}
