package com.rin.learningcontentservice.service;

import com.rin.englishlearning.common.exception.BaseException;
import com.rin.learningcontentservice.dto.request.AddEditTopicRequest;
import com.rin.learningcontentservice.dto.response.TopicMinimalResponse;
import com.rin.learningcontentservice.dto.response.TopicResponse;
import com.rin.learningcontentservice.exception.LearningContentErrorCode;
import com.rin.learningcontentservice.mapper.TopicMapper;
import com.rin.learningcontentservice.model.Topic;
import com.rin.learningcontentservice.repository.TopicRepository;
import com.rin.learningcontentservice.utils.TextUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TopicService {
    private final TopicRepository topicRepository;
    private final TopicMapper topicMapper;
    private final TextUtils textUtils;

    public TopicResponse addTopic(AddEditTopicRequest topicRequest) {
        String slug = textUtils.toSlug(topicRequest.getName());
        if(topicRepository.findBySlug(slug).isPresent()) {
            throw new BaseException(LearningContentErrorCode.LESSON_WITH_NAME_EXISTS,
                    LearningContentErrorCode.LESSON_WITH_NAME_EXISTS.formatMessage(topicRequest.getName()));
        }
        Topic newTopic = topicMapper.toTopic(topicRequest);
        newTopic.setSlug(slug);

        topicRepository.save(newTopic);

        return topicMapper.toTopicResponse(newTopic);
    }

    public List<TopicResponse> getAdminTopics() {
        return topicRepository.findAdminTopics();
    }

    public List<TopicMinimalResponse> getTopicMinimals() {
        return topicRepository.findTopicMinimals();
    }

    public void deleteTopicBySlug(String slug) {
        topicRepository.deleteBySlug(slug);
    }

    public TopicResponse editTopic(String slug, AddEditTopicRequest topicRequest) {
        Topic existingTopic = topicRepository.findBySlug(slug)
                .orElseThrow(() -> new BaseException(LearningContentErrorCode.LESSON_NOT_FOUND,
                        LearningContentErrorCode.LESSON_NOT_FOUND.formatMessage(slug)));

        String newSlug = textUtils.toSlug(topicRequest.getName());
        if(!newSlug.equals(slug) && topicRepository.findBySlug(newSlug).isPresent()) {
            throw new BaseException(LearningContentErrorCode.LESSON_WITH_NAME_EXISTS,
                    LearningContentErrorCode.LESSON_WITH_NAME_EXISTS.formatMessage(topicRequest.getName()));
        }

        existingTopic.setName(topicRequest.getName());
        existingTopic.setDescription(topicRequest.getDescription());
        existingTopic.setIsActive(topicRequest.getIsActive());
        existingTopic.setColor(topicRequest.getColor());
        existingTopic.setSlug(newSlug);

        topicRepository.save(existingTopic);

        return topicMapper.toTopicResponse(existingTopic);
    }

}
