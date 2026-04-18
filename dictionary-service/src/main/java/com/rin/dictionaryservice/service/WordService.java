package com.rin.dictionaryservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rin.dictionaryservice.dto.*;
import com.rin.dictionaryservice.exception.DictionaryErrorCode;
import com.rin.dictionaryservice.mapper.DictionaryMapper;
import com.rin.dictionaryservice.model.CefrLevel;
import com.rin.dictionaryservice.model.Word;
import com.rin.dictionaryservice.constant.WordCreationStatus;
import com.rin.dictionaryservice.repository.WordRepository;
import com.rin.dictionaryservice.repository.httpclient.DictionaryApiClient;
import com.rin.dictionaryservice.utils.TextUtils;
import com.rin.englishlearning.common.exception.BaseErrorCode;
import com.rin.englishlearning.common.exception.BaseException;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.scheduling.annotation.Scheduled;
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
    private static final int MAX_RETRY = 5;
    ObjectMapper objectMapper;
    DictionaryApiClient dictionaryApiClient;
    private static final Map<String, String> SPACY_TO_API_POS = Map.of(
            "VERB", "verb",
            "NOUN", "noun",
            "ADJ", "adjective",
            "ADV", "adverb"
    );

    private String normalizePos(String pos) {
        if (pos == null) return null;
        return SPACY_TO_API_POS.getOrDefault(pos.toUpperCase(), pos.toLowerCase());
    }

    private DictionaryApiResponse extractDictionaryApiResponseByPos(
            List<DictionaryApiResponse> responses,
            String targetPos  // spaCy POS (VERB, NOUN, ADJ...)
    ) {
        if (responses == null || targetPos == null) return null;

        String apiTargetPos = normalizePos(targetPos);

        for (DictionaryApiResponse response : responses) {
            if (response.getMeanings() == null || response.getMeanings().isEmpty()) continue;

            List<DictionaryApiResponse.Meaning> filteredMeanings = response.getMeanings().stream()
                    .filter(meaning -> {
                        String apiPos = meaning.getPartOfSpeech();
                        return apiPos != null && apiPos.equalsIgnoreCase(apiTargetPos);
                    })
                    .toList();

            if (!filteredMeanings.isEmpty()) {
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



    @Cacheable(
            value = "wordsByWordKey",
            key = "#key + '_' + #request.posTag",
            unless = "#result == null || #result.status != T(com.rin.dictionaryservice.dto.WordResponseStatus).READY"
    )
    public WordResponse addOrGetWord(
            String key ,
            WordSearchRequest request

    ) {
        String wordSoft = TextUtils.normalizeWordSoft(request.getText());
        if (!isValidWord(wordSoft, request.getPosTag(), request.getEntityType())) {
            throw new BaseException(BaseErrorCode.INVALID_REQUEST, "Invalid word: " + request.getText());
        }

        // 1. Check DB
        Word existingWord = wordRepository
                .findByKeyAndPos(key, request.getPosTag())
                .orElse(null);

        // ===================== READY =====================
        if (existingWord != null && existingWord.getStatus() == WordCreationStatus.READY) {
            return dictionaryMapper.toWordResponse(existingWord);
        }

        // ===================== FAILED =====================
        if (existingWord != null && existingWord.getStatus() == WordCreationStatus.FAILED) {
            return WordResponse.builder()
                    .word(wordSoft)
                    .pos(request.getPosTag())
                    .status(WordResponseStatus.FAILED)
                    .entityType(request.getEntityType())
                    .lemma(request.getLemma())
                    .isPlaceholder(true)
                    .message("Word processing failed. Please try again later.")
                    .definitions(List.of())
                    .build();
        }

        // ===================== CREATE PENDING =====================
        if (existingWord == null) {
            Word newWord = Word.builder()
                    .text(wordSoft)
                    .key(key)
                    .entityType(request.getEntityType())
                    .pos(request.getPosTag())
                    .lemma(request.getLemma())
                    .context(request.getContext())
                    .status(WordCreationStatus.PENDING)
                    .retryCount(0)
                    .build();

            wordRepository.save(newWord);
        }

        // ===================== FALLBACK =====================
        if (Boolean.TRUE.equals(request.getIsFallback())) {
            return fetchFallbackResponse(wordSoft, request.getPosTag(), request.getEntityType(), request.getLemma());
        }

        // ===================== PROCESSING =====================
        return WordResponse.builder()
                .word(wordSoft)
                .pos(request.getPosTag())
                .entityType(request.getEntityType())
                .lemma(request.getLemma())
                .status(WordResponseStatus.PROCESSING)
                .isPlaceholder(true)
                .message("Word is being processed. Please check back later for high-quality data.")
                .definitions(List.of())
                .build();
    }

    private WordResponse fetchFallbackResponse(String text, String pos, String entityType,  String lemma) {
        try {
            List<DictionaryApiResponse> apiResponses = dictionaryApiClient.getWord(text);
            DictionaryApiResponse apiResponse = extractDictionaryApiResponseByPos(apiResponses, pos);

            if (apiResponse != null) {
                WordResponse response = dictionaryMapper.toWordResponse(apiResponse);
                response.setStatus(WordResponseStatus.FALLBACK);
                response.setIsPlaceholder(true);
                response.setMessage("Word is being processed. High-quality data will be available soon.");
                return response;
            }
        } catch (Exception e) {
            log.error("Dictionary API error for word: {}", text, e);
        }

        return WordResponse.builder()
                .word(text)
                .pos(pos)
                .status(WordResponseStatus.FALLBACK)
                .entityType(entityType)
                .lemma(lemma)
                .isPlaceholder(true)
                .message("Word is queued for processing but no fallback data available.")
                .definitions(List.of())
                .build();
    }


    // ent_type: ('CARDINAL', 'DATE', 'EVENT', 'FAC', 'GPE', 'LANGUAGE',
    // 'LAW', 'LOC', 'MONEY', 'NORP', 'ORDINAL', 'ORG',
    // 'PERCENT', 'PERSON', 'PRODUCT', 'QUANTITY',
    // 'TIME', 'WORK_OF_ART')
    private boolean isValidWord(String text, String pos, String entType) {


        // số
        if (text.matches("\\d+")) return false;

        // link/email
        if (text.contains("@") || text.contains("http") || text.contains("www")) return false;

        // ký tự
        if (!text.matches("^[a-zA-Z]+([-''][a-zA-Z]+)*$")) return false;

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
    public Word claimOne(String workerId) {

        Query query = new Query(
                Criteria.where("status").is(WordCreationStatus.PENDING)
                        .and("retryCount").lt(MAX_RETRY)
        );

        // FIFO theo createdAt
        query.with(Sort.by(Sort.Direction.ASC, "createdAt"));

        Update update = new Update()
                .set("status", WordCreationStatus.PROCESSING)
                .set("processingStartedAt", LocalDateTime.now())
                .set("lockedBy", workerId)
                .inc("retryCount", 1);

        return mongoTemplate.findAndModify(
                query,
                update,
                FindAndModifyOptions.options().returnNew(true),
                Word.class
        );
    }
    public List<Word> claimBatch(int limit, String workerId) {
        List<Word> results = new ArrayList<>();

        for (int i = 0; i < limit; i++) {
            Word word = claimOne(workerId);
            if (word == null) break;
            results.add(word);
        }

        return results;
    }
    @CacheEvict(value = "wordsByWordKey", key = "#textLower + '_' + #pos")
    public void updateWordToReady(String textLower, String pos,
                                  String summaryVi,
                                  Word.Phonetics phonetics,
                                  CefrLevel cefrLevel, // CEFR level (A1, A2, B1, B2, C1, C2)
                                  List<Word.Definition> definitions) {
        Query query = new Query(
                Criteria.where("key").is(textLower)
                        .and("pos").is(pos)
        );

        Update update = new Update()
                .set("summaryVi", summaryVi)
                .set("cefrLevel", cefrLevel)
                .set("phonetics", phonetics)
                .set("definitions", definitions)
                .set("status", WordCreationStatus.READY)
                .set("lockedBy", null)
                .set("updatedAt", LocalDateTime.now());

        mongoTemplate.updateFirst(query, update, Word.class);
    }
    public void markFail(String textLower, String pos) {
        Query query = new Query(
                Criteria.where("key").is(textLower)
                        .and("pos").is(pos)
        );
        Word word = mongoTemplate.findOne(query, Word.class);

        if (word == null) return;

        int retry = word.getRetryCount() != null ? word.getRetryCount() : 0;

        Update update = new Update()
                .set("lastRetryAt", LocalDateTime.now())
                .set("lockedBy", null);

        if (retry >= MAX_RETRY) {
            update.set("status", WordCreationStatus.FAILED);
            log.info("Word {}_{} marked as FAILED (retry count {})", textLower, pos, retry);
        } else {
            update.set("status", WordCreationStatus.PENDING);
        }

        mongoTemplate.updateFirst(query, update, Word.class);
    }

    public void markFailImmediately(String textLower, String pos) {
        Query query = new Query(
                Criteria.where("key").is(textLower)
                        .and("pos").is(pos)
        );

        Update update = new Update()
                .set("status", WordCreationStatus.FAILED)
                .set("lockedBy", null)
                .set("updatedAt", LocalDateTime.now());

        mongoTemplate.updateFirst(query, update, Word.class);
        log.info("Word {}_{} marked as FAILED (invalid)", textLower, pos);
    }

    @Scheduled(fixedDelay = 60000)
    public void recoverStuckJobs() {

        Query query = new Query(
                Criteria.where("status").is(WordCreationStatus.PROCESSING)
                        .and("processingStartedAt")
                        .lt(LocalDateTime.now().minusMinutes(10))
        );

        Update update = new Update()
                .set("lockedBy", null)
                .set("lastRetryAt", LocalDateTime.now());

        // nếu retry >= 5 → FAILED
        // else → PENDING

        List<Word> stuckJobs = mongoTemplate.find(query, Word.class);

        for (Word word : stuckJobs) {
            Update u = new Update()
                    .set("lockedBy", null)
                    .set("lastRetryAt", LocalDateTime.now());

            if (word.getRetryCount() >= MAX_RETRY) {
                u.set("status", WordCreationStatus.FAILED);
            } else {
                u.set("status", WordCreationStatus.PENDING);
            }

            mongoTemplate.updateFirst(
                    Query.query(Criteria.where("id").is(word.getId())),
                    u,
                    Word.class
            );
        }
    }





}
