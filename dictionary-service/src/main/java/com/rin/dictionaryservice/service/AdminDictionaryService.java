package com.rin.dictionaryservice.service;

import com.rin.dictionaryservice.constant.WordCreationStatus;
import com.rin.dictionaryservice.dto.admin.*;
import com.rin.dictionaryservice.exception.DictionaryErrorCode;
import com.rin.dictionaryservice.model.CefrLevel;
import com.rin.dictionaryservice.model.VocabSubTopic;
import com.rin.dictionaryservice.model.VocabTopic;
import com.rin.dictionaryservice.model.VocabWordEntry;
import com.rin.dictionaryservice.model.Word;
import com.rin.dictionaryservice.repository.VocabSubTopicRepository;
import com.rin.dictionaryservice.repository.VocabTopicRepository;
import com.rin.dictionaryservice.repository.VocabWordEntryRepository;
import com.rin.dictionaryservice.repository.WordRepository;
import com.rin.dictionaryservice.service.support.VocabContextScoringHelper;
import com.rin.englishlearning.common.dto.PageResponse;
import com.rin.englishlearning.common.exception.BaseException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.ConditionalOperators;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class AdminDictionaryService {

    WordRepository wordRepository;
    VocabWordEntryRepository wordEntryRepository;
    VocabTopicRepository topicRepository;
    VocabSubTopicRepository subTopicRepository;
    MongoTemplate mongoTemplate;
    VocabContextScoringHelper scoringHelper;

    public PageResponse<AdminWordResponse> listWords(
            String q,
            String pos,
            String status,
            Boolean used,
            boolean deepFields,
            int page,
            int size,
            String sort
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? 20 : Math.min(size, 100);

        Query query = new Query();
        Criteria criteria = new Criteria();
        List<Criteria> andConditions = new ArrayList<>();

        String keyword = safeTrim(q);
        if (!keyword.isBlank()) {
            andConditions.add(buildSearchCriteria(keyword, deepFields));
        }

        String normalizedPos = normalizePos(pos);
        if (!normalizedPos.isBlank()) {
            andConditions.add(Criteria.where("pos").is(normalizedPos));
        }

        WordCreationStatus statusFilter = parseStatusFilter(status);
        if (statusFilter != null) {
            andConditions.add(Criteria.where("status").is(statusFilter));
        }

        if (used != null) {
            Set<String> usedWordIds = fetchAllUsedWordIds();
            if (Boolean.TRUE.equals(used)) {
                if (usedWordIds.isEmpty()) {
                    return PageResponse.<AdminWordResponse>builder()
                            .data(List.of())
                            .page(safePage)
                            .size(safeSize)
                            .totalElements(0)
                            .totalPages(0)
                            .hasNext(false)
                            .hasPrevious(safePage > 0)
                            .build();
                }
                andConditions.add(Criteria.where("_id").in(usedWordIds));
            } else {
                if (!usedWordIds.isEmpty()) {
                    andConditions.add(Criteria.where("_id").nin(usedWordIds));
                }
            }
        }

        if (!andConditions.isEmpty()) {
            criteria.andOperator(andConditions.toArray(new Criteria[0]));
            query.addCriteria(criteria);
        }

        long totalElements = mongoTemplate.count(Query.of(query), Word.class);
        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / safeSize);

        Sort dbSort = resolveSort(sort);
        query.with(dbSort);
        query.skip((long) safePage * safeSize);
        query.limit(safeSize);

        List<Word> words = mongoTemplate.find(query, Word.class);
        Map<String, UsageCount> usageCountMap = fetchUsageCounts(words);

        List<AdminWordResponse> items = words.stream()
                .map(word -> {
                    UsageCount usage = usageCountMap.getOrDefault(word.getKey() + "|" + word.getPos(), UsageCount.empty(word.getKey(), word.getPos()));
                    return AdminWordResponse.builder()
                            .id(word.getId())
                            .text(word.getText())
                            .key(word.getKey())
                            .pos(word.getPos())
                            .status(word.getStatus())
                            .summaryVi(word.getSummaryVi())
                            .cefrLevel(word.getCefrLevel())
                            .phonetics(word.getPhonetics())
                            .definitionCount(word.getDefinitions() == null ? 0 : word.getDefinitions().size())
                            .usedEntryCount(usage.getUsedEntryCount())
                            .readyEntryCount(usage.getReadyEntryCount())
                            .createdAt(word.getCreatedAt())
                            .updatedAt(word.getUpdatedAt())
                            .build();
                })
                .toList();

        return PageResponse.<AdminWordResponse>builder()
                .data(items)
                .page(safePage)
                .size(safeSize)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .hasNext(safePage + 1 < totalPages)
                .hasPrevious(safePage > 0)
                .build();
    }

    public AdminWordDetailResponse getWordDetail(String wordId) {
        return buildWordDetailResponse(getWordOrThrow(wordId), null, true);
    }

    public AdminWordDetailResponse createWordAsPending(CreateAdminWordRequest request) {
        String normalizedText = normalizeDisplayText(request.getWordText());
        if (normalizedText.isBlank()) {
            throw wordCreateInvalid("wordText must not be blank");
        }

        String normalizedKey = normalizeWordKey(normalizedText);
        if (normalizedKey.isBlank()) {
            throw wordCreateInvalid("wordText cannot be normalized");
        }

        String normalizedPos = normalizePos(request.getPos());
        if (normalizedPos.isBlank()) {
            throw wordCreateInvalid("pos is required");
        }

        String wordId = normalizedKey + "|" + normalizedPos;
        if (wordRepository.existsById(wordId)) {
            throw new BaseException(
                    DictionaryErrorCode.WORD_ALREADY_EXISTS,
                    String.format(DictionaryErrorCode.WORD_ALREADY_EXISTS.getMessage(), wordId)
            );
        }

        Word word = Word.builder()
                .id(wordId)
                .text(normalizedText)
                .key(normalizedKey)
                .pos(normalizedPos)
                .context(safeTrim(request.getContext()))
                .status(WordCreationStatus.PENDING)
                .definitions(List.of())
                .build();

        wordRepository.save(word);
        return buildWordDetailResponse(word, null, true);
    }

    public AdminWordDetailResponse updateWordBasic(String wordId, UpdateAdminWordRequest request) {
        Word word = getWordOrThrow(wordId);

        if (request.getText() != null) {
            String normalizedText = normalizeDisplayText(request.getText());
            if (normalizedText.isBlank()) {
                throw wordUpdateInvalid("text cannot be blank");
            }
            word.setText(normalizedText);
        }
        if (request.getSummaryVi() != null) word.setSummaryVi(request.getSummaryVi().trim());
        if (request.getPhonetics() != null) word.setPhonetics(request.getPhonetics());
        if (request.getCefrLevel() != null) word.setCefrLevel(parseCefrLevel(request.getCefrLevel()));
        if (request.getIsPhrase() != null) word.setPhrase(request.getIsPhrase());
        if (request.getPhraseType() != null) word.setPhraseType(safeTrim(request.getPhraseType()));
        if (request.getIsValid() != null) word.setValid(request.getIsValid());
        if (request.getContext() != null) word.setContext(safeTrim(request.getContext()));
        if (request.getStatus() != null) word.setStatus(parseWordStatusRequired(request.getStatus()));

        wordRepository.save(word);
        return buildWordDetailResponse(word, null, true);
    }

    public AdminWordDetailResponse updateDefinitions(String wordId, UpdateWordDefinitionsRequest request) {
        Word word = getWordOrThrow(wordId);
        List<Word.Definition> oldDefinitions = cloneDefinitions(word.getDefinitions());
        List<Word.Definition> newDefinitions = mapDefinitionDtos(request.getDefinitions());

        logDefinitionWarnings(word, newDefinitions);

        word.setDefinitions(newDefinitions);
        if (!newDefinitions.isEmpty() && word.getStatus() != WordCreationStatus.READY) {
            word.setStatus(WordCreationStatus.READY);
        }
        wordRepository.save(word);

        WordDefinitionSyncSummary syncSummary = WordDefinitionSyncSummary.builder()
                .updatedEntryCount(0)
                .rescoredEntryCount(0)
                .skippedEntryCount(0)
                .build();

        if (Boolean.TRUE.equals(request.getSyncUsedEntries())) {
            syncSummary = syncEntriesAfterDefinitionsUpdate(word, oldDefinitions, newDefinitions);
        }

        return buildWordDetailResponse(word, syncSummary, true);
    }

    public AdminWordDetailResponse patchDefinition(String wordId, int index, PatchWordDefinitionRequest request) {
        Word word = getWordOrThrow(wordId);
        List<Word.Definition> definitions = cloneDefinitions(word.getDefinitions());

        if (index < 0 || index >= definitions.size()) {
            throw new BaseException(
                    DictionaryErrorCode.WORD_DEFINITION_INDEX_INVALID,
                    String.format(DictionaryErrorCode.WORD_DEFINITION_INDEX_INVALID.getMessage(), index)
            );
        }

        Word.Definition oldDefinition = cloneDefinition(definitions.get(index));
        Word.Definition target = definitions.get(index);

        if (request.getDefinition() != null) target.setDefinition(request.getDefinition().trim());
        if (request.getMeaningVi() != null) target.setMeaningVi(request.getMeaningVi().trim());
        if (request.getExample() != null) target.setExample(request.getExample().trim());
        if (request.getViExample() != null) target.setViExample(request.getViExample().trim());
        if (request.getLevel() != null) target.setLevel(parseCefrLevel(request.getLevel()));

        logDefinitionWarnings(word, List.of(target));

        word.setDefinitions(definitions);
        if (!definitions.isEmpty() && word.getStatus() != WordCreationStatus.READY) {
            word.setStatus(WordCreationStatus.READY);
        }
        wordRepository.save(word);

        WordDefinitionSyncSummary syncSummary = WordDefinitionSyncSummary.builder()
                .updatedEntryCount(0)
                .rescoredEntryCount(0)
                .skippedEntryCount(0)
                .build();

        if (Boolean.TRUE.equals(request.getSyncUsedEntries())) {
            syncSummary = syncEntriesForSingleDefinition(word, oldDefinition, target);
        }

        return buildWordDetailResponse(word, syncSummary, true);
    }

    public void deleteWord(String wordId) {
        Word word = getWordOrThrow(wordId);
        long usageCount = wordEntryRepository.countByWordKeyAndPos(word.getKey(), word.getPos());
        if (usageCount > 0) {
            throw new BaseException(
                    DictionaryErrorCode.WORD_IN_USE,
                    String.format(DictionaryErrorCode.WORD_IN_USE.getMessage(), usageCount)
            );
        }
        wordRepository.deleteById(wordId);
    }

    public AdminWordDetailResponse regenerateWord(String wordId, RegenerateWordRequest request) {
        Word word = getWordOrThrow(wordId);
        word.setStatus(WordCreationStatus.PENDING);
        if (request != null && Boolean.TRUE.equals(request.getClearDefinitions())) {
            word.setDefinitions(List.of());
        }
        wordRepository.save(word);
        return buildWordDetailResponse(word, null, true);
    }

    public PageResponse<WordEntryUsageResponse> listWordUsages(String wordId, int page, int size, Boolean onlyReady) {
        Word word = getWordOrThrow(wordId);
        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? 20 : Math.min(size, 100);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<VocabWordEntry> resultPage;
        if (onlyReady == null) {
            resultPage = wordEntryRepository.findAllByWordKeyAndPos(word.getKey(), word.getPos(), pageable);
        } else {
            resultPage = wordEntryRepository.findAllByWordKeyAndPosAndWordReady(word.getKey(), word.getPos(), onlyReady, pageable);
        }

        List<WordEntryUsageResponse> usages = mapEntryUsageResponses(resultPage.getContent());
        return PageResponse.<WordEntryUsageResponse>builder()
                .data(usages)
                .page(safePage)
                .size(safeSize)
                .totalElements(resultPage.getTotalElements())
                .totalPages(resultPage.getTotalPages())
                .hasNext(resultPage.hasNext())
                .hasPrevious(resultPage.hasPrevious())
                .build();
    }

    private WordDefinitionSyncSummary syncEntriesAfterDefinitionsUpdate(
            Word word,
            List<Word.Definition> oldDefinitions,
            List<Word.Definition> newDefinitions
    ) {
        List<VocabWordEntry> entries = wordEntryRepository.findAllByWordKeyAndPosAndWordReadyTrue(word.getKey(), word.getPos());
        if (entries.isEmpty()) {
            return WordDefinitionSyncSummary.builder().updatedEntryCount(0).rescoredEntryCount(0).skippedEntryCount(0).build();
        }

        if (newDefinitions.isEmpty()) {
            return WordDefinitionSyncSummary.builder()
                    .updatedEntryCount(0)
                    .rescoredEntryCount(0)
                    .skippedEntryCount(entries.size())
                    .build();
        }

        Map<String, VocabTopic> topicMap = topicRepository.findAllById(entries.stream().map(VocabWordEntry::getTopicId).filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(VocabTopic::getId, t -> t));
        Map<String, VocabSubTopic> subtopicMap = subTopicRepository.findAllById(entries.stream().map(VocabWordEntry::getSubtopicId).filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(VocabSubTopic::getId, s -> s));

        int updated = 0;
        int rescored = 0;
        int skipped = 0;

        for (VocabWordEntry entry : entries) {
            int matchedOldIndex = findMatchedOldDefinitionIndex(entry, oldDefinitions);
            Word.Definition targetDefinition = null;

            if (matchedOldIndex >= 0 && matchedOldIndex < oldDefinitions.size()) {
                Word.Definition oldDefinition = oldDefinitions.get(matchedOldIndex);
                int movedIndex = findDefinitionIndexByContent(newDefinitions, oldDefinition);
                if (movedIndex >= 0 && movedIndex != matchedOldIndex) {
                    targetDefinition = newDefinitions.get(movedIndex);
                } else if (matchedOldIndex < newDefinitions.size()) {
                    targetDefinition = newDefinitions.get(matchedOldIndex);
                } else if (movedIndex >= 0) {
                    targetDefinition = newDefinitions.get(movedIndex);
                }

                if (targetDefinition != null) {
                    applyDefinitionToEntry(entry, targetDefinition);
                    updated++;
                    continue;
                }
            }

            VocabTopic topic = topicMap.get(entry.getTopicId());
            VocabSubTopic subtopic = subtopicMap.get(entry.getSubtopicId());
            Word.Definition rescoredDefinition = scoringHelper.selectDefinition(word, topic, subtopic);
            if (isBlank(rescoredDefinition.getDefinition()) && isBlank(rescoredDefinition.getMeaningVi())) {
                skipped++;
                continue;
            }

            applyDefinitionToEntry(entry, rescoredDefinition);
            rescored++;
        }

        wordEntryRepository.saveAll(entries);

        return WordDefinitionSyncSummary.builder()
                .updatedEntryCount(updated)
                .rescoredEntryCount(rescored)
                .skippedEntryCount(skipped)
                .build();
    }

    private WordDefinitionSyncSummary syncEntriesForSingleDefinition(
            Word word,
            Word.Definition oldDefinition,
            Word.Definition newDefinition
    ) {
        List<VocabWordEntry> entries = wordEntryRepository.findAllByWordKeyAndPosAndWordReadyTrue(word.getKey(), word.getPos());
        if (entries.isEmpty()) {
            return WordDefinitionSyncSummary.builder().updatedEntryCount(0).rescoredEntryCount(0).skippedEntryCount(0).build();
        }

        int updated = 0;
        int skipped = 0;
        for (VocabWordEntry entry : entries) {
            if (!entryMatchesDefinition(entry, oldDefinition)) {
                skipped++;
                continue;
            }
            applyDefinitionToEntry(entry, newDefinition);
            updated++;
        }

        if (updated > 0) {
            wordEntryRepository.saveAll(entries);
        }

        return WordDefinitionSyncSummary.builder()
                .updatedEntryCount(updated)
                .rescoredEntryCount(0)
                .skippedEntryCount(skipped)
                .build();
    }

    private AdminWordDetailResponse buildWordDetailResponse(
            Word word,
            WordDefinitionSyncSummary syncSummary,
            boolean includePreview
    ) {
        long usedEntryCount = wordEntryRepository.countByWordKeyAndPos(word.getKey(), word.getPos());
        long readyEntryCount = wordEntryRepository.countByWordKeyAndPosAndWordReadyTrue(word.getKey(), word.getPos());

        List<WordEntryUsageResponse> preview = List.of();
        if (includePreview && usedEntryCount > 0) {
            Query previewQuery = new Query()
                    .addCriteria(Criteria.where("wordKey").is(word.getKey()).and("pos").is(word.getPos()))
                    .with(Sort.by(Sort.Direction.DESC, "createdAt"))
                    .limit(10);
            preview = mapEntryUsageResponses(mongoTemplate.find(previewQuery, VocabWordEntry.class));
        }

        return AdminWordDetailResponse.builder()
                .id(word.getId())
                .text(word.getText())
                .key(word.getKey())
                .pos(word.getPos())
                .status(word.getStatus())
                .summaryVi(word.getSummaryVi())
                .phonetics(word.getPhonetics())
                .definitions(mapDefinitions(word))
                .isPhrase(word.isPhrase())
                .phraseType(word.getPhraseType())
                .isValid(word.isValid())
                .cefrLevel(word.getCefrLevel())
                .context(word.getContext())
                .usedEntryCount(usedEntryCount)
                .readyEntryCount(readyEntryCount)
                .entriesPreview(preview)
                .syncSummary(syncSummary)
                .createdAt(word.getCreatedAt())
                .updatedAt(word.getUpdatedAt())
                .build();
    }

    private List<WordDefinitionDto> mapDefinitions(Word word) {
        List<Word.Definition> definitions = word.getDefinitions() == null ? List.of() : word.getDefinitions();
        return definitions.stream()
                .map(def -> WordDefinitionDto.builder()
                        .definition(def.getDefinition())
                        .meaningVi(def.getMeaningVi())
                        .example(def.getExample())
                        .viExample(def.getViExample())
                        .level(def.getLevel() == null ? null : def.getLevel().name())
                        .exampleContainsExactWord(exampleContainsExactWord(word, def.getExample()))
                        .build())
                .toList();
    }

    private List<Word.Definition> mapDefinitionDtos(List<WordDefinitionDto> dtos) {
        if (dtos == null || dtos.isEmpty()) {
            return List.of();
        }
        return dtos.stream()
                .map(dto -> Word.Definition.builder()
                        .definition(safeTrim(dto.getDefinition()))
                        .meaningVi(safeTrim(dto.getMeaningVi()))
                        .example(safeTrim(dto.getExample()))
                        .viExample(safeTrim(dto.getViExample()))
                        .level(parseCefrLevelOrDefault(dto.getLevel(), CefrLevel.B1))
                        .build())
                .toList();
    }

    private List<WordEntryUsageResponse> mapEntryUsageResponses(List<VocabWordEntry> entries) {
        if (entries == null || entries.isEmpty()) {
            return List.of();
        }

        Map<String, String> topicTitles = topicRepository.findAllById(entries.stream()
                        .map(VocabWordEntry::getTopicId)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toSet()))
                .stream()
                .collect(Collectors.toMap(VocabTopic::getId, VocabTopic::getTitle));

        Map<String, String> subtopicTitles = subTopicRepository.findAllById(entries.stream()
                        .map(VocabWordEntry::getSubtopicId)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toSet()))
                .stream()
                .collect(Collectors.toMap(VocabSubTopic::getId, VocabSubTopic::getTitle));

        return entries.stream()
                .map(entry -> WordEntryUsageResponse.builder()
                        .entryId(entry.getId())
                        .topicId(entry.getTopicId())
                        .topicTitle(topicTitles.getOrDefault(entry.getTopicId(), entry.getTopicId()))
                        .subtopicId(entry.getSubtopicId())
                        .subtopicTitle(subtopicTitles.getOrDefault(entry.getSubtopicId(), entry.getSubtopicId()))
                        .wordKey(entry.getWordKey())
                        .wordText(entry.getWordText() != null ? entry.getWordText() : entry.getWordKey().replace('_', ' '))
                        .pos(entry.getPos())
                        .wordReady(entry.isWordReady())
                        .contextDefinition(entry.getContextDefinition())
                        .contextMeaningVi(entry.getContextMeaningVi())
                        .contextExample(entry.getContextExample())
                        .contextViExample(entry.getContextViExample())
                        .contextLevel(entry.getContextLevel() == null ? null : entry.getContextLevel().name())
                        .build())
                .toList();
    }

    private Map<String, UsageCount> fetchUsageCounts(List<Word> words) {
        if (words == null || words.isEmpty()) {
            return Map.of();
        }

        List<Criteria> pairCriteria = words.stream()
                .map(word -> Criteria.where("wordKey").is(word.getKey()).and("pos").is(word.getPos()))
                .toList();

        Aggregation aggregation = Aggregation.newAggregation(
                Aggregation.match(new Criteria().orOperator(pairCriteria.toArray(new Criteria[0]))),
                Aggregation.group("wordKey", "pos")
                        .count().as("usedEntryCount")
                        .sum(ConditionalOperators.when(Criteria.where("wordReady").is(true)).then(1).otherwise(0))
                        .as("readyEntryCount"),
                Aggregation.project("usedEntryCount", "readyEntryCount")
                        .and("_id.wordKey").as("wordKey")
                        .and("_id.pos").as("pos")
        );

        return mongoTemplate.aggregate(aggregation, "vocab_word_entries", UsageCount.class)
                .getMappedResults()
                .stream()
                .collect(Collectors.toMap(
                        item -> item.getWordKey() + "|" + item.getPos(),
                        item -> item
                ));
    }

    private Set<String> fetchAllUsedWordIds() {
        Aggregation aggregation = Aggregation.newAggregation(
                Aggregation.group("wordKey", "pos")
                        .count().as("usedEntryCount"),
                Aggregation.project("usedEntryCount")
                        .and("_id.wordKey").as("wordKey")
                        .and("_id.pos").as("pos")
        );

        return mongoTemplate.aggregate(aggregation, "vocab_word_entries", UsageCount.class)
                .getMappedResults()
                .stream()
                .map(item -> item.getWordKey() + "|" + item.getPos())
                .collect(Collectors.toSet());
    }

    private Word getWordOrThrow(String wordId) {
        return wordRepository.findById(wordId)
                .orElseThrow(() -> new BaseException(
                        DictionaryErrorCode.WORD_NOT_FOUND,
                        String.format(DictionaryErrorCode.WORD_NOT_FOUND.getMessage(), wordId)
                ));
    }

    private Sort resolveSort(String sort) {
        String normalized = safeTrim(sort);
        return switch (normalized) {
            case "updatedAsc" -> Sort.by(Sort.Direction.ASC, "updatedAt");
            case "createdDesc" -> Sort.by(Sort.Direction.DESC, "createdAt");
            case "createdAsc" -> Sort.by(Sort.Direction.ASC, "createdAt");
            case "wordAsc" -> Sort.by(Sort.Direction.ASC, "text");
            case "wordDesc" -> Sort.by(Sort.Direction.DESC, "text");
            case "updatedDesc", "" -> Sort.by(Sort.Direction.DESC, "updatedAt");
            default -> Sort.by(Sort.Direction.DESC, "updatedAt");
        };
    }

    private WordCreationStatus parseStatusFilter(String status) {
        String normalized = safeTrim(status).toUpperCase(Locale.ROOT);
        if (normalized.isBlank() || "ALL".equals(normalized)) {
            return null;
        }
        try {
            return WordCreationStatus.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            throw wordUpdateInvalid("status filter invalid: " + status);
        }
    }

    private WordCreationStatus parseWordStatusRequired(String status) {
        String normalized = safeTrim(status).toUpperCase(Locale.ROOT);
        if (normalized.isBlank()) {
            throw wordUpdateInvalid("status is blank");
        }
        try {
            return WordCreationStatus.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            throw wordUpdateInvalid("status invalid: " + status);
        }
    }

    private CefrLevel parseCefrLevel(String level) {
        String normalized = safeTrim(level).toUpperCase(Locale.ROOT);
        if (normalized.isBlank()) {
            return null;
        }
        try {
            return CefrLevel.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            throw wordUpdateInvalid("cefrLevel invalid: " + level);
        }
    }

    private CefrLevel parseCefrLevelOrDefault(String level, CefrLevel fallback) {
        CefrLevel parsed = parseCefrLevel(level);
        return parsed == null ? fallback : parsed;
    }

    private String normalizeDisplayText(String raw) {
        return safeTrim(raw).replaceAll("\\s+", " ");
    }

    private String normalizePos(String raw) {
        String normalized = safeTrim(raw).toUpperCase(Locale.ROOT)
                .replace(' ', '_')
                .replace('-', '_');
        return normalized.replaceAll("_+", "_").replaceAll("^_|_$", "");
    }

    private String normalizeWordKey(String wordText) {
        return safeTrim(wordText).toLowerCase(Locale.ROOT)
                .replace("'", "_")
                .replaceAll("[\\s-]+", "_")
                .replaceAll("[^\\p{L}\\p{N}+#./_]", "")
                .replaceAll("_+", "_")
                .replaceAll("^_|_$", "");
    }

    private Criteria buildSearchCriteria(String rawKeyword, boolean includeDeepFields) {
        String normalized = safeTrim(rawKeyword).replaceAll("\\s+", " ");
        String[] terms = normalized.split(" ");
        List<Criteria> perTerm = new ArrayList<>();

        for (String term : terms) {
            if (term.isBlank()) continue;

            String normalizedTerm = term.trim();
            String normalizedKeyTerm = normalizeWordKey(normalizedTerm);

            // Boundary match để tránh match quá rộng kiểu "requirement" ~= "requirements".
            Pattern boundaryPattern = Pattern.compile(
                    "(^|[^\\p{L}\\p{N}_])" + Pattern.quote(normalizedTerm) + "(?=[^\\p{L}\\p{N}_]|$)",
                    Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
            );
            Pattern keyPrefixPattern = Pattern.compile("^" + Pattern.quote(normalizedKeyTerm), Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

            List<Criteria> orFields = new ArrayList<>();
            orFields.add(Criteria.where("text").regex(boundaryPattern));
            orFields.add(Criteria.where("key").regex(keyPrefixPattern));
            // summaryVi thuộc basic scope (không phụ thuộc deep fields).
            orFields.add(Criteria.where("summaryVi").regex(boundaryPattern));

            // Deep fields (definitions/examples) chỉ bật theo tùy chọn và term đủ dài.
            if (includeDeepFields && normalizedTerm.length() >= 3) {
                orFields.add(Criteria.where("definitions.definition").regex(boundaryPattern));
                orFields.add(Criteria.where("definitions.meaningVi").regex(boundaryPattern));
                orFields.add(Criteria.where("definitions.example").regex(boundaryPattern));
                orFields.add(Criteria.where("definitions.viExample").regex(boundaryPattern));
            }

            perTerm.add(new Criteria().orOperator(orFields.toArray(new Criteria[0])));
        }

        if (perTerm.isEmpty()) {
            return new Criteria();
        }

        if (perTerm.size() == 1) {
            return perTerm.get(0);
        }

        return new Criteria().andOperator(perTerm.toArray(new Criteria[0]));
    }

    private String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private BaseException wordCreateInvalid(String message) {
        return new BaseException(
                DictionaryErrorCode.WORD_CREATE_INVALID,
                String.format(DictionaryErrorCode.WORD_CREATE_INVALID.getMessage(), message)
        );
    }

    private BaseException wordUpdateInvalid(String message) {
        return new BaseException(
                DictionaryErrorCode.WORD_UPDATE_INVALID,
                String.format(DictionaryErrorCode.WORD_UPDATE_INVALID.getMessage(), message)
        );
    }

    private List<Word.Definition> cloneDefinitions(List<Word.Definition> definitions) {
        if (definitions == null || definitions.isEmpty()) {
            return new ArrayList<>();
        }
        return definitions.stream().map(this::cloneDefinition).collect(Collectors.toCollection(ArrayList::new));
    }

    private Word.Definition cloneDefinition(Word.Definition definition) {
        if (definition == null) {
            return Word.Definition.builder().build();
        }
        return Word.Definition.builder()
                .definition(definition.getDefinition())
                .meaningVi(definition.getMeaningVi())
                .example(definition.getExample())
                .viExample(definition.getViExample())
                .level(definition.getLevel())
                .build();
    }

    private int findMatchedOldDefinitionIndex(VocabWordEntry entry, List<Word.Definition> oldDefinitions) {
        if (oldDefinitions == null || oldDefinitions.isEmpty()) {
            return -1;
        }
        for (int i = 0; i < oldDefinitions.size(); i++) {
            if (entryMatchesDefinition(entry, oldDefinitions.get(i))) {
                return i;
            }
        }
        return -1;
    }

    private int findDefinitionIndexByContent(List<Word.Definition> definitions, Word.Definition target) {
        if (definitions == null || target == null) {
            return -1;
        }
        for (int i = 0; i < definitions.size(); i++) {
            if (sameDefinitionContent(definitions.get(i), target)) {
                return i;
            }
        }
        return -1;
    }

    private boolean sameDefinitionContent(Word.Definition a, Word.Definition b) {
        if (a == null || b == null) {
            return false;
        }
        return Objects.equals(normalizeContextText(a.getDefinition()), normalizeContextText(b.getDefinition()))
                && Objects.equals(normalizeContextText(a.getMeaningVi()), normalizeContextText(b.getMeaningVi()))
                && Objects.equals(normalizeContextText(a.getExample()), normalizeContextText(b.getExample()))
                && Objects.equals(normalizeContextText(a.getViExample()), normalizeContextText(b.getViExample()));
    }

    private boolean entryMatchesDefinition(VocabWordEntry entry, Word.Definition def) {
        if (entry == null || def == null) {
            return false;
        }

        boolean sameDefinition = !isBlank(def.getDefinition())
                && normalizeContextText(def.getDefinition()).equals(normalizeContextText(entry.getContextDefinition()));
        boolean sameMeaning = !isBlank(def.getMeaningVi())
                && normalizeContextText(def.getMeaningVi()).equals(normalizeContextText(entry.getContextMeaningVi()));
        boolean sameExample = !isBlank(def.getExample())
                && normalizeContextText(def.getExample()).equals(normalizeContextText(entry.getContextExample()));

        return sameDefinition || sameMeaning || sameExample;
    }

    private String normalizeContextText(String value) {
        return safeTrim(value).replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    private void applyDefinitionToEntry(VocabWordEntry entry, Word.Definition definition) {
        entry.setContextDefinition(definition.getDefinition());
        entry.setContextMeaningVi(definition.getMeaningVi());
        entry.setContextExample(definition.getExample());
        entry.setContextViExample(definition.getViExample());
        entry.setContextLevel(definition.getLevel());
    }

    private void logDefinitionWarnings(Word word, List<Word.Definition> definitions) {
        if (definitions == null || definitions.isEmpty()) {
            return;
        }
        for (int i = 0; i < definitions.size(); i++) {
            String example = definitions.get(i).getExample();
            if (isBlank(example)) continue;
            if (!exampleContainsExactWord(word, example)) {
                log.warn(
                        "[AdminDictionary] Example may not contain exact word token for {} at definition index {}",
                        word.getId(),
                        i
                );
            }
        }
    }

    private boolean exampleContainsExactWord(Word word, String example) {
        if (word == null || isBlank(word.getText()) || isBlank(example)) {
            return true;
        }

        String normalizedWord = normalizeDisplayText(word.getText()).toLowerCase(Locale.ROOT);
        String normalizedExample = normalizeDisplayText(example).toLowerCase(Locale.ROOT);
        if (normalizedWord.isBlank() || normalizedExample.isBlank()) {
            return true;
        }

        String regex;
        boolean phraseLike = word.isPhrase() || normalizedWord.contains(" ");
        if (phraseLike) {
            String[] parts = normalizedWord.split("\\s+");
            String joined = Arrays.stream(parts)
                    .map(Pattern::quote)
                    .collect(Collectors.joining("\\s+"));
            regex = "(?iu)(^|\\W)" + joined + "(?=\\W|$)";
        } else {
            regex = "(?iu)(^|\\W)" + Pattern.quote(normalizedWord) + "(?=\\W|$)";
        }

        return Pattern.compile(regex).matcher(normalizedExample).find();
    }

    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    private static class UsageCount {
        String wordKey;
        String pos;
        long usedEntryCount;
        long readyEntryCount;

        static UsageCount empty(String wordKey, String pos) {
            return new UsageCount(wordKey, pos, 0, 0);
        }
    }
}
