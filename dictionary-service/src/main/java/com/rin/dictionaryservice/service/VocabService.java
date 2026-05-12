package com.rin.dictionaryservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rin.dictionaryservice.constant.VocabSubTopicStatus;
import com.rin.dictionaryservice.constant.VocabTopicStatus;
import com.rin.dictionaryservice.constant.WordCreationStatus;
import com.rin.dictionaryservice.dto.*;
import com.rin.dictionaryservice.dto.AiGenerateRequest;
import com.rin.dictionaryservice.kafka.KafkaProducer;
import com.rin.dictionaryservice.model.*;
import com.rin.dictionaryservice.repository.httpclient.LanguageProcessingClient;
import com.rin.dictionaryservice.repository.*;
import com.rin.englishlearning.common.constants.KafkaTopics;
import com.rin.englishlearning.common.event.VocabSubTopicReadyEvent;
import com.rin.englishlearning.common.event.VocabSubtopicsGeneratedEvent;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class VocabService {

    VocabTopicRepository topicRepo;
    VocabSubTopicRepository subtopicRepo;
    VocabWordEntryRepository wordEntryRepo;
    WordRepository wordRepository;
    LanguageProcessingClient lpsClient;
    KafkaProducer kafkaProducer;
    MongoTemplate mongoTemplate;
    @lombok.experimental.NonFinal
    @org.springframework.beans.factory.annotation.Value("${language-processing.worker-key}")
    String workerKey;
    ObjectMapper objectMapper = new ObjectMapper();


    // ─── TOPIC CRUD ──────────────────────────────────────────────────────────

    public VocabTopicResponse createTopic(CreateVocabTopicRequest req) {
        VocabTopic topic = VocabTopic.builder()
                .title(req.getTitle())
                .description(req.getDescription())
                .tags(req.getTags())
                .cefrRange(req.getCefrRange())
                .estimatedWordCount(req.getEstimatedWordCount())
                .thumbnailUrl(req.getThumbnailUrl())
                .build();
        topicRepo.save(topic);
        log.info("[VocabTopic] Created: {}", topic.getId());
        return toTopicResponse(topic);
    }

    public List<VocabTopicResponse> listTopics() {
        return topicRepo.findAll().stream().map(this::toTopicResponse).toList();
    }

    public VocabTopicResponse getTopic(String topicId) {
        return toTopicResponse(topicRepo.findById(topicId)
                .orElseThrow(() -> new RuntimeException("Topic not found: " + topicId)));
    }

    // ─── GENERATE SUBTOPICS ──────────────────────────────────────────────────

    public VocabTopicResponse acceptGenerateSubTopics(String topicId) {
        VocabTopic topic = topicRepo.findById(topicId)
                .orElseThrow(() -> new RuntimeException("Topic not found: " + topicId));
        if (topic.getSubtopicCount() > 0) {
            subtopicRepo.deleteByTopicId(topicId);
            topic.setSubtopicCount(0);
            topic.setReadySubtopicCount(0);
        }
        topic.setStatus(VocabTopicStatus.GENERATING_SUBTOPICS);
        topicRepo.save(topic);
        log.info("[VocabTopic] Accepted generate-subtopics for: {}", topicId);
        return toTopicResponse(topic);
    }

    @Async
    public CompletableFuture<Void> generateSubTopicsAsync(String topicId) {
        try {
            VocabTopic topic = topicRepo.findById(topicId)
                    .orElseThrow(() -> new RuntimeException("Topic not found: " + topicId));
            int n = Math.max(1, topic.getEstimatedWordCount() / 20);
            log.info("[VocabTopic] Async generating {} subtopics for: {}", n, topicId);
            AiGenerateResponse aiResp = lpsClient.genSubtopics(workerKey,
                    new VocabGenSubtopicsRequest(topic.getTitle(),
                            topic.getDescription() != null ? topic.getDescription() : "",
                            topic.getCefrRange(), n));
            List<VocabSubTopic> subtopics = parseSubTopics(topicId, serializeAiResult(aiResp));
            subtopicRepo.saveAll(subtopics);
            topic.setSubtopicCount(subtopics.size());
            topic.setStatus(VocabTopicStatus.READY_FOR_WORD_GEN);
            topicRepo.save(topic);
            log.info("[VocabTopic] {} subtopics saved for: {}", subtopics.size(), topicId);
            kafkaProducer.sendVocabSubtopicsGenerated(VocabSubtopicsGeneratedEvent.builder()
                    .topicId(topicId)
                    .topicTitle(topic.getTitle())
                    .subtopicCount(subtopics.size())
                    .build());
        } catch (Exception e) {
            log.error("[VocabTopic] Async subtopic gen failed for {}: {}", topicId, e.getMessage());
            topicRepo.findById(topicId).ifPresent(t -> {
                t.setStatus(VocabTopicStatus.DRAFT);
                topicRepo.save(t);
            });
        }
        return CompletableFuture.completedFuture(null);
    }

    public List<VocabSubTopicResponse> listSubTopics(String topicId) {
        return subtopicRepo.findAllByTopicIdOrderByOrder(topicId)
                .stream().map(this::toSubTopicResponse).toList();
    }

    // ─── GENERATE WORDS ──────────────────────────────────────────────────────

    public VocabSubTopicResponse acceptGenerateWords(String subtopicId) {
        VocabSubTopic subtopic = subtopicRepo.findById(subtopicId)
                .orElseThrow(() -> new RuntimeException("SubTopic not found: " + subtopicId));
        if (subtopic.getWordCount() > 0) {
            log.warn("[VocabSubTopic] Already has words, skipping: {}", subtopicId);
            return toSubTopicResponse(subtopic);
        }
        subtopic.setStatus(VocabSubTopicStatus.GENERATING_WORDS);
        subtopicRepo.save(subtopic);
        log.info("[VocabSubTopic] Accepted generate-words for: {}", subtopicId);
        return toSubTopicResponse(subtopic);
    }

    @Async
    public CompletableFuture<Void> generateWordsAsync(String subtopicId) {
        try {
            VocabSubTopic subtopic = subtopicRepo.findById(subtopicId)
                    .orElseThrow(() -> new RuntimeException("SubTopic not found: " + subtopicId));
            VocabTopic topic = topicRepo.findById(subtopic.getTopicId())
                    .orElseThrow(() -> new RuntimeException("Topic not found"));

            List<String> existingKeys = wordEntryRepo.findAllByTopicId(subtopic.getTopicId())
                    .stream().map(e -> e.getWordKey() + "_" + e.getPos()).toList();

            log.info("[VocabSubTopic] Async generating words for: {}", subtopicId);
            AiGenerateResponse aiResp = lpsClient.genWords(workerKey,
                    new VocabGenWordsRequest(topic.getTitle(), subtopic.getTitle(),
                            subtopic.getDescription() != null ? subtopic.getDescription() : "",
                            subtopic.getCefrLevel() != null ? subtopic.getCefrLevel().name() : "B1",
                            existingKeys.stream().limit(100).toList()));

            List<Map<String, String>> aiWords = parseWordList(serializeAiResult(aiResp));
            List<VocabWordEntry> entries = new ArrayList<>();
            int readyCount = 0;
            int order = 0;

            for (Map<String, String> aiWord : aiWords) {
                String rawWord = aiWord.getOrDefault("word", "").trim();
                if (rawWord.isBlank()) continue;

                // Display text: giữ casing gốc từ AI, chỉ đổi "_" thành space
                String wordText = rawWord
                        .replace("_", " ")
                        .replaceAll("\\s+", " ")
                        .trim();

                // Key: dùng để unique/search/id, lowercase nhưng không phá C++, C#, Node.js, AI/ML
                String wordKey = wordText
                        .toLowerCase()
                        .replaceAll("[^\\p{L}\\p{N}+#./ _-]", "")
                        .replaceAll("[\\s-]+", "_")
                        .replaceAll("_+", "_")
                        .replaceAll("^_|_$", "");

                String pos = aiWord.getOrDefault("pos", "NOUN").trim().toUpperCase();

                if (wordKey.isBlank()) continue;
                if (wordEntryRepo.existsByTopicIdAndWordKeyAndPos(subtopic.getTopicId(), wordKey, pos)) continue;

                Optional<Word> existingWord = wordRepository.findById(wordKey + "|" + pos);
                boolean wordReady = false;

                if (existingWord.isEmpty()) {
                    wordRepository.save(Word.builder()
                            .id(wordKey + "|" + pos)
                            .text(wordText)
                            .key(wordKey)
                            .pos(pos)
                            .context(subtopic.getDescription())
                            .build());
                } else {
                    Word w = existingWord.get();

                    if (w.getStatus() == WordCreationStatus.READY) {
                        wordReady = true;
                        readyCount++;
                    } else if (w.getStatus() == WordCreationStatus.FAILED) {
                        mongoTemplate.updateFirst(
                                new Query(Criteria.where("_id").is(w.getId())),
                                new Update().set("status", WordCreationStatus.PENDING),
                                Word.class
                        );
                    }
                }

                entries.add(VocabWordEntry.builder()
                        .subtopicId(subtopicId)
                        .topicId(subtopic.getTopicId())
                        .wordKey(wordKey)
                        .pos(pos)
                        .order(order++)
                        .wordReady(wordReady)
                        .build());
            }

            wordEntryRepo.saveAll(entries);
            subtopic.setWordCount(entries.size());
            subtopic.setReadyWordCount(readyCount);
            subtopic.setStatus(entries.size() > 0 && entries.size() == readyCount
                    ? VocabSubTopicStatus.READY : VocabSubTopicStatus.PROCESSING_WORDS);
            subtopicRepo.save(subtopic);
            if (subtopic.getStatus() == VocabSubTopicStatus.READY) checkTopicCompletion(subtopic);
            log.info("[VocabSubTopic] {} entries ({} ready) for: {}", entries.size(), readyCount, subtopicId);
        } catch (Exception e) {
            log.error("[VocabSubTopic] Async word gen failed for {}: {}", subtopicId, e.getMessage());
            subtopicRepo.findById(subtopicId).ifPresent(s -> {
                s.setStatus(VocabSubTopicStatus.PENDING_WORDS);
                subtopicRepo.save(s);
            });
        }
        return CompletableFuture.completedFuture(null);
    }

    public List<VocabWordEntryResponse> listWords(String subtopicId) {
        return buildWordEntryResponses(subtopicId);
    }

    // ─── CALLED BY PYTHON WORKER (via MongoDB) ───────────────────────────────

    public void onWordReady(String wordKey, String pos) {
        // Update all VocabWordEntry that link to this word
        Query q = new Query(Criteria.where("wordKey").is(wordKey)
                .and("pos").is(pos).and("wordReady").is(false));
        Update u = new Update().set("wordReady", true);
        mongoTemplate.updateMulti(q, u, VocabWordEntry.class);

        // Find distinct subtopicIds affected and check completion
        List<VocabWordEntry> affected = wordEntryRepo.findAllByWordKeyAndPos(wordKey, pos);
        affected.stream()
                .map(VocabWordEntry::getSubtopicId)
                .distinct()
                .forEach(this::checkSubTopicCompletion);
    }

    // ─── COMPLETION CHECKS ───────────────────────────────────────────────────

    public void checkSubTopicCompletion(String subtopicId) {
        VocabSubTopic subtopic = subtopicRepo.findById(subtopicId).orElse(null);
        if (subtopic == null || subtopic.getStatus() == VocabSubTopicStatus.READY) return;

        long readyCount = wordEntryRepo.countBySubtopicIdAndWordReadyTrue(subtopicId);
        subtopic.setReadyWordCount((int) readyCount);

        if (subtopic.getWordCount() > 0 && readyCount >= subtopic.getWordCount()) {
            subtopic.setStatus(VocabSubTopicStatus.READY);
            subtopicRepo.save(subtopic);
            log.info("[VocabSubTopic] READY: {}", subtopicId);
            checkTopicCompletion(subtopic);
        } else {
            subtopicRepo.save(subtopic);
        }
    }

    private void checkTopicCompletion(VocabSubTopic readySubtopic) {
        String topicId = readySubtopic.getTopicId();
        VocabTopic topic = topicRepo.findById(topicId).orElse(null);
        if (topic == null) return;

        long readySubtopics = subtopicRepo.countByTopicIdAndStatus(topicId, VocabSubTopicStatus.READY);
        topic.setReadySubtopicCount((int) readySubtopics);

        boolean topicReady = topic.getSubtopicCount() > 0 && readySubtopics >= topic.getSubtopicCount();
        if (topicReady) {
            topic.setStatus(VocabTopicStatus.READY);
            log.info("[VocabTopic] READY: {}", topicId);
        } else {
            topic.setStatus(VocabTopicStatus.PROCESSING);
        }
        topicRepo.save(topic);

        kafkaProducer.sendVocabSubTopicReady(VocabSubTopicReadyEvent.builder()
                .topicId(topicId)
                .subtopicId(readySubtopic.getId())
                .subtopicTitle(readySubtopic.getTitle())
                .topicTitle(topic.getTitle())
                .topicReady(topicReady)
                .readyWordCount(readySubtopic.getReadyWordCount())
                .wordCount(readySubtopic.getWordCount())
                .readySubtopicCount((int) readySubtopics)
                .build());
    }

    // ─── AI CALL HELPER ──────────────────────────────────────────────────────

    private String serializeAiResult(AiGenerateResponse resp) {
        try {
            return objectMapper.writeValueAsString(resp.getResult());
        } catch (Exception e) {
            log.error("[VocabService] Failed to serialize AI result: {}", e.getMessage());
            throw new RuntimeException("AI result serialization failed", e);
        }
    }

    // ─── PARSERS ─────────────────────────────────────────────────────────────

    private List<VocabSubTopic> parseSubTopics(String topicId, String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode arr = root.path("subtopics");
            List<VocabSubTopic> result = new ArrayList<>();
            int order = 0;
            for (JsonNode node : arr) {
                CefrLevel level = parseCefrLevel(node.path("cefrLevel").asText("B1"));
                result.add(VocabSubTopic.builder()
                        .topicId(topicId)
                        .title(node.path("title").asText())
                        .titleVi(node.path("titleVi").asText())
                        .description(node.path("description").asText())
                        .cefrLevel(level)
                        .order(order++)
                        .build());
            }
            return result;
        } catch (Exception e) {
            log.error("[VocabService] Failed to parse subtopics: {}", e.getMessage());
            throw new RuntimeException("Failed to parse AI subtopic response", e);
        }
    }

    private List<Map<String, String>> parseWordList(String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode arr = root.path("words");
            List<Map<String, String>> result = new ArrayList<>();
            for (JsonNode node : arr) {
                result.add(Map.of(
                        "word", node.path("word").asText(""),
                        "pos", node.path("pos").asText("NOUN")
                ));
            }
            return result;
        } catch (Exception e) {
            log.error("[VocabService] Failed to parse word list: {}", e.getMessage());
            throw new RuntimeException("Failed to parse AI word list response", e);
        }
    }

    private CefrLevel parseCefrLevel(String raw) {
        try {
            return CefrLevel.valueOf(raw.toUpperCase().trim());
        } catch (Exception e) {
            return CefrLevel.B1;
        }
    }

    // ─── RESPONSE BUILDERS ───────────────────────────────────────────────────

    private List<VocabWordEntryResponse> buildWordEntryResponses(String subtopicId) {
        List<VocabWordEntry> entries = wordEntryRepo.findAllBySubtopicIdOrderByOrder(subtopicId);
        return entries.stream().map(entry -> {
            Word word = entry.isWordReady()
                    ? wordRepository.findById(entry.getWordKey() + "|" + entry.getPos()).orElse(null)
                    : null;
            return VocabWordEntryResponse.builder()
                    .id(entry.getId())
                    .wordKey(entry.getWordKey())
                    .pos(entry.getPos())
                    .order(entry.getOrder())
                    .wordReady(entry.isWordReady())
                    .note(entry.getNote())
                    .wordDetail(word)
                    .build();
        }).toList();
    }

    private VocabTopicResponse toTopicResponse(VocabTopic t) {
        return VocabTopicResponse.builder()
                .id(t.getId())
                .title(t.getTitle())
                .description(t.getDescription())
                .tags(t.getTags())
                .cefrRange(t.getCefrRange())
                .estimatedWordCount(t.getEstimatedWordCount())
                .subtopicCount(t.getSubtopicCount())
                .readySubtopicCount(t.getReadySubtopicCount())
                .status(t.getStatus())
                .thumbnailUrl(t.getThumbnailUrl())
                .publishedAt(t.getPublishedAt())
                .createdAt(t.getCreatedAt())
                .build();
    }

    private VocabSubTopicResponse toSubTopicResponse(VocabSubTopic s) {
        return VocabSubTopicResponse.builder()
                .id(s.getId())
                .topicId(s.getTopicId())
                .title(s.getTitle())
                .titleVi(s.getTitleVi())
                .description(s.getDescription())
                .cefrLevel(s.getCefrLevel())
                .order(s.getOrder())
                .wordCount(s.getWordCount())
                .readyWordCount(s.getReadyWordCount())
                .status(s.getStatus())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
