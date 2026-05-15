package com.rin.dictionaryservice.repository;

import com.rin.dictionaryservice.model.VocabProgress;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface VocabProgressRepository extends MongoRepository<VocabProgress, String> {
    Optional<VocabProgress> findByUserIdAndWordEntryId(String userId, String wordEntryId);
    List<VocabProgress> findByUserIdAndTopicId(String userId, String topicId);
    List<VocabProgress> findByUserIdAndSubtopicId(String userId, String subtopicId);
}
