package com.rin.learningcontentservice.service;

import com.rin.englishlearning.common.exception.BaseException;
import com.rin.learningcontentservice.dto.projection.HomeLessonProjection;
import com.rin.learningcontentservice.dto.request.AddEditTopicRequest;
import com.rin.learningcontentservice.dto.response.*;
import com.rin.learningcontentservice.exception.LearningContentErrorCode;
import com.rin.learningcontentservice.mapper.LessonMapper;
import com.rin.learningcontentservice.mapper.TopicMapper;
import com.rin.learningcontentservice.model.LearningMode;
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

import java.util.Collections;
import java.util.HashMap;
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


    private Map<Long, List<UserLessonProgress>> getLessonProgressMap(String userId, List<Long> lessonIds) {
        if (userId == null || lessonIds.isEmpty()) return Collections.emptyMap();

        return userLessonProgressRepository.findByUserIdAndLessonIdIn(userId, lessonIds)
                .stream()
                .collect(Collectors.groupingBy(UserLessonProgress::getLessonId));
    }
    @Transactional(readOnly = true)
    public TopicDetailsResponse getTopicDetailsBySlug(String slug, String userId) {
        // 1. Tìm Topic lấy Metadata
        Topic topic = topicRepository.findBySlug(slug)
                .orElseThrow(() -> new BaseException(LearningContentErrorCode.TOPIC_NOT_FOUND,
                        LearningContentErrorCode.TOPIC_NOT_FOUND.formatMessage(slug)));

        // 2. Lấy toàn bộ Lesson của Topic này dưới dạng Projection (CÓ activeSentenceCount)
        List<HomeLessonProjection> lessons = lessonRepository.findAllLessonsWithCountByTopicId(topic.getId());

        // 3. Lấy Map Progress (Dùng lại helper cũ của ông cho sạch code)
        List<Long> lessonIds = lessons.stream().map(HomeLessonProjection::getId).toList();
        Map<Long, List<UserLessonProgress>> progressMap = getLessonProgressMap(userId, lessonIds);

        // 4. Map dữ liệu
        List<HomeLessonResponse> lessonResponses = lessons.stream()
                .map(lp -> {
                    var progress = progressMap.getOrDefault(lp.getId(), Collections.emptyList());
                    // Xài hàm mapper cho Projection của ông là xong phim
                    HomeLessonResponse res = lessonMapper.toHomeLessonResponseWithProgress(lp, progress);
                    res.setTopicSlug(topic.getSlug());
                    return res;
                }).toList();

        return TopicDetailsResponse.builder()
                .id(topic.getId())
                .name(topic.getName())
                .slug(topic.getSlug())
                .updatedAt(topic.getUpdatedAt())
                .totalLessons((long) lessons.size())
                .lessons(lessonResponses)
                .build();
    }

    @Transactional(readOnly = true)
    public HomeTopicsResponse getTopicsForHome(int limitTopics, int limitLessonsPerTopic, String userId) {
        List<TopicSummaryResponse> allTopics = topicRepository.findActiveTopics();
        if (allTopics.isEmpty()) return HomeTopicsResponse.builder().allTopics(List.of()).topics(List.of()).build();

        List<TopicSummaryResponse> limitedTopics = allTopics.stream().limit(limitTopics).toList();
        List<Long> limitedTopicIds = limitedTopics.stream().map(TopicSummaryResponse::getId).toList();

        List<HomeLessonProjection> lessons = lessonRepository.findLatestLessonsByTopicIds(limitedTopicIds, limitLessonsPerTopic);

        Map<Long, List<HomeLessonProjection>> lessonMap = lessons.stream()
                .collect(Collectors.groupingBy(HomeLessonProjection::getTopicId));

        Map<Long, List<UserLessonProgress>> progressMap = getLessonProgressMap(userId, lessons.stream().map(HomeLessonProjection::getId).toList());

        // Map dữ liệu tinh gọn hơn
        List<HomeTopicResponse> topicResponses = limitedTopics.stream()
                .map(t -> buildHomeTopicResponse(t, lessonMap, progressMap))
                .toList();

        // Lấy Resume Learning (10 bài IN_PROGRESS mới nhất)
        ResumeLearningResponse resumeLearning = getResumeLearning(userId, 10);

        return HomeTopicsResponse.builder()
                .allTopics(allTopics)
                .topics(topicResponses)
                .resumeLearning(resumeLearning)
                .build();
    }

    @Transactional(readOnly = true)
    public ResumeLearningResponse getResumeLearning(String userId, int limit) {
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
                .findDistinctLessonIdAndModeByUserIdAndStatus(userId, ProgressStatus.IN_PROGRESS.name(), PageRequest.of(0, limit));

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
                    int completedCount = (progress != null && progress.getCompletedSentenceIds() != null)
                            ? progress.getCompletedSentenceIds().size()
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
    private HomeTopicResponse buildHomeTopicResponse(
            TopicSummaryResponse t,
            Map<Long, List<HomeLessonProjection>> lessonMap,
            Map<Long, List<UserLessonProgress>> progressMap) {

        List<HomeLessonResponse> lessonResponses = lessonMap.getOrDefault(t.getId(), Collections.emptyList())
                .stream()
                .map(lp -> {
                    var progress = progressMap.getOrDefault(lp.getId(), Collections.emptyList());
                    HomeLessonResponse res = lessonMapper.toHomeLessonResponseWithProgress(lp, progress);
                    res.setTopicSlug(t.getSlug());
                    return res;
                }).toList();

        return HomeTopicResponse.builder()
                .id(t.getId())
                .name(t.getName())
                .slug(t.getSlug())
                .lessons(lessonResponses)
                .build();
    }



}
