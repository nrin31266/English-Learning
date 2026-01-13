package com.rin.dictionaryservice.controller.internal;

import com.rin.dictionaryservice.kafka.KafkaProducer;
import com.rin.dictionaryservice.repository.DictionaryWordRepository;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/internal/dictionary-words")
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class DictionaryWordController {
    DictionaryWordRepository dictionaryWordRepository;
    KafkaProducer kafkaProducer;

    @PostMapping("/result")
    public ResponseEntity<Void> saveDictionaryWordResult(@RequestBody Object aiResponse) {
        // TODO: Implement saving logic
        return ResponseEntity.ok().build();
    }

}
