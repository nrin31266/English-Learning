package com.rin.dictionaryservice.repository;

import com.rin.dictionaryservice.model.Word;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface WordRepository extends MongoRepository<Word, String> {

    // Tìm theo text + pos (unique)
    Optional<Word> findByKeyAndPos(String textLower, String pos);


}