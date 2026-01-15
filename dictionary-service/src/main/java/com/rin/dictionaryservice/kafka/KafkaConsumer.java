package com.rin.dictionaryservice.kafka;

import com.rin.dictionaryservice.mapper.DictionaryWordMapper;
import com.rin.dictionaryservice.model.DictionaryWord;
import com.rin.dictionaryservice.repository.DictionaryWordRepository;
import com.rin.englishlearning.common.constants.KafkaTopics;
import com.rin.englishlearning.common.event.WordAnalyzedEvent;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class KafkaConsumer {
    DictionaryWordRepository dictionaryWordRepository;
    DictionaryWordMapper dictionaryWordMapper;
    private final CacheManager cacheManager;

    private void evictWordCache(String wordId) {
        var cache = cacheManager.getCache("dictionaryWordsByWordKey");
        if (cache != null) cache.evict(wordId);
    }
    // word analyzed
    @KafkaListener(
            topics = KafkaTopics.WORD_ANALYZED_TOPIC,
            containerFactory = "wordAnalyzedEventKafkaListenerContainerFactory"
    )
    public void handleWordAnalyzedEvent(WordAnalyzedEvent event) {
        System.out.println("📥 Nhận WordAnalyzedEvent: " + event);
        DictionaryWord existing = dictionaryWordRepository.findById(event.getWord()).orElse(null);
        if(existing != null){
            // update
            log.info("✅ Updated word: {}", existing.getId());
            dictionaryWordMapper.updateDictionaryWordFromEvent(event, existing);
            dictionaryWordRepository.save(existing);
            evictWordCache(existing.getId());

            return;
        }
        DictionaryWord dictionaryWord = dictionaryWordMapper.toDictionaryWord(event);
        dictionaryWord.setId(event.getWord());
        dictionaryWordRepository.insert(dictionaryWord);
        log.info("✅ Saved word: {}", dictionaryWord.getId());
        // publish notification

    }
}
