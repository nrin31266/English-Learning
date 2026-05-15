package com.rin.dictionaryservice.service;

import com.rin.dictionaryservice.constant.VocabSubTopicStatus;
import com.rin.dictionaryservice.constant.VocabTopicStatus;
import com.rin.dictionaryservice.constant.WordCreationStatus;
import com.rin.dictionaryservice.dto.*;
import com.rin.dictionaryservice.dto.ai.AiSingleMeaningPayload;
import com.rin.dictionaryservice.dto.ai.AiSubtopicItem;
import com.rin.dictionaryservice.dto.ai.AiSubtopicsPayload;
import com.rin.dictionaryservice.dto.ai.AiWordItem;
import com.rin.dictionaryservice.dto.ai.AiWordsPayload;
import com.rin.dictionaryservice.exception.DictionaryErrorCode;
import com.rin.dictionaryservice.kafka.KafkaProducer;
import com.rin.dictionaryservice.model.*;
import com.rin.dictionaryservice.repository.*;
import com.rin.dictionaryservice.repository.httpclient.LanguageProcessingClient;
import com.rin.dictionaryservice.service.support.VocabAiResponseParser;
import com.rin.dictionaryservice.service.support.VocabContextScoringHelper;
import com.rin.englishlearning.common.dto.PageResponse;
import com.rin.englishlearning.common.event.VocabSubTopicProgressEvent;
import com.rin.englishlearning.common.event.VocabSubTopicReadyEvent;
import com.rin.englishlearning.common.event.VocabSubtopicsGeneratedEvent;
import com.rin.englishlearning.common.exception.BaseException;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
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
    RestTemplate restTemplate;
    VocabAiResponseParser aiResponseParser;
    VocabContextScoringHelper scoringHelper;

    @lombok.experimental.NonFinal
    @org.springframework.beans.factory.annotation.Value("${language-processing.worker-key}")
    String workerKey;

    @lombok.experimental.NonFinal
    @org.springframework.beans.factory.annotation.Value("${language-processing.url}")
    String lpsBaseUrl;

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

    public VocabTopicResponse updateTopic(String topicId, UpdateVocabTopicRequest req) {
        VocabTopic topic = getTopicOrThrow(topicId);
        if (req.getTitle() != null) topic.setTitle(req.getTitle());
        if (req.getDescription() != null) topic.setDescription(req.getDescription());
        if (req.getTags() != null) topic.setTags(req.getTags());
        if (req.getCefrRange() != null) topic.setCefrRange(req.getCefrRange());
        if (req.getThumbnailUrl() != null) topic.setThumbnailUrl(req.getThumbnailUrl());
        topicRepo.save(topic);
        log.info("[VocabTopic] Updated: {}", topicId);
        return toTopicResponse(topic);
    }

    public void deleteTopic(String topicId) {
        if (!topicRepo.existsById(topicId)) {
            throw topicNotFound(topicId);
        }
        // Cascade delete: sub-topics and word entries for this topic
        subtopicRepo.deleteByTopicId(topicId);
        mongoTemplate.remove(
                new Query(Criteria.where("topicId").is(topicId)),
                VocabWordEntry.class
        );
        topicRepo.deleteById(topicId);
        log.info("[VocabTopic] Deleted: {}", topicId);
    }

    public PageResponse<VocabTopicResponse> listTopics(String q, List<String> tags, String status,
                                                         int page, int size, String sort) {
        String keyword = q == null ? "" : q.trim().toLowerCase();

        List<String> tagFilters = (tags == null || tags.isEmpty()) ? List.of()
                : tags.stream().map(String::trim).filter(t -> !t.isBlank()).map(String::toLowerCase).toList();

        final VocabTopicStatus statusFilter = parseStatusFilter(status);

        List<VocabTopic> allFiltered = topicRepo.findAll().stream()
                .filter(t -> {
                    // multi-tag: topic must match ALL selected tags
                    if (tagFilters.isEmpty()) return true;
                    if (t.getTags() == null || t.getTags().isEmpty()) return false;
                    return tagFilters.stream()
                            .allMatch(tf -> t.getTags().stream()
                                    .anyMatch(tt -> tt != null && tt.toLowerCase().equals(tf)));
                })
                .filter(t -> {
                    if (keyword.isBlank()) return true;
                    boolean inTitle = t.getTitle() != null && t.getTitle().toLowerCase().contains(keyword);
                    boolean inDesc = t.getDescription() != null && t.getDescription().toLowerCase().contains(keyword);
                    boolean inTags = t.getTags() != null && t.getTags().stream()
                            .anyMatch(x -> x != null && x.toLowerCase().contains(keyword));
                    return inTitle || inDesc || inTags;
                })
                .filter(t -> {
                    if (statusFilter == null) return true;
                    return t.getStatus() == statusFilter;
                })
                .collect(Collectors.toList());

        // Sort: newest (default) / oldest
        boolean asc = "oldest".equalsIgnoreCase(sort);
        allFiltered.sort((a, b) -> {
            if (a.getCreatedAt() == null && b.getCreatedAt() == null) return 0;
            if (a.getCreatedAt() == null) return 1;
            if (b.getCreatedAt() == null) return -1;
            return asc ? a.getCreatedAt().compareTo(b.getCreatedAt()) : b.getCreatedAt().compareTo(a.getCreatedAt());
        });

        long total = allFiltered.size();
        int totalPages = (size > 0) ? (int) Math.ceil((double) total / size) : 0;
        int safePage = Math.max(0, page);
        int fromIndex = safePage * size;
        int toIndex = Math.min(fromIndex + size, allFiltered.size());

        List<VocabTopic> pageData = allFiltered.subList(
                Math.min(fromIndex, allFiltered.size()), toIndex);

        return PageResponse.<VocabTopicResponse>builder()
                .data(pageData.stream().map(this::toTopicResponse).toList())
                .page(safePage)
                .size(size)
                .totalElements(total)
                .totalPages(totalPages)
                .hasNext(safePage + 1 < totalPages)
                .hasPrevious(safePage > 0)
                .build();
    }

    public VocabTopicResponse getTopic(String topicId) {
        return toTopicResponse(getTopicOrThrow(topicId));
    }

    // ─── GENERATE SUBTOPICS ──────────────────────────────────────────────────

    public VocabTopicResponse acceptGenerateSubTopics(String topicId) {
        VocabTopic topic = getTopicOrThrow(topicId);
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
            VocabTopic topic = getTopicOrThrow(topicId);
            int n = Math.max(1, topic.getEstimatedWordCount() / 20);
            log.info("[VocabTopic] Async generating {} subtopics for: {}", n, topicId);
            AiGenerateResponse aiResp = lpsClient.genSubtopics(workerKey,
                    new VocabGenSubtopicsRequest(topic.getTitle(),
                            topic.getDescription() != null ? topic.getDescription() : "",
                            topic.getCefrRange(), n,
                            topic.getTags() != null ? topic.getTags() : List.of()));
            String aiJson = aiResponseParser.serializeResult(aiResp);
            AiSubtopicsPayload payload = aiResponseParser.parseSubtopicsPayload(aiJson);

            // Parse AI-generated topic description and map it back to the topic
            String aiDescription = parseTopicDescription(payload);
            if (aiDescription != null && !aiDescription.isBlank()) {
                topic.setDescription(aiDescription);
                log.info("[VocabTopic] AI-generated description for {}: {}", topicId, aiDescription);
            }

            List<VocabSubTopic> subtopics = parseSubTopics(topicId, payload);
            subtopicRepo.saveAll(subtopics);
            topic.setSubtopicCount(subtopics.size());
            topic.setStatus(VocabTopicStatus.READY_FOR_WORD_GEN);
            topicRepo.save(topic);
            log.info("[VocabTopic] {} subtopics saved for: {}", subtopics.size(), topicId);
            kafkaProducer.sendVocabSubtopicsGenerated(VocabSubtopicsGeneratedEvent.builder()
                    .topicId(topicId)
                    .topicTitle(topic.getTitle())
                    .subtopicCount(subtopics.size())
                    .topicDescription(topic.getDescription() != null ? topic.getDescription() : "")
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

    public List<VocabSubTopicResponse> listSubTopics(String topicId, boolean activeOnly) {
        List<VocabSubTopic> subtopics = activeOnly
                ? subtopicRepo.findAllByTopicIdAndIsActiveTrueOrderByOrder(topicId)
                : subtopicRepo.findAllByTopicIdOrderByOrder(topicId);
        return subtopics.stream().map(this::toSubTopicResponse).toList();
    }

    // ─── GENERATE WORDS ──────────────────────────────────────────────────────

    public VocabSubTopicResponse acceptGenerateWords(String subtopicId) {
        VocabSubTopic subtopic = getSubtopicOrThrow(subtopicId);
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
            VocabSubTopic subtopic = getSubtopicOrThrow(subtopicId);
            VocabTopic topic = getTopicOrThrow(subtopic.getTopicId());

            log.info("[VocabSubTopic] Async generating words for: {}", subtopicId);
            
            AiGenerateResponse aiResp = lpsClient.genWords(workerKey,
                    new VocabGenWordsRequest(topic.getTitle(), subtopic.getTitle(),
                            subtopic.getDescription() != null ? subtopic.getDescription() : "",
                            subtopic.getCefrLevel() != null ? subtopic.getCefrLevel().name() : DEFAULT_CEFR_LEVEL.name(),
                            List.of())); 

            String aiJson = aiResponseParser.serializeResult(aiResp);
            List<Map<String, String>> aiWords = parseWordList(aiResponseParser.parseWordsPayload(aiJson));
            List<VocabWordEntry> entries = new ArrayList<>();
            int readyCount = 0;
            int order = 0;

            // Dùng Set để chặn AI đẻ trùng từ trong CÙNG 1 subtopic (phòng AI ngáo)
            java.util.Set<String> seenInBatch = new java.util.HashSet<>();

            for (Map<String, String> aiWord : aiWords) {
                String rawWord = aiWord.getOrDefault("word", "").trim();
                if (rawWord.isBlank()) continue;

                // 1. Text hiển thị
                String wordText = rawWord.replaceAll("\\s+", " ").trim();

                // 2. Tạo Key
                String wordKey = wordText.toLowerCase()
                        .replace("'", "_")
                        .replaceAll("[\\s-]+", "_")
                        .replaceAll("[^\\p{L}\\p{N}+#./_]", "")
                        .replaceAll("_+", "_")
                        .replaceAll("^_|_$", "");

                String pos = aiWord.getOrDefault("pos", DEFAULT_POS).trim().toUpperCase();

                if (wordKey.isBlank()) continue;

                // 3. Chặn trùng lặp trong CÙNG MỘT MẺ gen
                String uniqueCheckKey = wordKey + "|" + pos;
                if (seenInBatch.contains(uniqueCheckKey)) continue;
                seenInBatch.add(uniqueCheckKey);

                // ĐÃ XÓA logic chốt sổ 20 từ. AI cho bao nhiêu gom bấy nhiêu!

                Optional<Word> existingWord = wordRepository.findById(uniqueCheckKey);
                boolean wordReady = false;

                String ctxDef = null, ctxMean = null, ctxEx = null, ctxViEx = null;
                CefrLevel ctxLevel = null;

                if (existingWord.isEmpty()) {
                    wordRepository.save(Word.builder()
                            .id(uniqueCheckKey)
                            .text(wordText)
                            .key(wordKey)
                            .pos(pos)
                            .context(subtopic.getDescription()) // Lưu context gốc để AI học
                            .build());
                } else {
                    Word w = existingWord.get();
                    if (w.getStatus() == WordCreationStatus.READY) {
                        wordReady = true;
                        readyCount++;

                        Word.Definition matchedDef = scoringHelper.selectDefinition(w, topic, subtopic);
                        ctxDef = matchedDef.getDefinition();
                        ctxMean = matchedDef.getMeaningVi();
                        ctxEx = matchedDef.getExample();
                        ctxViEx = matchedDef.getViExample();
                        ctxLevel = matchedDef.getLevel();

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
                        .wordText(wordText)
                        .pos(pos)
                        .order(order++)
                        .wordReady(wordReady)
                        .contextDefinition(ctxDef)
                        .contextMeaningVi(ctxMean)
                        .contextExample(ctxEx)
                        .contextViExample(ctxViEx)
                        .contextLevel(ctxLevel)
                        .build());
            }

            wordEntryRepo.saveAll(entries);
            subtopic.setWordCount(entries.size());
            subtopic.setReadyWordCount(readyCount);
            subtopic.setStatus(entries.size() > 0 && entries.size() == readyCount
                    ? VocabSubTopicStatus.READY : VocabSubTopicStatus.PROCESSING_WORDS);
            subtopicRepo.save(subtopic);

            // Gửi sự kiện Kafka để UI cập nhật số nhảy múa
            kafkaProducer.sendVocabSubTopicProgress(VocabSubTopicProgressEvent.builder()
                    .topicId(subtopic.getTopicId())
                    .subtopicId(subtopicId)
                    .subtopicTitle(subtopic.getTitle())
                    .readyWordCount(readyCount)
                    .wordCount(entries.size())
                    .subtopicStatus(subtopic.getStatus().name())
                    .build());

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



    // ─── COMPLETION CHECKS ───────────────────────────────────────────────────

    public void checkSubTopicCompletion(String subtopicId) {
        VocabSubTopic subtopic = subtopicRepo.findById(subtopicId).orElse(null);
        if (subtopic == null || subtopic.getStatus() == VocabSubTopicStatus.READY) return;

        long readyCount = wordEntryRepo.countBySubtopicIdAndWordReadyTrue(subtopicId);
        boolean alreadyReady = subtopic.getStatus() == VocabSubTopicStatus.READY;
        subtopic.setReadyWordCount((int) readyCount);

        if (subtopic.getWordCount() > 0 && readyCount >= subtopic.getWordCount()) {
            subtopic.setStatus(VocabSubTopicStatus.READY);
            log.info("[VocabSubTopic] READY: {}", subtopicId);
        }
        subtopicRepo.save(subtopic);

        // Send progress event for every word‑ready update so frontend shows live counts
        kafkaProducer.sendVocabSubTopicProgress(VocabSubTopicProgressEvent.builder()
                .topicId(subtopic.getTopicId())
                .subtopicId(subtopicId)
                .subtopicTitle(subtopic.getTitle())
                .readyWordCount((int) readyCount)
                .wordCount(subtopic.getWordCount())
                .subtopicStatus(subtopic.getStatus().name())
                .build());

        // Only notify completion (ReadyEvent) on actual transition to READY
        if (subtopic.getStatus() == VocabSubTopicStatus.READY && !alreadyReady) {
            checkTopicCompletion(subtopic);
        }
    }


    public List<VocabWordEntryResponse> listWords(String subtopicId) {
        // Tối ưu: Chỉ truyền vào subtopicId, logic chọn nghĩa đã được tính sẵn và lưu ở VocabWordEntry
        return buildWordEntryResponses(subtopicId);
    }

    // ─── DELETE / RECALCULATE ────────────────────────────────────────────────

    public void deleteAllWordsInSubTopic(String subtopicId) {
        VocabSubTopic subtopic = getSubtopicOrThrow(subtopicId);
        String topicId = subtopic.getTopicId();

        // Delete all word entries belonging to this subtopic
        mongoTemplate.remove(
                new Query(Criteria.where("subtopicId").is(subtopicId)),
                VocabWordEntry.class
        );
        log.info("[VocabSubTopic] Deleted all words for subtopic: {}", subtopicId);

        // Reset subtopic back to PENDING_WORDS so "Gen Từ" button reappears
        subtopic.setWordCount(0);
        subtopic.setReadyWordCount(0);
        subtopic.setStatus(VocabSubTopicStatus.PENDING_WORDS);
        subtopicRepo.save(subtopic);

        // Recalculate parent topic counts
        VocabTopic topic = topicRepo.findById(topicId).orElse(null);
        if (topic != null) {
            recalculateTopicCounts(topicId);

            // If this was the last READY subtopic, topic may need status downgrade
            topicRepo.findById(topicId).ifPresent(t -> {
                t.setSubtopicCount((int) subtopicRepo.countByTopicId(topicId));
                topicRepo.save(t);
            });
        }
    }

    public void deleteSubTopic(String subtopicId) {
        VocabSubTopic subtopic = getSubtopicOrThrow(subtopicId);
        String topicId = subtopic.getTopicId();

        // Delete all word entries belonging to this subtopic
        mongoTemplate.remove(
                new Query(Criteria.where("subtopicId").is(subtopicId)),
                VocabWordEntry.class
        );
        subtopicRepo.delete(subtopic);
        log.info("[VocabSubTopic] Deleted: {}", subtopicId);

        // Recalculate topic
        VocabTopic topic = topicRepo.findById(topicId).orElse(null);
        if (topic != null) {
            long count = subtopicRepo.countByTopicId(topicId);
            topic.setSubtopicCount((int) count);
            topicRepo.save(topic);
            recalculateTopicCounts(topicId);
        }
    }

    public void recalculateTopic(String topicId) {
        recalculateTopicCounts(topicId);
    }

    // ─── TOGGLE ACTIVE ───────────────────────────────────────────────────────

    public VocabTopicResponse toggleTopicActive(String topicId) {
        VocabTopic topic = getTopicOrThrow(topicId);

        boolean nextActive = !topic.isActive();
        if (nextActive && (
                topic.getStatus() == VocabTopicStatus.DRAFT ||
                topic.getStatus() == VocabTopicStatus.GENERATING_SUBTOPICS ||
                topic.getSubtopicCount() == 0
        )) {
            throw new BaseException(DictionaryErrorCode.TOPIC_NOT_READY);
        }

        topic.setActive(nextActive);
        topicRepo.save(topic);
        log.info("[VocabTopic] Toggled isActive to {} for: {}", topic.isActive(), topicId);
        return toTopicResponse(topic);
    }

    public VocabSubTopicResponse toggleSubtopicActive(String subtopicId) {
        VocabSubTopic subtopic = getSubtopicOrThrow(subtopicId);

        boolean nextActive = !subtopic.isActive();
        if (nextActive && subtopic.getStatus() != VocabSubTopicStatus.READY) {
            throw new BaseException(DictionaryErrorCode.SUBTOPIC_NOT_READY);
        }

        subtopic.setActive(nextActive);
        subtopicRepo.save(subtopic);
        log.info("[VocabSubTopic] Toggled isActive to {} for: {}", subtopic.isActive(), subtopicId);
        return toSubTopicResponse(subtopic);
    }

    // ─── HUMAN-IN-THE-LOOP: MANUAL OVERRIDE & SYNC GENERATION ──────────────

    public VocabWordEntryResponse updateEntryContextManual(String entryId, UpdateEntryContextRequest req) {
        VocabWordEntry entry = getWordEntryOrThrow(entryId);
        entry.setContextDefinition(req.getDefinition());
        entry.setContextMeaningVi(req.getMeaningVi());
        entry.setContextExample(req.getExample());
        entry.setContextViExample(req.getViExample());
        entry.setContextLevel(parseCefrLevel(req.getLevel()));
        entry.setWordReady(true);
        wordEntryRepo.save(entry);
        log.info("[VocabWordEntry] Manual context update for entry: {}", entryId);
        return buildSingleWordEntryResponse(entry);
    }

    public VocabWordEntryResponse generateSingleMeaningSync(String entryId) {
        VocabWordEntry entry = getWordEntryOrThrow(entryId);
        VocabTopic topic = getTopicOrThrow(entry.getTopicId());
        VocabSubTopic subtopic = getSubtopicOrThrow(entry.getSubtopicId());

        String promptWord = entry.getWordText() != null && !entry.getWordText().isBlank()
                ? entry.getWordText()
                : entry.getWordKey().replace('_', ' ');

        log.info("[VocabWordEntry] Sync generating single meaning for entry: {}", entryId);
        AiGenerateResponse aiResp = lpsClient.generateSingleMeaning(workerKey,
                new SingleMeaningRequest(promptWord, entry.getPos(),
                        topic.getTitle(), topic.getDescription(), subtopic.getTitle(),
                        subtopic.getDescription() != null ? subtopic.getDescription() : ""));

        Word.Definition newDef = parseSingleMeaningResult(aiResp);
        String wordId = entry.getWordKey() + "|" + entry.getPos();
        Word word = wordRepository.findById(wordId).orElse(null);
        if (word == null) {
            word = Word.builder()
                    .id(wordId)
                    .text(promptWord)
                    .key(entry.getWordKey())
                    .pos(entry.getPos())
                    .status(WordCreationStatus.READY)
                    .context(subtopic.getDescription())
                    .definitions(new ArrayList<>())
                    .build();
        }
        if (word.getDefinitions() == null) {
            word.setDefinitions(new ArrayList<>());
        }
        if (!scoringHelper.containsSameDefinition(word.getDefinitions(), newDef)) {
            word.getDefinitions().add(newDef);
        }
        word.setText(promptWord);
        word.setContext(subtopic.getDescription());
        word.setStatus(WordCreationStatus.READY);
        wordRepository.save(word);
        log.info("[VocabWordEntry] Upserted contextual definition for word: {}", wordId);

        entry.setWordReady(true);
        entry.setWordText(word.getText());
        entry.setContextDefinition(newDef.getDefinition());
        entry.setContextMeaningVi(newDef.getMeaningVi());
        entry.setContextExample(newDef.getExample());
        entry.setContextViExample(newDef.getViExample());
        entry.setContextLevel(newDef.getLevel());
        wordEntryRepo.save(entry);
        log.info("[VocabWordEntry] Updated context cache for entry: {}", entryId);

        return buildSingleWordEntryResponse(entry);
    }

    private Word.Definition parseSingleMeaningResult(AiGenerateResponse aiResp) {
        AiSingleMeaningPayload payload = aiResponseParser.parseSingleMeaningPayload(aiResp);
        return Word.Definition.builder()
                .definition(safe(payload.definition()))
                .meaningVi(safe(payload.meaningVi()))
                .example(safe(payload.example()))
                .viExample(safe(payload.viExample()))
                .level(parseCefrLevel(payload.level()))
                .build();
    }

    private VocabWordEntryResponse buildSingleWordEntryResponse(VocabWordEntry entry) {
        Word word = entry.isWordReady()
                ? wordRepository.findById(entry.getWordKey() + "|" + entry.getPos()).orElse(null)
                : null;
        String wordText = (entry.getWordText() != null)
                ? entry.getWordText()
                : entry.getWordKey().replace('_', ' ');
        return VocabWordEntryResponse.builder()
                .id(entry.getId())
                .wordKey(entry.getWordKey())
                .wordText(wordText)
                .pos(entry.getPos())
                .order(entry.getOrder())
                .wordReady(entry.isWordReady())
                .note(entry.getNote())
                .contextDefinition(entry.getContextDefinition())
                .contextMeaningVi(entry.getContextMeaningVi())
                .contextExample(entry.getContextExample())
                .contextViExample(entry.getContextViExample())
                .contextLevel(entry.getContextLevel() != null ? entry.getContextLevel().name() : null)
                .wordDetail(word)
                .build();
    }

    /**
     * Proxy image upload through dictionary-service to avoid exposing worker key to browser.
     * Forwards the MultipartFile to language-processing-service with authenticated worker key.
     */
    public String uploadTopicImage(String publicId, MultipartFile file) {
        String uploadUrl = lpsBaseUrl + "/internal/upload/image?public_id=" + publicId;

        // Build multipart request for RestTemplate
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", file.getResource());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.set("X-Worker-Key", workerKey);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        log.info("[VocabTopic] Proxy-uploading image: publicId={}, size={} bytes", publicId, file.getSize());

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(uploadUrl, requestEntity, Map.class);
            Map<String, Object> respBody = response.getBody();
            String url = respBody != null ? (String) respBody.get("url") : null;
            if (url == null || url.isEmpty()) {
                throw new BaseException(DictionaryErrorCode.IMAGE_UPLOAD_RESPONSE_INVALID,
                        String.format(DictionaryErrorCode.IMAGE_UPLOAD_RESPONSE_INVALID.getMessage() + ": %s", respBody));
            }
            log.info("[VocabTopic] Image uploaded: {}", url);
            return url;
        } catch (BaseException e) {
            throw e;
        } catch (Exception e) {
            log.error("[VocabTopic] Image upload failed: {}", e.getMessage(), e);
            throw new BaseException(DictionaryErrorCode.IMAGE_UPLOAD_FAILED,
                    String.format("%s: %s", DictionaryErrorCode.IMAGE_UPLOAD_FAILED.getMessage(), e.getMessage()));
        }
    }

    private void recalculateTopicCounts(String topicId) {
        VocabTopic topic = topicRepo.findById(topicId).orElse(null);
        if (topic == null) return;

        // Recalculate ready subtopic count
        long readySubtopics = subtopicRepo.countByTopicIdAndStatus(topicId, VocabSubTopicStatus.READY);
        topic.setReadySubtopicCount((int) readySubtopics);

        // Determine topic status
        long totalSubtopics = subtopicRepo.countByTopicId(topicId);
        topic.setSubtopicCount((int) totalSubtopics);

        if (totalSubtopics == 0) {
            topic.setStatus(VocabTopicStatus.DRAFT);
        } else if (readySubtopics >= totalSubtopics) {
            topic.setStatus(VocabTopicStatus.READY);
        } else {
            topic.setStatus(VocabTopicStatus.PROCESSING);
        }
        topicRepo.save(topic);
        log.info("[VocabTopic] Recalculated {}: {}/{} ready, status={}", topicId, readySubtopics, totalSubtopics, topic.getStatus());
    }

    // ─── CALLED BY PYTHON WORKER (via MongoDB) ───────────────────────────────

    public void onWordReady(String wordKey, String pos) {
        // 1. Lấy data Word chuẩn sau khi AI đã xử lý xong
        Word word = wordRepository.findById(wordKey + "|" + pos).orElse(null);
        if (word == null) return;

        // 2. Tìm tất cả các Entry (ở nhiều Subtopic khác nhau) đang cần từ này
        List<VocabWordEntry> affected = wordEntryRepo.findAllByWordKeyAndPos(wordKey, pos);
        if (affected.isEmpty()) return;

        for (VocabWordEntry entry : affected) {
            if (entry.isWordReady()) continue; // Bỏ qua nếu đã được tính toán từ trước

            // Lấy Subtopic tương ứng của Entry để biết target CEFR Level
            VocabSubTopic subtopic = subtopicRepo.findById(entry.getSubtopicId()).orElse(null);
            VocabTopic topic = topicRepo.findById(entry.getTopicId()).orElse(null);
            Word.Definition matchedDef = scoringHelper.selectDefinition(word, topic, subtopic);

            // 4. Lưu Cache thẳng vào Entry
            entry.setWordReady(true);
            entry.setWordText(word.getText());
            entry.setContextDefinition(matchedDef.getDefinition());
            entry.setContextMeaningVi(matchedDef.getMeaningVi());
            entry.setContextExample(matchedDef.getExample());
            entry.setContextViExample(matchedDef.getViExample());
            entry.setContextLevel(matchedDef.getLevel());
        }

        // Lưu toàn bộ updates trong 1 query duy nhất
        wordEntryRepo.saveAll(affected);

        // Find distinct subtopicIds affected and check completion (Kích hoạt Kafka)
        affected.stream()
                .map(VocabWordEntry::getSubtopicId)
                .distinct()
                .forEach(this::checkSubTopicCompletion);
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

    // ─── PARSERS ─────────────────────────────────────────────────────────────

    private List<VocabSubTopic> parseSubTopics(String topicId, AiSubtopicsPayload payload) {
        List<VocabSubTopic> result = new ArrayList<>();
        List<AiSubtopicItem> aiItems = payload.subtopics() != null ? payload.subtopics() : List.of();

        int order = 0;
        for (AiSubtopicItem item : aiItems) {
            result.add(VocabSubTopic.builder()
                    .topicId(topicId)
                    .title(safe(item.title()))
                    .titleVi(safe(item.titleVi()))
                    .description(safe(item.description()))
                    .cefrLevel(parseCefrLevel(item.cefrLevel()))
                    .order(order++)
                    .build());
        }
        return result;
    }

    private List<Map<String, String>> parseWordList(AiWordsPayload payload) {
        List<Map<String, String>> result = new ArrayList<>();
        List<AiWordItem> words = payload.words() != null ? payload.words() : List.of();

        for (AiWordItem item : words) {
            String word = safe(item.word());
            if (word.isBlank()) continue;

            result.add(Map.of(
                    "word", word,
                    "pos", normalizePos(item.pos())
            ));
        }
        return result;
    }

    private VocabTopicStatus parseStatusFilter(String status) {
        if (status == null || status.isBlank()) return null;
        try {
            return VocabTopicStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private CefrLevel parseCefrLevel(String raw) {
        try {
            return CefrLevel.valueOf(raw.toUpperCase().trim());
        } catch (Exception e) {
            return DEFAULT_CEFR_LEVEL;
        }
    }

    private String parseTopicDescription(AiSubtopicsPayload payload) {
        String description = safe(payload.topicDescription());
        return description.isBlank() ? null : description;
    }

    // ─── RESPONSE BUILDERS ───────────────────────────────────────────────────

    private List<VocabWordEntryResponse> buildWordEntryResponses(String subtopicId) {
        // Lấy danh sách Entry theo thứ tự (Chỉ tốn 1 query)
        List<VocabWordEntry> entries = wordEntryRepo.findAllBySubtopicIdOrderByOrder(subtopicId);

        // TỐI ƯU N+1 QUERY: Gom ID lại và Fetch 1 lần duy nhất bằng $in
        List<String> wordIds = entries.stream()
                .filter(VocabWordEntry::isWordReady)
                .map(e -> e.getWordKey() + "|" + e.getPos())
                .toList();

        // Tạo Map lookup siêu nhanh O(1)
        Map<String, Word> wordMap = wordRepository.findAllById(wordIds).stream()
                .collect(Collectors.toMap(Word::getId, w -> w));

        return entries.stream().map(entry -> {
            // Chỉ móc ra từ bộ nhớ, không chọc xuống DB nữa
            Word word = entry.isWordReady() ? wordMap.get(entry.getWordKey() + "|" + entry.getPos()) : null;

            // Xử lý text hiển thị tạm khi từ chưa Ready
            String wordText = (entry.getWordText() != null)
                    ? entry.getWordText()
                    : entry.getWordKey().replace('_', ' ');

            return VocabWordEntryResponse.builder()
                    .id(entry.getId())
                    .wordKey(entry.getWordKey())
                    .wordText(wordText)
                    .pos(entry.getPos())
                    .order(entry.getOrder())
                    .wordReady(entry.isWordReady())
                    .note(entry.getNote())
                    // Bê thẳng Cache từ Entry ra, miễn nhiễm với tính toán nặng
                    .contextDefinition(entry.getContextDefinition())
                    .contextMeaningVi(entry.getContextMeaningVi())
                    .contextExample(entry.getContextExample())
                    .contextViExample(entry.getContextViExample())
                    .contextLevel(entry.getContextLevel() != null ? entry.getContextLevel().name() : null)
                    .wordDetail(word) // Truyền full cục Word xuống cho FE phát âm, phiên âm
                    .build();
        }).toList();
    }

    private String normalizePos(String raw) {
        if (raw == null || raw.isBlank()) return DEFAULT_POS;
        return raw.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private VocabTopic getTopicOrThrow(String topicId) {
        return topicRepo.findById(topicId).orElseThrow(() -> topicNotFound(topicId));
    }

    private VocabSubTopic getSubtopicOrThrow(String subtopicId) {
        return subtopicRepo.findById(subtopicId).orElseThrow(() -> subtopicNotFound(subtopicId));
    }

    private VocabWordEntry getWordEntryOrThrow(String entryId) {
        return wordEntryRepo.findById(entryId).orElseThrow(() -> wordEntryNotFound(entryId));
    }

    private BaseException topicNotFound(String topicId) {
        return new BaseException(
                DictionaryErrorCode.TOPIC_NOT_FOUND,
                String.format(DictionaryErrorCode.TOPIC_NOT_FOUND.getMessage(), topicId)
        );
    }

    private BaseException subtopicNotFound(String subtopicId) {
        return new BaseException(
                DictionaryErrorCode.SUBTOPIC_NOT_FOUND,
                String.format(DictionaryErrorCode.SUBTOPIC_NOT_FOUND.getMessage(), subtopicId)
        );
    }

    private BaseException wordEntryNotFound(String entryId) {
        return new BaseException(
                DictionaryErrorCode.WORD_ENTRY_NOT_FOUND,
                String.format(DictionaryErrorCode.WORD_ENTRY_NOT_FOUND.getMessage(), entryId)
        );
    }

    private static final CefrLevel DEFAULT_CEFR_LEVEL = CefrLevel.B1;
    private static final String DEFAULT_POS = "NOUN";

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
                .isActive(t.isActive())
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
                .isActive(s.isActive())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
