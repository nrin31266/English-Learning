package com.rin.dictionaryservice.repository;

import com.rin.dictionaryservice.model.DictionaryWord;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

public interface DictionaryWordRepository extends MongoRepository<DictionaryWord, String> {

    default List<DictionaryWord> findRecentlyAddedWords(int limit) {
        return findAll(PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "createdAt"))).getContent();
    }


}
