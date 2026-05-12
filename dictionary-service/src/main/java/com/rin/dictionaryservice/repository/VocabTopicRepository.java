package com.rin.dictionaryservice.repository;

import com.rin.dictionaryservice.constant.VocabTopicStatus;
import com.rin.dictionaryservice.model.VocabTopic;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface VocabTopicRepository extends MongoRepository<VocabTopic, String> {
    List<VocabTopic> findAllByStatusOrderByCreatedAtDesc(VocabTopicStatus status);
    List<VocabTopic> findAllByTagsContainingOrderByCreatedAtDesc(String tag);
}
