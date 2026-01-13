package com.rin.dictionaryservice.service;

import com.rin.dictionaryservice.model.DictionaryWord;
import com.rin.dictionaryservice.repository.DictionaryWordRepository;
import com.rin.dictionaryservice.utils.TextUtils;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@FieldDefaults(makeFinal = true, level = lombok.AccessLevel.PRIVATE)
@RequiredArgsConstructor
public class DictionaryWordService {
    DictionaryWordRepository dictionaryWordRepository;
    RedisTemplate <String, String> redisQueueTemplate;
    RedisTemplate <String, Boolean> redisEnableTemplate;
    private static final String QUEUE = "queue:vocab";
    private static final String PROC  = "processing:vocab";
    private static final String ENABLE = "enable_vocab_queue";
    TextUtils textUtils;

    @PostConstruct
    public void init(){
        // Initialize enable flag if not present
        Boolean enabled = redisEnableTemplate.opsForValue().get(ENABLE);
        if(enabled == null){
            redisEnableTemplate.opsForValue().set(ENABLE, false);
        }
    }

    @Cacheable(value = "dictionaryWordsByWordKey", key = "#wordKeys", unless = "#result == null")
    public DictionaryWord addOrGetWord(String wordKey) {
        String w = textUtils.normalizeWordLower(wordKey);
        Optional<DictionaryWord> existing = dictionaryWordRepository.findById(w);
        if (existing.isPresent()) {
            return existing.get();
        } else {
            Long idx = redisQueueTemplate.opsForList().indexOf(QUEUE, w);
            if (idx == null || idx == -1) {
                redisQueueTemplate.opsForList().leftPush(QUEUE, w);
                System.out.println("Not present in DB, added to queue: " + w);
            }else{
                System.out.println("Not present in DB, already in queue at index " + idx + ": " + w);
            }
            return null;
        }
    }

    public void pauseQueue(){
        redisEnableTemplate.opsForValue().set(ENABLE, false);
        // AIS will check this flag
    }
    public void resumeQueue(){
        redisEnableTemplate.opsForValue().set(ENABLE, true);
        // Need to send 1 event = kafka to wake up AIS worker
        // TODO later

    }

    public List<DictionaryWord> getRecentlyAddedWords(int limit){
        return dictionaryWordRepository.findRecentlyAddedWords(limit);
    }

    public Map<String, Object> queueView(int limit){
        List<String> queued = redisQueueTemplate.opsForList().range(QUEUE, 0, limit - 1);
        if (queued == null) queued = List.of();
// Collections.reverse(queued);
        List<String> processing = redisQueueTemplate.opsForList().range(PROC, 0, limit - 1);
        if (processing == null) processing = List.of();
// Collections.reverse(processing);
        Long queuedSize = redisQueueTemplate.opsForList().size(QUEUE);
        Long processingSize = redisQueueTemplate.opsForList().size(PROC);

        Boolean enabled = redisEnableTemplate.opsForValue().get(ENABLE);

        return Map.of(
                "queued", queued,
                "processing", processing,
                "queuedSize", queuedSize == null ? 0L : queuedSize,
                "processingSize", processingSize == null ? 0L : processingSize,
                "enabled", enabled != null && enabled,
                "recentlyAddedWords", getRecentlyAddedWords(10)
        );
    }


}
