package com.rin.dictionaryservice.repository;

import com.rin.dictionaryservice.model.UserVocabProgress;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserVocabProgressRepository extends MongoRepository<UserVocabProgress, String> {
    Optional<UserVocabProgress> findByUserIdAndSubtopicId(String userId, String subtopicId);
    java.util.List<UserVocabProgress> findAllByUserId(String userId);
}
