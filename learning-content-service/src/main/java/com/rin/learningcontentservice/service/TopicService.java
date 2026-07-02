package com.rin.learningcontentservice.service;

import com.rin.englishlearning.common.exception.BaseException;
import com.rin.learningcontentservice.dto.request.AddEditTopicRequest;
import com.rin.learningcontentservice.dto.response.*;
import com.rin.learningcontentservice.exception.LearningContentErrorCode;
import com.rin.learningcontentservice.mapper.LessonMapper;
import com.rin.learningcontentservice.mapper.TopicMapper;
import com.rin.learningcontentservice.model.Lesson;
import com.rin.learningcontentservice.model.ProgressStatus;
import com.rin.learningcontentservice.model.Topic;
import com.rin.learningcontentservice.model.UserLessonProgress;
import com.rin.learningcontentservice.repository.LessonRepository;
import com.rin.learningcontentservice.repository.TopicRepository;
import com.rin.learningcontentservice.repository.UserLessonProgressRepository;
import com.rin.learningcontentservice.utils.TextUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TopicService {
    private final TopicRepository topicRepository;
    private final TopicMapper topicMapper;
    private final LessonRepository lessonRepository;
    private final LessonMapper lessonMapper;
    private final UserLessonProgressRepository userLessonProgressRepository;

    @Transactional(readOnly = true)
    public List<TopicSummaryResponse> getActiveTopics() {
        return topicRepository.findActiveTopics();
    }

    public TopicResponseWithLessonCount addTopic(AddEditTopicRequest topicRequest) {
        String slug = TextUtils.createSlug(topicRequest.getName());
        if(topicRepository.findBySlug(slug).isPresent()) {
            throw new BaseException(LearningContentErrorCode.TOPIC_WITH_NAME_EXISTS,
                    LearningContentErrorCode.TOPIC_WITH_NAME_EXISTS.formatMessage(topicRequest.getName()));
        }
        Topic newTopic = topicMapper.toTopic(topicRequest);
        newTopic.setSlug(slug);

        topicRepository.save(newTopic);

        return topicMapper.toTopicResponse(newTopic);
    }

    public List<TopicResponseWithLessonCount> getTopicsForAdmin() {
        return topicRepository.findAdminTopics();
    }

    public List<TopicOptionResponse> getTopicOptions() {
        return topicRepository.findTopicOptions();
    }

    public void deleteTopicBySlug(String slug) {
        topicRepository.deleteBySlug(slug);
    }

    public TopicResponseWithLessonCount editTopic(String slug, AddEditTopicRequest topicRequest) {
        Topic existingTopic = topicRepository.findBySlug(slug)
                .orElseThrow(() -> new BaseException(LearningContentErrorCode.TOPIC_NOT_FOUND,
                        LearningContentErrorCode.TOPIC_NOT_FOUND.formatMessage(slug)));

        String newSlug = TextUtils.createSlug(topicRequest.getName());
        if(!newSlug.equals(slug) && topicRepository.findBySlug(newSlug).isPresent()) {
            throw new BaseException(LearningContentErrorCode.TOPIC_WITH_NAME_EXISTS,
                    LearningContentErrorCode.TOPIC_WITH_NAME_EXISTS.formatMessage(topicRequest.getName()));
        }

        existingTopic.setName(topicRequest.getName());
        existingTopic.setDescription(topicRequest.getDescription());
        existingTopic.setIsActive(topicRequest.getIsActive());
        existingTopic.setColor(topicRequest.getColor());
        existingTopic.setSlug(newSlug);

        topicRepository.save(existingTopic);

        return topicMapper.toTopicResponse(existingTopic);
    }



    @Transactional(readOnly = true)
    public ResumeLearningResponse getResumeLearningPaginated(String userId, int page, int size) {
        if (userId == null) {
            return ResumeLearningResponse.builder()
                    .totalInProgress(0)
                    .hasMore(false)
                    .recentLessons(List.of())
                    .build();
        }

        // Query distinct (lesson_id, mode) pairs — 1 bài có thể có cả SHADOWING + DICTATION
        // Chỉ lấy bài đã publish (published_at IS NOT NULL)
        Page<Object[]> pairPage = userLessonProgressRepository
                .findDistinctLessonIdAndModeByUserIdAndStatus(userId, ProgressStatus.IN_PROGRESS.name(), PageRequest.of(page, size));

        List<Object[]> pairs = pairPage.getContent();
        if (pairs.isEmpty()) {
            return ResumeLearningResponse.builder()
                    .totalInProgress(0)
                    .hasMore(false)
                    .recentLessons(List.of())
                    .build();
        }

        List<Long> lessonIds = pairs.stream()
                .map(p -> ((Number) p[0]).longValue())
                .distinct()
                .toList();

        // Fetch lesson details
        Map<Long, Lesson> lessonMap = lessonRepository.findAllById(lessonIds).stream()
                .collect(Collectors.toMap(Lesson::getId, l -> l));

        // Fetch progress records for these lessons
        List<UserLessonProgress> progresses = userLessonProgressRepository
                .findByUserIdAndLessonIdInAndStatus(userId, lessonIds, ProgressStatus.IN_PROGRESS);

        // Build 1 DTO per (lesson_id, mode) pair
        List<ResumeLessonDto> recentLessons = buildResumeLessonDtos(pairs, lessonMap, progresses);

        return ResumeLearningResponse.builder()
                .totalInProgress((int) pairPage.getTotalElements())
                .hasMore(!pairPage.isLast())
                .recentLessons(recentLessons)
                .build();
    }

    /**
     * Build 1 ResumeLessonDto per (lessonId, mode) pair.
     * If a lesson has both SHADOWING and DICTATION in progress, it produces 2 items.
     */
    private List<ResumeLessonDto> buildResumeLessonDtos(
            List<Object[]> pairs,
            Map<Long, Lesson> lessonMap,
            List<UserLessonProgress> progresses) {

        // Index progress by (lessonId, mode) for quick lookup
        Map<String, UserLessonProgress> progressByKey = progresses.stream()
                .collect(Collectors.toMap(
                        p -> p.getLessonId() + ":" + p.getMode().name(),
                        p -> p,
                        (a, b) -> a
                ));

        return pairs.stream()
                .map(pair -> {
                    Long lessonId = ((Number) pair[0]).longValue();
                    String mode = (String) pair[1];

                    Lesson lesson = lessonMap.get(lessonId);
                    if (lesson == null) return null;

                    UserLessonProgress progress = progressByKey.get(lessonId + ":" + mode);

                    int totalActive = lesson.getTotalSentences() != null ? lesson.getTotalSentences() : 0;
                    int completedCount = (progress != null && progress.getCompletedSentenceCount() != null)
                            ? progress.getCompletedSentenceCount()
                            : 0;
                    int progressPercent = lessonMapper.calculatePercent(completedCount, totalActive);

                    return ResumeLessonDto.builder()
                            .id(lesson.getId())
                            .title(lesson.getTitle())
                            .slug(lesson.getSlug())
                            .thumbnailUrl(lesson.getThumbnailUrl())
                            .languageLevel(lesson.getLanguageLevel() != null ? lesson.getLanguageLevel().name() : null)
                            .sourceType(lesson.getSourceType() != null ? lesson.getSourceType().name() : null)
                            .durationSeconds(lesson.getDurationSeconds())
                            .enableDictation(lesson.getEnableDictation())
                            .enableShadowing(lesson.getEnableShadowing())
                            .mode(mode)
                            .progressPercent(progressPercent)
                            .activeSentenceCount(totalActive)
                            .build();
                })
                .filter(Objects::nonNull)
                .toList();
    }
}
