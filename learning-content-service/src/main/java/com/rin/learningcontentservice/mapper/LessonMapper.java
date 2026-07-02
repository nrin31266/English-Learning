package com.rin.learningcontentservice.mapper;


import com.rin.learningcontentservice.dto.request.AddLessonRequest;
import com.rin.learningcontentservice.dto.request.EditLessonRequest;
import com.rin.learningcontentservice.dto.response.*;
import com.rin.learningcontentservice.model.Lesson;
import com.rin.learningcontentservice.model.ProgressStatus;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;


@Mapper(componentModel = "spring")
public interface LessonMapper {
    Lesson toLesson(AddLessonRequest lessonRequest);

    LessonSummaryResponse toLessonSummaryResponse(Lesson lesson);

    LessonResponse toLessonResponse(Lesson lesson);


    LessonDetailsResponse toLessonDetailsResponse(Lesson lesson);

    void updateLessonFromRequest(EditLessonRequest lessonRequest, @MappingTarget Lesson lesson);

    default int calculatePercent(int completedCount, int totalActive) {
        if (totalActive <= 0) return 0;

        int percent = (int) Math.round(((double) completedCount / totalActive) * 100);
        return Math.min(percent, 100);
    }

    default void initializeDefaultProgress(HomeLessonResponse response) {
        response.setShadowingStatus(ProgressStatus.NOT_STARTED.name());
        response.setDictationStatus(ProgressStatus.NOT_STARTED.name());
        response.setShadowingProgressPercent(0);
        response.setDictationProgressPercent(0);
    }
}
