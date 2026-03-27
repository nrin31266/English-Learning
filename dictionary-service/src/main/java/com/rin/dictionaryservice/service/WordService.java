package com.rin.dictionaryservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rin.dictionaryservice.dto.SpaCyWordAnalysisDto;
import com.rin.dictionaryservice.mapper.WordMapper;
import com.rin.dictionaryservice.model.Word;
import com.rin.dictionaryservice.model.sub.WordCreationStatus;
import com.rin.dictionaryservice.repository.WordRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;


import java.time.LocalDateTime;
import java.util.*;

@Service
@FieldDefaults(makeFinal = true, level = lombok.AccessLevel.PRIVATE)
@RequiredArgsConstructor
@Slf4j
public class WordService {
    WordRepository wordRepository;
    StringRedisTemplate redisQueueTemplate;
    private static final String QUEUE = "queue:vocab";
    MongoTemplate mongoTemplate;
    WordMapper wordMapper;
    ObjectMapper objectMapper;

    @PostConstruct
    public void init() {

    }

    @Cacheable(value = "wordsByWordKey", key = "#id", unless = "#result == null || #result.status != 'COMPLETED'")
    public Word addOrGetWord(String id, SpaCyWordAnalysisDto analysis) {
        if(!isValidWord(analysis)) {
            log.warn("Invalid word: {}", analysis);
            return null;
        }

        // 1. Check word đã tồn tại trong DB chưa
        Word existingWord = mongoTemplate.findById(id, Word.class);
        if (existingWord != null) {
            // Nếu đã COMPLETED → trả về cache
            if (existingWord.getStatus() == WordCreationStatus.COMPLETED) {
                return existingWord;
            }
            // Nếu đang PENDING → kiểm tra xem đã có trong queue chưa
            if (existingWord.getStatus() == WordCreationStatus.PENDING) {
                // Nếu chưa có trong queue thì push lại (có thể do queue bị mất message)
                if (!isWordInQueue(id)) {
                    pushToQueue(id, analysis.getLemma(), analysis.getPos(), analysis.getEntType());
                    log.info("Re-push word {} to queue (was pending but not in queue)", id);
                }
                return existingWord;
            }
        }

        // 2. Tạo mới word với status PENDING
        Query query = new Query(Criteria.where("_id").is(id));
        Update update = new Update()
                .setOnInsert("lemma", analysis.getLemma())
                .setOnInsert("pos", analysis.getPos())
                .setOnInsert("status", WordCreationStatus.PENDING)
                .setOnInsert("createdAt", LocalDateTime.now());

        var result = mongoTemplate.upsert(query, update, Word.class);

        // 3. Nếu là word mới (upsertedId != null) thì push vào queue
        if (result.getUpsertedId() != null) {
            pushToQueue(id, analysis.getLemma(), analysis.getPos(), analysis.getEntType());
        }

        return mongoTemplate.findById(id, Word.class);
    }
    private boolean isWordInQueue(String wordId) {
        try {
            // Lấy tất cả message trong queue
            List<String> queueMessages = redisQueueTemplate.opsForList().range(QUEUE, 0, -1);
            if (queueMessages == null || queueMessages.isEmpty()) {
                return false;
            }

            // Kiểm tra có message nào chứa wordId không
            return queueMessages.stream()
                    .anyMatch(msg -> msg.contains("\"id\":\"" + wordId + "\""));
        } catch (Exception e) {
            log.error("Error checking queue for word: {}", wordId, e);
            return false; // Nếu lỗi thì coi như chưa có để push lại
        }
    }

    // ent_type: ('CARDINAL', 'DATE', 'EVENT', 'FAC', 'GPE', 'LANGUAGE',
    // 'LAW', 'LOC', 'MONEY', 'NORP', 'ORDINAL', 'ORG',
    // 'PERCENT', 'PERSON', 'PRODUCT', 'QUANTITY',
    // 'TIME', 'WORK_OF_ART')
    private boolean isValidWord(SpaCyWordAnalysisDto analysisDto) {
        String text = analysisDto.getText();
        String pos = analysisDto.getPos();
        String entType = analysisDto.getEntType();

        // Số dạng không phải là từ vựng
        if (text.matches("\\d+")) {
            return false;
        }
        // Một số link hoặc email có thể bị phân tích sai thành từ vựng, nên loại bỏ
        if (text.contains("@") || text.contains("http") || text.contains("www")) {
            return false;
        }
        // Bỏ kí tự đặc biệt / emoji
        if (!text.matches("^[a-zA-Z-]+$")) {
            return false;
        }

        if ("PROPN".equals(pos)) {
            return false;
        }
        List<String> invalidEntTypes = Arrays.asList(
                "DATE", "TIME",
                "MONEY", "PERCENT", "QUANTITY",
                "PERSON", "ORG", "GPE", "LOC",
                "PRODUCT", "EVENT", "WORK_OF_ART"
        );
        if (invalidEntTypes.contains(entType)) {
            return false;
        }

        // Quá ngắn (trừ I)
        if (text.length() < 2 && !"I".equals(text)) return false;
        return true;
    }


    private void pushToQueue(String id, String lemma, String pos, String entType) {
        Map<String, String> wordData = new HashMap<>();
        wordData.put("id", id);
        wordData.put("lemma", lemma);
        wordData.put("pos", pos);
        wordData.put("entType", entType);

        try {
            // Thêm timestamp để debug
            wordData.put("timestamp", String.valueOf(System.currentTimeMillis()));
            String jsonMessage = objectMapper.writeValueAsString(wordData);
            redisQueueTemplate.opsForList().rightPush(QUEUE, jsonMessage);
            log.info("Pushed word {} to queue", id);
        } catch (Exception e) {
            log.error("Failed to push word {} to queue", id, e);
            // Không throw exception vì word đã được lưu trong DB với status PENDING
            // Worker sẽ không xử lý được word này, cần có monitoring để phát hiện
        }
    }




    @CacheEvict(value = "wordsByWordKey", key = "#id")
    public void saveWord(Word updatedWord, String id) {
        Word existingWord = wordRepository.findById(id).orElseThrow(() -> new RuntimeException("Word not found with id: " + id));
        wordMapper.toWord(existingWord, updatedWord);
        existingWord.setStatus(WordCreationStatus.COMPLETED);
        wordRepository.save(existingWord);
        // publish kafka to update ui (in case user subscribe topic ws this word with status pending) OPTION

    }


}
