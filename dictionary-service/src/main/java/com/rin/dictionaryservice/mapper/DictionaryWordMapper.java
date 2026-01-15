package com.rin.dictionaryservice.mapper;

import com.rin.dictionaryservice.model.DictionaryWord;
import com.rin.englishlearning.common.event.WordAnalyzedEvent;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface DictionaryWordMapper {
    DictionaryWord toDictionaryWord(WordAnalyzedEvent event);
    void updateDictionaryWordFromEvent(WordAnalyzedEvent event, @MappingTarget DictionaryWord dictionaryWord);
}
