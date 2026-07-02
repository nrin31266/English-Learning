package com.rin.dictionaryservice.service;

import com.rin.dictionaryservice.constant.VocabSubTopicStatus;
import com.rin.dictionaryservice.dto.*;
import com.rin.dictionaryservice.exception.DictionaryErrorCode;
import com.rin.dictionaryservice.kafka.KafkaProducer;
import com.rin.dictionaryservice.model.*;
import com.rin.dictionaryservice.repository.*;
import com.rin.dictionaryservice.utils.SecurityUtils;
import com.rin.englishlearning.common.constants.*;
import com.rin.englishlearning.common.event.GamificationRewardEvent;
import com.rin.englishlearning.common.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.*;
import org.springframework.stereotype.Service;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class VocabProgressService {
    private static final ZoneId ACTIVITY_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final UserVocabProgressRepository progressRepository;
    private final VocabSubTopicRepository subtopicRepository;
    private final VocabWordEntryRepository wordRepository;
    private final VocabTopicRepository topicRepository;
    private final KafkaProducer kafkaProducer;
    private final VocabService vocabService;

    public VocabProgressResponse getProgress(String subtopicId) {
        String userId = requireUserId();
        VocabSubTopic subtopic = requirePublicSubtopic(subtopicId);
        UserVocabProgress progress = progressRepository.findByUserIdAndSubtopicId(userId, subtopicId)
                .orElseGet(() -> emptyProgress(userId, subtopicId));
        return toResponse(progress, subtopic.getReadyWordCount(), null, false);
    }

    public VocabProgressResponse submitSession(String subtopicId, VocabSessionSubmitRequest request) {
        return submitSession(subtopicId, request, true);
    }

    private VocabProgressResponse submitSession(String subtopicId, VocabSessionSubmitRequest request, boolean publishReward) {
        String userId = requireUserId();
        VocabSubTopic subtopic = requirePublicSubtopic(subtopicId);
        Map<String, VocabSessionWordRequest> requested = request.getWords().stream().collect(Collectors.toMap(
                VocabSessionWordRequest::getWordId, Function.identity(),
                (left, right) -> { throw new BaseException(DictionaryErrorCode.WORD_UPDATE_INVALID, "Duplicate word in session"); }));
        Map<String, VocabWordEntry> validWords = wordRepository.findAllById(requested.keySet()).stream()
                .filter(word -> word.isWordReady() && subtopicId.equals(word.getSubtopicId()))
                .collect(Collectors.toMap(VocabWordEntry::getId, Function.identity()));
        if (validWords.size() != requested.size()) {
            throw new BaseException(DictionaryErrorCode.WORD_ENTRY_NOT_FOUND, "Session contains an invalid vocab word");
        }

        for (int attempt = 0; attempt < 3; attempt++) {
            try {
                UserVocabProgress progress = progressRepository.findByUserIdAndSubtopicId(userId, subtopicId)
                        .orElseGet(() -> emptyProgress(userId, subtopicId));
                if (progress.getProcessedSessions() != null && progress.getProcessedSessions().containsKey(request.getSessionId())) {
                    int previousDelta = progress.getProcessedSessions().get(request.getSessionId());
                    if (publishReward && previousDelta > 0) publishSessionReward(userId, request.getSessionId(), previousDelta, subtopic);
                    return toResponse(progress, subtopic.getReadyWordCount(), request.getSessionId(), previousDelta > 0);
                }
                int rewardDelta = 0;
                for (VocabSessionWordRequest item : request.getWords()) {
                    UserVocabWordProgress previous = progress.getWords().get(item.getWordId());
                    if (progress.getRewardedScores() == null) progress.setRewardedScores(new HashMap<>());
                    int previousBest = Math.max(progress.getRewardedScores().getOrDefault(item.getWordId(), 0),
                            previous == null ? 0 : previous.getBestRewardedScore());
                    UserVocabWordProgress updated = buildWordProgress(previous, item.getWordId(), item.getRating(), item.getCompletedModes());
                    progress.getWords().put(item.getWordId(), updated);
                    int newBest = Math.max(previousBest, updated.getMasteryScore());
                    progress.getRewardedScores().put(item.getWordId(), newBest);
                    rewardDelta += Math.max(0, newBest - previousBest);
                }
                String today = LocalDate.now(ACTIVITY_ZONE).toString();
                if (progress.getActivityByDate() == null) progress.setActivityByDate(new HashMap<>());
                progress.getActivityByDate().merge(today, request.getWords().size(), Integer::sum);
                if (progress.getProcessedSessions() == null) progress.setProcessedSessions(new LinkedHashMap<>());
                boolean rewardExpected = rewardDelta > 0;
                progress.getProcessedSessions().put(request.getSessionId(), rewardDelta);
                while (progress.getProcessedSessions().size() > 500) {
                    progress.getProcessedSessions().remove(progress.getProcessedSessions().keySet().iterator().next());
                }
                progress.setMasteredWordCount((int) progress.getWords().values().stream()
                        .filter(word -> word.getReviewRating() == VocabReviewRating.DONE).count());
                progress.setUpdatedAt(Instant.now());
                UserVocabProgress saved = progressRepository.save(progress);

                if (publishReward && rewardExpected) publishSessionReward(userId, request.getSessionId(), rewardDelta, subtopic);
                return toResponse(saved, subtopic.getReadyWordCount(), request.getSessionId(), rewardExpected);
            } catch (OptimisticLockingFailureException | DuplicateKeyException ignored) {
                // Reload and retry the whole session; bestRewardedScore keeps reward delta monotonic.
            }
        }
        throw new BaseException(DictionaryErrorCode.VOCAB_PROGRESS_CONFLICT);
    }

    public VocabReviewQueueResponse getReviewQueue(int requestedLimit) {
        String userId = requireUserId();
        int limit = Math.max(1, Math.min(10, requestedLimit));
        Instant now = Instant.now();
        record DueRef(String subtopicId, String wordId, UserVocabWordProgress progress) {}
        List<DueRef> due = progressRepository.findAllByUserId(userId).stream()
                .flatMap(document -> (document.getWords() == null ? Stream.<UserVocabWordProgress>empty() : document.getWords().values().stream())
                        .filter(word -> isDue(word, now))
                        .map(word -> new DueRef(document.getSubtopicId(), word.getWordId(), word)))
                .sorted(Comparator.comparing(ref -> ref.progress().getNextReviewAt()))
                .toList();
        Map<String, VocabWordEntryResponse> entries = vocabService.getReadyWordEntriesById(
                due.stream().limit(limit).map(DueRef::wordId).toList());
        List<VocabReviewQueueResponse.ReviewWord> words = due.stream().limit(limit)
                .filter(ref -> entries.containsKey(ref.wordId()))
                .map(ref -> VocabReviewQueueResponse.ReviewWord.builder().subtopicId(ref.subtopicId())
                        .word(entries.get(ref.wordId())).progress(ref.progress()).build()).toList();
        return VocabReviewQueueResponse.builder().totalDue(due.size()).words(words).build();
    }

    public VocabProgressResponse submitReviewSession(VocabSessionSubmitRequest request) {
        String userId = requireUserId();
        if (request.getWords().size() > 10) throw new BaseException(DictionaryErrorCode.WORD_UPDATE_INVALID, "Review session is limited to 10 words");
        Instant now = Instant.now();
        Map<String, String> wordSubtopics = new HashMap<>();
        Map<String, UserVocabProgress> documents = new HashMap<>();
        for (UserVocabProgress document : progressRepository.findAllByUserId(userId)) {
            documents.put(document.getSubtopicId(), document);
            if (document.getWords() != null) document.getWords().keySet()
                    .forEach(wordId -> wordSubtopics.put(wordId, document.getSubtopicId()));
        }
        if (request.getWords().stream().anyMatch(item -> {
            String subtopicId = wordSubtopics.get(item.getWordId());
            if (subtopicId == null) return true;
            UserVocabProgress document = documents.get(subtopicId);
            UserVocabWordProgress progress = document.getWords().get(item.getWordId());
            String childSessionId = request.getSessionId() + ":" + subtopicId;
            return !isDue(progress, now) && (document.getProcessedSessions() == null
                    || !document.getProcessedSessions().containsKey(childSessionId));
        })) {
            throw new BaseException(DictionaryErrorCode.WORD_UPDATE_INVALID, "Review session contains a word that is not due");
        }
        Map<String, UserVocabWordProgress> merged = new HashMap<>();
        int rewardDelta = 0;
        for (Map.Entry<String, List<VocabSessionWordRequest>> group : request.getWords().stream()
                .collect(Collectors.groupingBy(item -> wordSubtopics.get(item.getWordId()))).entrySet()) {
            String childSessionId = request.getSessionId() + ":" + group.getKey();
            VocabSessionSubmitRequest child = new VocabSessionSubmitRequest();
            child.setSessionId(childSessionId); child.setWords(group.getValue());
            VocabProgressResponse response = submitSession(group.getKey(), child, false);
            merged.putAll(response.getWords());
            UserVocabProgress saved = progressRepository.findByUserIdAndSubtopicId(userId, group.getKey()).orElseThrow();
            rewardDelta += saved.getProcessedSessions().getOrDefault(childSessionId, 0);
        }
        if (rewardDelta > 0) {
            kafkaProducer.sendGamificationReward(GamificationRewardEvent.builder()
                    .eventId("vocab-review:" + userId + ":" + request.getSessionId()).userId(userId).deltaScore(rewardDelta)
                    .trigger(GamificationTrigger.VOCAB_WORD_REVIEWED).targetId(request.getSessionId())
                    .timestamp(System.currentTimeMillis()).difficulty(DifficultyLevel.UNKNOWN).build());
        }
        return VocabProgressResponse.builder().subtopicId("review").words(merged).learnedCount(request.getWords().size())
                .totalWordCount(request.getWords().size()).sessionId(request.getSessionId()).rewardExpected(rewardDelta > 0).build();
    }

    public VocabProgressDashboardResponse getDashboard() {
        String userId = requireUserId();
        List<UserVocabProgress> progresses = progressRepository.findAllByUserId(userId);
        Map<String, VocabSubTopic> subtopics = new HashMap<>();
        subtopicRepository.findAllById(progresses.stream().map(UserVocabProgress::getSubtopicId).toList())
                .forEach(sub -> subtopics.put(sub.getId(), sub));
        Instant now = Instant.now();
        Map<String, Integer> activity = new TreeMap<>();
        Map<String, int[]> topicCounts = new HashMap<>();
        List<VocabProgressDashboardResponse.SubtopicProgress> subtopicSummaries = new ArrayList<>();
        int mastered = 0, due = 0;

        for (UserVocabProgress progress : progresses) {
            VocabSubTopic subtopic = subtopics.get(progress.getSubtopicId());
            if (subtopic == null) continue;
            int subLearned = progress.getWords() == null ? 0 : progress.getWords().size();
            int subDue = progress.getWords() == null ? 0 : (int) progress.getWords().values().stream().filter(word -> isDue(word, now)).count();
            int subMastered = progress.getMasteredWordCount() != null ? progress.getMasteredWordCount()
                    : (progress.getWords() == null ? 0 : (int) progress.getWords().values().stream()
                    .filter(word -> word.getReviewRating() == VocabReviewRating.DONE).count());
            mastered += subMastered; due += subDue;
            if (progress.getActivityByDate() != null) progress.getActivityByDate().forEach((date, count) -> activity.merge(date, count, Integer::sum));
            if (subLearned == 0) continue;
            int subTotal = subtopic.getReadyWordCount();
            subtopicSummaries.add(VocabProgressDashboardResponse.SubtopicProgress.builder()
                    .subtopicId(subtopic.getId()).learnedWords(subLearned).totalWords(subTotal).dueReviewWords(subDue)
                    .status(subTotal > 0 && subLearned >= subTotal ? "COMPLETED" : "IN_PROGRESS").build());
            int[] counts = topicCounts.computeIfAbsent(subtopic.getTopicId(), ignored -> new int[2]);
            counts[0] += subLearned; counts[1] += subDue;
        }

        List<VocabProgressDashboardResponse.TopicProgress> topics = topicCounts.entrySet().stream().map(entry -> {
            int total = subtopicRepository.findAllByTopicIdAndIsActiveTrueOrderByOrder(entry.getKey()).stream()
                    .filter(sub -> sub.getStatus() == VocabSubTopicStatus.READY).mapToInt(VocabSubTopic::getReadyWordCount).sum();
            int topicLearned = entry.getValue()[0];
            VocabTopic topic = topicRepository.findById(entry.getKey()).orElse(null);
            return VocabProgressDashboardResponse.TopicProgress.builder().topicId(entry.getKey())
                    .title(topic == null ? "Vocabulary topic" : topic.getTitle())
                    .description(topic == null ? null : topic.getDescription()).thumbnailUrl(topic == null ? null : topic.getThumbnailUrl())
                    .cefrRange(topic == null ? null : topic.getCefrRange()).subtopicCount(topic == null ? 0 : topic.getReadySubtopicCount())
                    .learnedWords(topicLearned).totalWords(total).dueReviewWords(entry.getValue()[1])
                    .status(total > 0 && topicLearned >= total ? "COMPLETED" : "IN_PROGRESS").build();
        }).toList();
        return VocabProgressDashboardResponse.builder().totalMasteredWords(mastered).dueReviewWords(due)
                .activityByDate(activity).topics(topics).subtopics(subtopicSummaries).build();
    }

    private boolean isDue(UserVocabWordProgress word, Instant now) {
        return word.getReviewRating() != VocabReviewRating.DONE && word.getNextReviewAt() != null && !word.getNextReviewAt().isAfter(now);
    }

    private void publishSessionReward(String userId, String sessionId, int rewardDelta, VocabSubTopic subtopic) {
        kafkaProducer.sendGamificationReward(GamificationRewardEvent.builder()
                .eventId("vocab-session:" + userId + ":" + sessionId).userId(userId).deltaScore(rewardDelta)
                .trigger(GamificationTrigger.VOCAB_WORD_REVIEWED).targetId(sessionId)
                .timestamp(System.currentTimeMillis()).difficulty(toDifficulty(subtopic.getCefrLevel())).build());
    }

    private UserVocabWordProgress buildWordProgress(UserVocabWordProgress previous, String wordId,
                                                     VocabReviewRating rating, Set<VocabLearningMode> requestedModes) {
        Instant now = Instant.now();
        int score = scoreFor(rating);
        Set<VocabLearningMode> modes = previous == null || previous.getCompletedModes() == null
                ? new HashSet<>() : new HashSet<>(previous.getCompletedModes());
        if (requestedModes != null) modes.addAll(requestedModes);
        int previousBest = previous == null ? 0 : previous.getBestRewardedScore();
        return UserVocabWordProgress.builder().wordId(wordId).reviewRating(rating).masteryScore(score)
                .bestRewardedScore(Math.max(previousBest, score)).completedModes(modes)
                .attemptCount(previous == null ? 1 : previous.getAttemptCount() + 1)
                .firstStudiedAt(previous == null ? now : previous.getFirstStudiedAt())
                .lastStudiedAt(now).nextReviewAt(nextReviewAt(rating, now)).build();
    }

    private UserVocabProgress emptyProgress(String userId, String subtopicId) {
        return UserVocabProgress.builder().userId(userId).subtopicId(subtopicId)
                .words(new HashMap<>()).activityByDate(new HashMap<>()).rewardedScores(new HashMap<>())
                .processedSessions(new LinkedHashMap<>()).masteredWordCount(0).updatedAt(Instant.now()).build();
    }

    private VocabProgressResponse toResponse(UserVocabProgress progress, int total, String sessionId, boolean rewardExpected) {
        Map<String, UserVocabWordProgress> words = progress.getWords() == null ? Map.of() : progress.getWords();
        return VocabProgressResponse.builder().subtopicId(progress.getSubtopicId()).words(words)
                .learnedCount(words.size()).totalWordCount(total).sessionId(sessionId).rewardExpected(rewardExpected).build();
    }

    private VocabSubTopic requirePublicSubtopic(String subtopicId) {
        return subtopicRepository.findById(subtopicId).filter(sub -> sub.isActive() && sub.getStatus() == VocabSubTopicStatus.READY)
                .orElseThrow(() -> new BaseException(DictionaryErrorCode.SUBTOPIC_NOT_FOUND,
                        String.format(DictionaryErrorCode.SUBTOPIC_NOT_FOUND.getMessage(), subtopicId)));
    }
    private String requireUserId() { String id = SecurityUtils.getCurrentUserId(); if (id == null) throw new BaseException(BaseErrorCode.UNAUTHORIZED); return id; }
    private int scoreFor(VocabReviewRating rating) { return switch (rating) { case AGAIN -> 20; case HARD -> 40; case MEDIUM -> 60; case EASY, DONE -> 100; }; }
    private Instant nextReviewAt(VocabReviewRating rating, Instant now) { return switch (rating) { case AGAIN -> now.plus(1, ChronoUnit.DAYS); case HARD -> now.plus(3, ChronoUnit.DAYS); case MEDIUM -> now.plus(7, ChronoUnit.DAYS); case EASY -> now.plus(14, ChronoUnit.DAYS); case DONE -> null; }; }
    private DifficultyLevel toDifficulty(com.rin.dictionaryservice.model.CefrLevel level) { return level == null ? DifficultyLevel.UNKNOWN : DifficultyLevel.valueOf(level.name()); }
}
