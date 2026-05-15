package com.rin.dictionaryservice.service;

import com.rin.dictionaryservice.dto.progress.BatchProgressRequest;
import com.rin.dictionaryservice.model.VocabProgress;
import com.rin.dictionaryservice.repository.VocabProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VocabProgressService {

    private final VocabProgressRepository progressRepo;

    public void batchSync(String userId, BatchProgressRequest req) {
        if (req.getEntries() == null || req.getEntries().isEmpty()) return;

        List<VocabProgress> records = req.getEntries().stream().map(e -> {
            VocabProgress existing = progressRepo
                    .findByUserIdAndWordEntryId(userId, e.getWordEntryId())
                    .orElse(null);

            if (existing != null) {
                existing.setStatus(e.getStatus());
                existing.setCorrectCount(e.getCorrectCount());
                existing.setWrongCount(e.getWrongCount());
                existing.setLastReviewedAt(e.getLastReviewedAt());
                return existing;
            }

            return VocabProgress.builder()
                    .userId(userId)
                    .wordEntryId(e.getWordEntryId())
                    .subtopicId(e.getSubtopicId())
                    .topicId(req.getTopicId())
                    .status(e.getStatus())
                    .correctCount(e.getCorrectCount())
                    .wrongCount(e.getWrongCount())
                    .lastReviewedAt(e.getLastReviewedAt())
                    .build();
        }).collect(Collectors.toList());

        progressRepo.saveAll(records);
        log.info("[VocabProgress] Batch sync {} entries for user {}", records.size(), userId);
    }

    public List<VocabProgress> getTopicProgress(String userId, String topicId) {
        return progressRepo.findByUserIdAndTopicId(userId, topicId);
    }
}
