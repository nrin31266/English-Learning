package com.rin.dictionaryservice.repository;

import com.rin.dictionaryservice.model.VocabWordEntry;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface VocabWordEntryRepository extends MongoRepository<VocabWordEntry, String> {
    List<VocabWordEntry> findAllBySubtopicIdOrderByOrder(String subtopicId);
    List<VocabWordEntry> findAllByTopicId(String topicId);
    Optional<VocabWordEntry> findByTopicIdAndWordKeyAndPos(String topicId, String wordKey, String pos);
    List<VocabWordEntry> findAllByWordKeyAndPos(String wordKey, String pos);
    long countBySubtopicIdAndWordReadyTrue(String subtopicId);
    boolean existsByTopicIdAndWordKeyAndPos(String topicId, String wordKey, String pos);
}
