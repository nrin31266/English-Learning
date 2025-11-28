package com.rin.learningcontentservice.mapper;

import com.rin.learningcontentservice.dto.request.AddEditTopicRequest;
import com.rin.learningcontentservice.dto.response.LTopicResponse;
import com.rin.learningcontentservice.dto.response.TopicResponse;
import com.rin.learningcontentservice.model.Topic;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface TopicMapper {
    TopicResponse toTopicResponse(Topic topic);
    Topic toTopic(AddEditTopicRequest topicRequest);
    LTopicResponse toLTopicResponse(Topic topic);
}
