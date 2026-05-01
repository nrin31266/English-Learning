package com.rin.learningcontentservice.mapper;


import com.rin.learningcontentservice.dto.projection.HomeLessonProjection;
import com.rin.learningcontentservice.dto.request.AddLessonRequest;
import com.rin.learningcontentservice.dto.request.EditLessonRequest;
import com.rin.learningcontentservice.dto.response.*;
import com.rin.learningcontentservice.model.LearningMode;
import com.rin.learningcontentservice.model.Lesson;
import com.rin.learningcontentservice.model.ProgressStatus;
import com.rin.learningcontentservice.model.UserLessonProgress;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface LessonMapper {
    Lesson toLesson(AddLessonRequest lessonRequest);

    LessonSummaryResponse toLessonSummaryResponse(Lesson lesson);

    LessonResponse toLessonResponse(Lesson lesson);

    HomeLessonResponse toHomeLessonResponse(HomeLessonProjection projection);

    LessonDetailsResponse toLessonDetailsResponse(Lesson lesson);

    void updateLessonFromRequest(EditLessonRequest lessonRequest, @MappingTarget Lesson lesson);

    default HomeLessonResponse toHomeLessonResponseWithProgress(
            HomeLessonProjection projection,
            List<UserLessonProgress> progresses
    ) {
        if (projection == null) return null;

        HomeLessonResponse response = toHomeLessonResponse(projection);

        // Init mặc định
        initializeDefaultProgress(response);

        if (progresses == null || progresses.isEmpty()) return response;

        int totalActive = projection.getActiveSentenceCount() != null ? projection.getActiveSentenceCount() : 0;

        progresses.forEach(p -> {
            int percent = calculatePercent(p.getCompletedSentenceIds() != null ? p.getCompletedSentenceIds().size() : 0, totalActive);

            if (p.getMode() == LearningMode.SHADOWING) {
                response.setShadowingStatus(p.getStatus().name());
                response.setShadowingProgressPercent(percent);
            } else if (p.getMode() == LearningMode.DICTATION) {
                response.setDictationStatus(p.getStatus().name());
                response.setDictationProgressPercent(percent);
            }
        });

        return response;
    }


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