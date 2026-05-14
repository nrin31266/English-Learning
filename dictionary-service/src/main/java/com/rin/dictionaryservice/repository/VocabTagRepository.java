package com.rin.dictionaryservice.repository;


import org.springframework.data.mongodb.repository.MongoRepository;

import com.rin.dictionaryservice.model.VocabTag;

import java.util.List;
import java.util.Optional;

public interface VocabTagRepository extends MongoRepository<VocabTag, String> {

    List<VocabTag> findByIsActiveTrueOrderBySortOrderAsc();

}