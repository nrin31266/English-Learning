package com.rin.dictionaryservice.mapper;

import com.rin.dictionaryservice.dto.DictionaryApiResponse;
import com.rin.dictionaryservice.dto.WordResponse;
import com.rin.dictionaryservice.model.Word;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.List;

@Mapper(componentModel = "spring")
public interface DictionaryMapper {

    // =========================
    // API RESPONSE → WORD RESPONSE
    // =========================
    @Mapping(target = "word", source = "word")
    @Mapping(target = "phonetics", source = ".", qualifiedByName = "mapPhonetics")
    @Mapping(target = "definitions", source = ".", qualifiedByName = "mapDefinitionsByPos")
    @Mapping(target = "pos", source = ".", qualifiedByName = "extractPos")
    @Mapping(target = "isPlaceholder", constant = "false")
    @Mapping(target = "status", constant = "FALLBACK")
    @Mapping(target = "message", ignore = true)
    WordResponse toWordResponse(DictionaryApiResponse source);

    // =========================
    // WORD → WORD RESPONSE (dùng khi lấy từ DB)
    // =========================
    @Mapping(target = "word", source = "text")
    @Mapping(target = "pos", source = "pos")
    @Mapping(target = "phonetics", source = "phonetics")
    @Mapping(target = "definitions", source = "definitions")
    @Mapping(target = "isPlaceholder", constant = "false")
    @Mapping(target = "status", constant = "READY")
    @Mapping(target = "message", ignore = true)
    WordResponse toWordResponse(Word word);

    // =========================
    // PHONETICS (giữ nguyên)
    // =========================
    @Named("mapPhonetics")
    default WordResponse.PhoneticsDto mapPhonetics(DictionaryApiResponse source) {
        if (source.getPhonetics() == null) return null;

        String uk = null, ukAudio = null, us = null, usAudio = null;

        for (DictionaryApiResponse.Phonetic p : source.getPhonetics()) {
            if (p.getAudio() == null || p.getAudio().isEmpty()) continue;

            if (p.getAudio().contains("uk")) {
                uk = p.getText();
                ukAudio = p.getAudio();
            } else if (p.getAudio().contains("us")) {
                us = p.getText();
                usAudio = p.getAudio();
            }
        }

        return WordResponse.PhoneticsDto.builder()
                .uk(uk)
                .ukAudioUrl(ukAudio)
                .us(us)
                .usAudioUrl(usAudio)
                .build();
    }

    // =========================
    // EXTRACT POS
    // =========================
    @Named("extractPos")
    default String extractPos(DictionaryApiResponse source) {
        return source.getMeanings().stream()
                .findFirst()
                .map(DictionaryApiResponse.Meaning::getPartOfSpeech)
                .orElse("UNKNOWN");
    }

    // =========================
    // MAP DEFINITIONS
    // =========================
    @Named("mapDefinitionsByPos")
    default List<WordResponse.DefinitionDto> mapDefinitionsByPos(DictionaryApiResponse source) {
        if (source.getMeanings() == null || source.getMeanings().isEmpty()) {
            return List.of();
        }

        return source.getMeanings().stream()
                .flatMap(m -> m.getDefinitions().stream())
                .map(this::mapDefinition)
                .toList();
    }

    // =========================
    // MAP 1 DEFINITION
    // =========================
    @Named("mapDefinition")
    default WordResponse.DefinitionDto mapDefinition(DictionaryApiResponse.Definition d) {
        return WordResponse.DefinitionDto.builder()
                .definition(d.getDefinition())
                .example(d.getExample())
                .meaningVi(null)
                .build();
    }
}