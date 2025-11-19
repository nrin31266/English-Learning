package com.rin.dictionaryservice.repository;

import com.rin.dictionaryservice.model.DictionaryWord;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface DictionaryWordRepository extends MongoRepository<DictionaryWord, Long> {
    // Check list word [hello, hi, banana]


//    @Query("SELECT dw.word FROM DictionaryWord dw WHERE LOWER(dw.word) IN :words")
//    List<String> findExistingWords(List<String> words);


}
