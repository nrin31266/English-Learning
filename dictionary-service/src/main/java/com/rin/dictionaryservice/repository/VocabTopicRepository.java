package com.rin.dictionaryservice.repository;

import com.rin.dictionaryservice.model.VocabTopic;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface VocabTopicRepository extends MongoRepository<VocabTopic, String> {
}
