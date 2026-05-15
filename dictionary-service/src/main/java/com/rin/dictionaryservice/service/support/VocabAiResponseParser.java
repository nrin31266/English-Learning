package com.rin.dictionaryservice.service.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rin.dictionaryservice.dto.AiGenerateResponse;
import com.rin.dictionaryservice.dto.ai.AiSingleMeaningPayload;
import com.rin.dictionaryservice.dto.ai.AiSubtopicsPayload;
import com.rin.dictionaryservice.dto.ai.AiWordsPayload;
import com.rin.dictionaryservice.exception.DictionaryErrorCode;
import com.rin.englishlearning.common.exception.BaseException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class VocabAiResponseParser {

    private final ObjectMapper objectMapper;

    public String serializeResult(AiGenerateResponse response) {
        try {
            return objectMapper.writeValueAsString(response.getResult());
        } catch (Exception e) {
            log.error("[VocabService] Failed to serialize AI result: {}", e.getMessage(), e);
            throw new BaseException(DictionaryErrorCode.AI_RESULT_SERIALIZATION_FAILED);
        }
    }

    public AiSubtopicsPayload parseSubtopicsPayload(String json) {
        try {
            AiSubtopicsPayload payload = objectMapper.readValue(json, AiSubtopicsPayload.class);
            if (payload == null) {
                throw new BaseException(DictionaryErrorCode.AI_SUBTOPIC_PARSE_FAILED);
            }
            return payload;
        } catch (BaseException e) {
            throw e;
        } catch (Exception e) {
            log.error("[VocabService] Failed to parse subtopics payload: {}", e.getMessage(), e);
            throw new BaseException(DictionaryErrorCode.AI_SUBTOPIC_PARSE_FAILED);
        }
    }

    public AiWordsPayload parseWordsPayload(String json) {
        try {
            AiWordsPayload payload = objectMapper.readValue(json, AiWordsPayload.class);
            if (payload == null) {
                throw new BaseException(DictionaryErrorCode.AI_WORD_LIST_PARSE_FAILED);
            }
            return payload;
        } catch (BaseException e) {
            throw e;
        } catch (Exception e) {
            log.error("[VocabService] Failed to parse words payload: {}", e.getMessage(), e);
            throw new BaseException(DictionaryErrorCode.AI_WORD_LIST_PARSE_FAILED);
        }
    }

    public AiSingleMeaningPayload parseSingleMeaningPayload(AiGenerateResponse response) {
        try {
            String json = serializeResult(response);
            AiSingleMeaningPayload payload = objectMapper.readValue(json, AiSingleMeaningPayload.class);
            if (payload == null) {
                throw new BaseException(DictionaryErrorCode.AI_SINGLE_MEANING_PARSE_FAILED);
            }
            return payload;
        } catch (BaseException e) {
            throw e;
        } catch (Exception e) {
            log.error("[VocabService] Failed to parse single meaning payload: {}", e.getMessage(), e);
            throw new BaseException(DictionaryErrorCode.AI_SINGLE_MEANING_PARSE_FAILED);
        }
    }
}
