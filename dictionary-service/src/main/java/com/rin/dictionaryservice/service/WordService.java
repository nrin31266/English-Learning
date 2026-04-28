package com.rin.dictionaryservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rin.dictionaryservice.dto.*;
import com.rin.dictionaryservice.mapper.DictionaryMapper;
import com.rin.dictionaryservice.model.CefrLevel;
import com.rin.dictionaryservice.model.Word;
import com.rin.dictionaryservice.constant.WordCreationStatus;
import com.rin.dictionaryservice.repository.WordRepository;
import com.rin.dictionaryservice.repository.httpclient.DictionaryApiClient;
import com.rin.dictionaryservice.utils.TextUtils;
import com.rin.englishlearning.common.exception.BaseErrorCode;
import com.rin.englishlearning.common.exception.BaseException;
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

    private static final Map<String, List<String>> SPACY_TO_API_POS = Map.ofEntries(
            Map.entry("VERB", List.of("verb", "v")),
            Map.entry("NOUN", List.of("noun", "n")),
            Map.entry("ADJ", List.of("adjective", "adj", "a")),
            Map.entry("ADV", List.of("adverb", "adv")),
            Map.entry("PRON", List.of("pronoun", "pron")),
            Map.entry("PREP", List.of("preposition", "prep")),
            Map.entry("CONJ", List.of("conjunction", "conj")),
            Map.entry("DET", List.of("determiner", "det", "article")),
            Map.entry("NUM", List.of("numeral", "num", "number")),
            Map.entry("INTJ", List.of("interjection", "int")),
            Map.entry("AUX", List.of("auxiliary", "aux", "helping verb")),
            Map.entry("PART", List.of("particle", "part")),
            Map.entry("SCONJ", List.of("subordinating conjunction", "sconj")),
            Map.entry("CCONJ", List.of("coordinating conjunction", "cconj")),
            Map.entry("PROPN", List.of("proper noun", "propn", "name"))
    );

    private String normalizePos(String pos) {
        if (pos == null) return null;

        String upperPos = pos.toUpperCase();

        // Kiểm tra nếu có mapping
        if (SPACY_TO_API_POS.containsKey(upperPos)) {
            // Ưu tiên trả về mapping đầu tiên (thông dụng nhất)
            return SPACY_TO_API_POS.get(upperPos).get(0);
        }

        // Fallback: trả về lowercase
        return pos.toLowerCase();
    }

    // Hỗ trợ fuzzy matching (cho trường hợp dictionary API trả về POS hơi khác)
    private String fuzzyMatchPos(String apiPos, String targetPos) {
        if (apiPos == null || targetPos == null) return null;

        String apiPosLower = apiPos.toLowerCase();
        String targetPosNormalized = normalizePos(targetPos);

        // Exact match
        if (apiPosLower.equals(targetPosNormalized)) {
            return targetPosNormalized;
        }

        // Check nếu apiPos nằm trong danh sách mapping của targetPos
        String upperTarget = targetPos.toUpperCase();
        if (SPACY_TO_API_POS.containsKey(upperTarget)) {
            List<String> allowedApiPos = SPACY_TO_API_POS.get(upperTarget);
            if (allowedApiPos.contains(apiPosLower)) {
                return apiPosLower;
            }
        }

        return null;
    }

    private DictionaryApiResponse extractDictionaryApiResponseByPos(
            List<DictionaryApiResponse> responses,
            String targetPos
    ) {
        if (responses == null || targetPos == null) return null;

        String normalizedTargetPos = normalizePos(targetPos);

        for (DictionaryApiResponse response : responses) {
            if (response.getMeanings() == null || response.getMeanings().isEmpty()) continue;

            // Priority 1: Exact match theo meaning
            List<DictionaryApiResponse.Meaning> exactMatchMeanings = response.getMeanings().stream()
                    .filter(meaning -> {
                        String apiPos = meaning.getPartOfSpeech();
                        return apiPos != null && apiPos.equalsIgnoreCase(normalizedTargetPos);
                    })
                    .toList();

            if (!exactMatchMeanings.isEmpty()) {
                return buildResponseWithMeanings(response, exactMatchMeanings);
            }

            // Priority 2: Fuzzy match (nếu có sự khác biệt nhỏ về POS)
            List<DictionaryApiResponse.Meaning> fuzzyMatchMeanings = response.getMeanings().stream()
                    .filter(meaning -> {
                        String apiPos = meaning.getPartOfSpeech();
                        return fuzzyMatchPos(apiPos, targetPos) != null;
                    })
                    .toList();

            if (!fuzzyMatchMeanings.isEmpty()) {
                log.debug("Using fuzzy match for POS: {} -> {}", targetPos, fuzzyMatchMeanings.get(0).getPartOfSpeech());
                return buildResponseWithMeanings(response, fuzzyMatchMeanings);
            }
        }

        // Priority 3: Fallback - lấy meaning đầu tiên hoặc bất kỳ
        for (DictionaryApiResponse response : responses) {
            if (response.getMeanings() != null && !response.getMeanings().isEmpty()) {
                log.warn("No POS match found for '{}', using first meaning as fallback", targetPos);
                return buildResponseWithMeanings(response, response.getMeanings());
            }
        }

        return null;
    }

    private DictionaryApiResponse buildResponseWithMeanings(
            DictionaryApiResponse original,
            List<DictionaryApiResponse.Meaning> meanings
    ) {
        return DictionaryApiResponse.builder()
                .word(original.getWord())
                .phonetic(original.getPhonetic())
                .phonetics(original.getPhonetics())
                .meanings(meanings)
                .license(original.getLicense())
                .sourceUrls(original.getSourceUrls())
                .build();
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
        if (!isValidWord(wordSoft, request.getPosTag(), request.getEntityType())) {
            throw new BaseException(BaseErrorCode.INVALID_REQUEST, "Invalid word: " + request.getText());
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
