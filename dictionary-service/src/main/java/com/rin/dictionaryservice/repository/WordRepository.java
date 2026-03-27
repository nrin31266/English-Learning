package com.rin.dictionaryservice.repository;

import com.rin.dictionaryservice.model.Word;


import org.springframework.data.mongodb.repository.MongoRepository;

public interface WordRepository extends MongoRepository<Word, String> {

}
