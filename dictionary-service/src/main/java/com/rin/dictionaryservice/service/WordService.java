package com.rin.dictionaryservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rin.dictionaryservice.dto.DictionaryApiResponse;
import com.rin.dictionaryservice.dto.SpaCyWordAnalysisDto;
import com.rin.dictionaryservice.dto.WordResponse;
import com.rin.dictionaryservice.mapper.DictionaryMapper;
import com.rin.dictionaryservice.model.Word;
import com.rin.dictionaryservice.constant.WordCreationStatus;
import com.rin.dictionaryservice.repository.WordRepository;
import com.rin.dictionaryservice.repository.httpclient.DictionaryApiClient;
import com.rin.englishlearning.common.exception.BaseErrorCode;
import com.rin.englishlearning.common.exception.BaseException;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;


import java.time.LocalDateTime;
import java.util.*;

@Service
@FieldDefaults(makeFinal = true, level = lombok.AccessLevel.PRIVATE)
@RequiredArgsConstructor
@Slf4j
public class WordService {
    WordRepository wordRepository;
    MongoTemplate mongoTemplate;
    DictionaryMapper dictionaryMapper;
    ObjectMapper objectMapper;
    DictionaryApiClient dictionaryApiClient;


    @PostConstruct
    public void init() {
    }

    private DictionaryApiResponse extractDictionaryApiResponseByPos(List<DictionaryApiResponse> responses, String targetPos) {
        if (responses == null || targetPos == null) return null;

        for (DictionaryApiResponse response : responses) {
            if (response.getMeanings() == null || response.getMeanings().isEmpty()) continue;

            // Lọc meanings chỉ giữ đúng pos cần
            List<DictionaryApiResponse.Meaning> filteredMeanings = response.getMeanings().stream()
                    .filter(meaning -> meaning.getPartOfSpeech().equalsIgnoreCase(targetPos))
                    .toList();

            if (!filteredMeanings.isEmpty()) {
                // Tạo bản sao với meanings đã lọc
                return DictionaryApiResponse.builder()
                        .word(response.getWord())
                        .phonetic(response.getPhonetic())
                        .phonetics(response.getPhonetics())
                        .meanings(filteredMeanings)
                        .license(response.getLicense())
                        .sourceUrls(response.getSourceUrls())
                        .build();
            }
        }
        return null;
    }



    @Cacheable(value = "wordsByWordKey", key = "#textLower + '_' + #analysis.pos",
            unless = "#result == null", condition = "#textLower != null && #analysis != null")
    public WordResponse addOrGetWord(String textLower, SpaCyWordAnalysisDto analysis, String context) {
        if (!isValidWord(analysis)) {
            throw new BaseException(BaseErrorCode.INVALID_REQUEST, "Invalid word for vocabulary: " + textLower);
        }

        // 1. Check word đã tồn tại trong DB chưa
        Word existingWord = wordRepository.findByTextAndPos(textLower, analysis.getPos()).orElse(null);
        if (existingWord != null && existingWord.getStatus() == WordCreationStatus.READY) {
            return dictionaryMapper.toWordResponse(existingWord);
        }

        // 2. Tạo mới word với status PENDING
        Word newWord = Word.builder()
                .pos(analysis.getPos())
                .text(textLower)
                .lemma(analysis.getLemma())
                .context(context)
                .status(WordCreationStatus.PENDING)
                .pendingStartedAt(LocalDateTime.now())
                .build();


        // Lưu vào DB với status PENDING
        wordRepository.save(newWord);

        // Tra tam ve bang api ben ngoai
        List<DictionaryApiResponse> dictionaryApiResponses = dictionaryApiClient.getWord(textLower);
        DictionaryApiResponse dictionaryApiResponse = extractDictionaryApiResponseByPos(dictionaryApiResponses, analysis.getPos());
        if (dictionaryApiResponse != null) {
            WordResponse wordResponse = dictionaryMapper.toWordResponse(dictionaryApiResponse);
            wordResponse.setIsPlaceholder(true);
            wordResponse.setMessage("Word is being processed. This is a placeholder response. Please check back later for the complete information.");
            return wordResponse;
        }

        // Không tìm thấy từ API → trả về response thông báo lỗi, không trả newWord
        return WordResponse.builder()
                .word(textLower)
                .pos(analysis.getPos())
                .isPlaceholder(true)
                .message("Cannot find word information from dictionary API")
                .definitions(List.of())
                .build();
    }

    // ent_type: ('CARDINAL', 'DATE', 'EVENT', 'FAC', 'GPE', 'LANGUAGE',
    // 'LAW', 'LOC', 'MONEY', 'NORP', 'ORDINAL', 'ORG',
    // 'PERCENT', 'PERSON', 'PRODUCT', 'QUANTITY',
    // 'TIME', 'WORK_OF_ART')
    private boolean isValidWord(SpaCyWordAnalysisDto analysisDto) {
        String text = analysisDto.getText();
        String pos = analysisDto.getPos();
        String entType = analysisDto.getEntType();

        // số
        if (text.matches("\\d+")) return false;

        // link/email
        if (text.contains("@") || text.contains("http") || text.contains("www")) return false;

        // ký tự
        if (!text.matches("^[a-zA-Z-]+$")) return false;

        // loại proper noun
        if ("PROPN".equals(pos)) return false;

        // chỉ chặn ent_type "rác"
        List<String> invalidEntTypes = Arrays.asList(
                "DATE", "TIME",
                "MONEY", "PERCENT", "QUANTITY"
        );

        if (invalidEntTypes.contains(entType)) return false;

        // độ dài
        if (text.length() < 2 && !"I".equals(text)) return false;

        return true;
    }


//    @CacheEvict(value = "wordsByWordKey", key = "#id")
//    public void saveWord(Word updatedWord, String id) {
//        Word existingWord = wordRepository.findById(id).orElseThrow(() -> new RuntimeException("Word not found with id: " + id));
//        wordMapper.toWord(existingWord, updatedWord);
//        existingWord.setStatus(WordCreationStatus.COMPLETED);
//        wordRepository.save(existingWord);
//        // publish kafka to update ui (in case user subscribe topic ws this word with status pending) OPTION
//
//    }


}
