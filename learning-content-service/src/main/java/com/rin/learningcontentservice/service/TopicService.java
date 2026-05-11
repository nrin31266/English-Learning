package com.rin.learningcontentservice.service;

import com.rin.englishlearning.common.exception.BaseException;
import com.rin.learningcontentservice.dto.projection.HomeLessonProjection;
import com.rin.learningcontentservice.dto.request.AddEditTopicRequest;
import com.rin.learningcontentservice.dto.response.*;
import com.rin.learningcontentservice.exception.LearningContentErrorCode;
import com.rin.learningcontentservice.mapper.LessonMapper;
import com.rin.learningcontentservice.mapper.TopicMapper;
import com.rin.learningcontentservice.model.Topic;
import com.rin.learningcontentservice.model.UserLessonProgress;
import com.rin.learningcontentservice.repository.LessonRepository;
import com.rin.learningcontentservice.repository.TopicRepository;
import com.rin.learningcontentservice.repository.UserLessonProgressRepository;
import com.rin.learningcontentservice.utils.TextUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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

        return HomeTopicsResponse.builder()
                .allTopics(allTopics)
                .topics(topicResponses)
                .build();
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
