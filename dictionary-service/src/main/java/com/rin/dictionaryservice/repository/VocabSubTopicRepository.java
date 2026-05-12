package com.rin.dictionaryservice.repository;

import com.rin.dictionaryservice.constant.VocabSubTopicStatus;
import com.rin.dictionaryservice.model.VocabSubTopic;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface VocabSubTopicRepository extends MongoRepository<VocabSubTopic, String> {
    List<VocabSubTopic> findAllByTopicIdOrderByOrder(String topicId);
    long countByTopicIdAndStatus(String topicId, VocabSubTopicStatus status);
    long countByTopicId(String topicId);
    void deleteByTopicId(String topicId);
}
