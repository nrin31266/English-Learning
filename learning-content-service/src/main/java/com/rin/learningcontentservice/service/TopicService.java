package com.rin.learningcontentservice.service;

import com.rin.englishlearning.common.exception.BaseException;
import com.rin.learningcontentservice.dto.request.AddEditTopicRequest;
import com.rin.learningcontentservice.dto.response.*;
import com.rin.learningcontentservice.exception.LearningContentErrorCode;
import com.rin.learningcontentservice.mapper.LessonMapper;
import com.rin.learningcontentservice.mapper.TopicMapper;
import com.rin.learningcontentservice.model.Lesson;
import com.rin.learningcontentservice.model.Topic;
import com.rin.learningcontentservice.repository.LessonRepository;
import com.rin.learningcontentservice.repository.TopicRepository;
import com.rin.learningcontentservice.utils.TextUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
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


    @Transactional
    public TopicDetailsResponse getTopicDetailsBySlug(String slug) {
        Topic topic = topicRepository.findBySlug(slug)
                .orElseThrow(() -> new BaseException(LearningContentErrorCode.TOPIC_NOT_FOUND,
                        LearningContentErrorCode.TOPIC_NOT_FOUND.formatMessage(slug)));

        // Only get published lessons
        topic.setLessons(
                topic.getLessons().stream()
                        .filter(l -> l.getPublishedAt() != null)
                        .collect(Collectors.toList())
        );

        return  topicMapper.toTopicDetails(topic);


    }

    @Transactional(readOnly = true)
    public HomeTopicsResponse getTopicsForHome(int limitTopics, int limitLessonsPerTopic) {

        // 1) Lấy tất cả active topics minimal (để trả allTopics)
        List<TopicSummaryResponse> allTopics = topicRepository.findActiveTopics();

        // Nếu không có topic nào -> trả rỗng luôn
        if (allTopics.isEmpty()) {
            return HomeTopicsResponse.builder()
                    .allTopics(Collections.emptyList())
                    .topics(Collections.emptyList())
                    .build();
        }

        // 2) Cắt limitTopics cho phần home
        List<TopicSummaryResponse> limitedTopics = allTopics.stream()
                .limit(limitTopics)
                .toList();

        // Nếu limitTopics = 0 thì limitedTopics rỗng -> không cần query lesson
        if (limitedTopics.isEmpty()) {
            return HomeTopicsResponse.builder()
                    .allTopics(allTopics)
                    .topics(Collections.emptyList())
                    .build();
        }

        List<Long> limitedTopicIds = limitedTopics.stream()
                .map(TopicSummaryResponse::getId)
                .toList();

        // 3) Lấy lessons đã limit per topic trong DB
        List<Lesson> lessons = lessonRepository
                .findLatestLessonsByTopicIds(limitedTopicIds, limitLessonsPerTopic);

        // 4) Group lessons theo topicId
        Map<Long, List<Lesson>> lessonMap = lessons.stream()
                .collect(Collectors.groupingBy(l -> l.getTopic().getId()));

        // 5) Build topics response
        List<HomeTopicResponse> topicResponses = limitedTopics.stream()
                .map(t -> {
                    List<HomeLessonResponse> lessonResponses =
                            lessonMap.getOrDefault(t.getId(), Collections.emptyList())
                                    .stream()
                                    .map(lessonMapper::toHomeLessonResponse)
                                    .toList();

                    return HomeTopicResponse.builder()
                            .id(t.getId())
                            .name(t.getName())
                            .slug(t.getSlug())
                            .lessons(lessonResponses)
                            .build();
                })
                .toList();

        // 6) Build final response
        return HomeTopicsResponse.builder()
                .allTopics(allTopics)
                .topics(topicResponses)
                .build();
    }



}
