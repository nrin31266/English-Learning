package com.rin.dictionaryservice.mapper;

import com.rin.dictionaryservice.model.Word;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface WordMapper {
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    Word toWord(@MappingTarget Word existingWord, Word updatedWord);
}
