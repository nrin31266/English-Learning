package com.rin.dictionaryservice.repository;


import org.springframework.data.mongodb.repository.MongoRepository;

import com.rin.dictionaryservice.model.VocabTag;

import java.util.List;

public interface VocabTagRepository extends MongoRepository<VocabTag, String> {

    List<VocabTag> findByIsActiveTrueOrderBySortOrderAsc();

}
