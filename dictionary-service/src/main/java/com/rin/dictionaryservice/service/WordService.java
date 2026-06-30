package com.rin.dictionaryservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rin.dictionaryservice.dto.*;
import com.rin.dictionaryservice.mapper.DictionaryMapper;
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
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;


import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

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

    private static final Map<String, List<String>> POS_ALIASES = Map.ofEntries(
            Map.entry("NOUN", List.of("n", "nn", "nns", "noun")),
            Map.entry("PROPN", List.of("nnp", "nnps", "propn", "proper_noun", "proper noun", "name")),

            Map.entry("VERB", List.of("v", "vb", "vbd", "vbg", "vbn", "vbp", "vbz", "verb")),
            Map.entry("AUX", List.of("md", "aux", "auxiliary", "modal", "helping verb")),

            Map.entry("ADJ", List.of("a", "jj", "jjr", "jjs", "adj", "adjective")),
            Map.entry("ADV", List.of("r", "rb", "rbr", "rbs", "wrb", "adv", "adverb")),

            Map.entry("PRON", List.of("prp", "prp$", "wp", "wp$", "pron", "pronoun")),
            Map.entry("DET", List.of("dt", "pdt", "wdt", "det", "determiner", "article")),

            Map.entry("ADP", List.of("in", "adp", "prep", "preposition")),
            Map.entry("CCONJ", List.of("cc", "conj", "cconj", "conjunction", "coordinating conjunction")),
            Map.entry("SCONJ", List.of("sconj", "subordinating conjunction")),

            Map.entry("NUM", List.of("cd", "num", "numeral", "number")),
            Map.entry("PART", List.of("pos", "rp", "to", "part", "particle")),
            Map.entry("INTJ", List.of("uh", "int", "intj", "interjection")),

            Map.entry("PUNCT", List.of("punct", "punctuation")),
            Map.entry("SYM", List.of("sym", "symbol")),

            Map.entry("PHRASE", List.of("phrase", "phr")),
            Map.entry("PHRASAL_VERB", List.of("phrasal_verb", "phrasalverb", "phr_v")),
            Map.entry("COLLOCATION", List.of("collocation", "colloc")),
            Map.entry("IDIOM", List.of("idiom", "idiomatic_expression")),
            Map.entry("FIXED_EXPRESSION", List.of("fixed_expression", "fixed_phrase")),

            Map.entry("OTHER", List.of("x", "fw", "unknown", "other"))
    );
    private String normalizePos(String pos) {
        if (pos == null || pos.isBlank()) return null;

        String normalized = pos.trim()
                .toUpperCase()
                .replace("-", "_")
                .replace(" ", "_");

        if (POS_ALIASES.containsKey(normalized)) {
            return normalized;
        }

        for (Map.Entry<String, List<String>> entry : POS_ALIASES.entrySet()) {
            boolean matched = entry.getValue().stream()
                    .anyMatch(alias -> alias.equalsIgnoreCase(pos.trim())
                            || alias.replace(" ", "_").equalsIgnoreCase(normalized));

            if (matched) {
                return entry.getKey();
            }
        }

        return normalized;
    }

    private String fuzzyMatchPos(String apiPos, String targetPos) {
        if (apiPos == null || targetPos == null) return null;

        String canonicalTarget = normalizePos(targetPos);
        String apiPosLower = apiPos.trim().toLowerCase();

        if (canonicalTarget == null) return null;

        List<String> aliases = POS_ALIASES.getOrDefault(canonicalTarget, List.of());

        if (canonicalTarget.equalsIgnoreCase(apiPos)
                || aliases.stream().anyMatch(alias -> alias.equalsIgnoreCase(apiPosLower))) {
            return canonicalTarget;
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
        if (!isValidWord(wordSoft)) {
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
    private boolean isValidWord(String text) {
        if (text == null) return false;

        String value = text.trim();
        if (value.isEmpty()) return false;

        String lower = value.toLowerCase();

        // Chặn URL/email
        if (lower.contains("@")
                || lower.startsWith("http://")
                || lower.startsWith("https://")
                || lower.startsWith("www.")
                || lower.contains(".com")
                || lower.contains(".vn")
                || lower.contains(".net")
                || lower.contains(".org")) {
            return false;
        }

        // Chặn token quá dài bất thường
        if (value.length() > 40) return false;

        // Chặn rỗng / quá ngắn, nhưng cho phép I, a
        if (value.length() < 2
                && !"I".equals(value)
                && !"a".equalsIgnoreCase(value)) {
            return false;
        }

        // Chặn có khoảng trắng vì flow này là click 1 từ đơn trong lesson
        if (value.matches(".*\\s+.*")) return false;

        // Chặn toàn số
        if (value.matches("^\\d+$")) return false;

        // Chặn số + ký hiệu spam rõ ràng: 50%, $20, 12/10, 7:30
        if (value.matches(".*\\d.*") && value.matches(".*[%$€£¥₫/,:].*")) {
            return false;
        }

        // Chặn token toàn punctuation/ký tự đặc biệt
        if (!value.matches(".*\\p{L}.*")) return false;

        // Chặn ký tự nguy hiểm/rác
        if (value.matches(".*[<>\\[\\]{}()=+*_#~`|\\\\].*")) return false;

        // Cho phép chữ Unicode, apostrophe, dấu nháy cong, hyphen.
        // Ví dụ: Every, week, don't, don’t, teacher's, well-known, café, résumé.
        return value.matches("(?iu)^\\p{L}+(?:['’\\-]\\p{L}+)*$");
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
