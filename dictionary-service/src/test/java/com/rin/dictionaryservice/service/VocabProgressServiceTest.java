package com.rin.dictionaryservice.service;

import com.rin.dictionaryservice.constant.VocabSubTopicStatus;
import com.rin.dictionaryservice.dto.VocabSessionSubmitRequest;
import com.rin.dictionaryservice.dto.VocabSessionWordRequest;
import com.rin.dictionaryservice.kafka.KafkaProducer;
import com.rin.dictionaryservice.model.*;
import com.rin.dictionaryservice.repository.UserVocabProgressRepository;
import com.rin.dictionaryservice.repository.VocabSubTopicRepository;
import com.rin.dictionaryservice.repository.VocabWordEntryRepository;
import com.rin.englishlearning.common.event.GamificationRewardEvent;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class VocabProgressServiceTest {
    UserVocabProgressRepository progressRepository = mock(UserVocabProgressRepository.class);
    VocabSubTopicRepository subtopicRepository = mock(VocabSubTopicRepository.class);
    VocabWordEntryRepository wordRepository = mock(VocabWordEntryRepository.class);
    com.rin.dictionaryservice.repository.VocabTopicRepository topicRepository = mock(com.rin.dictionaryservice.repository.VocabTopicRepository.class);
    KafkaProducer kafkaProducer = mock(KafkaProducer.class);
    VocabService vocabService = mock(VocabService.class);
    VocabProgressService service = new VocabProgressService(progressRepository, subtopicRepository, wordRepository, topicRepository, kafkaProducer, vocabService);
    UserVocabProgress stored;

    @BeforeEach
    void setup() {
        Jwt jwt = new Jwt("token", Instant.now(), Instant.now().plusSeconds(60), Map.of("alg", "none"), Map.of("sub", "user-1"));
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt, List.of(), "user-1"));
        VocabSubTopic subtopic = VocabSubTopic.builder().id("sub-1").isActive(true)
                .status(VocabSubTopicStatus.READY).readyWordCount(10).cefrLevel(CefrLevel.A1).build();
        VocabWordEntry word = VocabWordEntry.builder().id("word-1").subtopicId("sub-1").wordReady(true).build();
        when(subtopicRepository.findById("sub-1")).thenReturn(Optional.of(subtopic));
        when(wordRepository.findById("word-1")).thenReturn(Optional.of(word));
        when(wordRepository.findAllById(any())).thenReturn(List.of(word));
        when(progressRepository.findByUserIdAndSubtopicId("user-1", "sub-1")).thenAnswer(i -> Optional.ofNullable(stored));
        when(progressRepository.save(any())).thenAnswer(i -> stored = i.getArgument(0));
    }

    @AfterEach void cleanup() { SecurityContextHolder.clearContext(); }

    @Test
    void rewardsOnlyTheIncreaseBeyondTheBestPreviouslyRewardedScore() {
        service.submitSession("sub-1", request("s1", VocabReviewRating.DONE));
        service.submitSession("sub-1", request("s2", VocabReviewRating.AGAIN));
        service.submitSession("sub-1", request("s3", VocabReviewRating.DONE));

        ArgumentCaptor<GamificationRewardEvent> event = ArgumentCaptor.forClass(GamificationRewardEvent.class);
        verify(kafkaProducer, times(1)).sendGamificationReward(event.capture());
        assertThat(event.getValue().getDeltaScore()).isEqualTo(100);
        assertThat(stored.getWords().get("word-1").getBestRewardedScore()).isEqualTo(100);
    }

    @Test
    void retryingTheSameSessionDoesNotDuplicateActivityAndReusesTheEventId() {
        service.submitSession("sub-1", request("same-session", VocabReviewRating.MEDIUM));
        service.submitSession("sub-1", request("same-session", VocabReviewRating.MEDIUM));

        ArgumentCaptor<GamificationRewardEvent> events = ArgumentCaptor.forClass(GamificationRewardEvent.class);
        verify(kafkaProducer, times(2)).sendGamificationReward(events.capture());
        assertThat(events.getAllValues()).extracting(GamificationRewardEvent::getEventId).containsOnly("vocab-session:user-1:same-session");
        assertThat(stored.getActivityByDate().values()).containsExactly(1);
        assertThat(stored.getWords().get("word-1").getAttemptCount()).isEqualTo(1);
    }

    private VocabSessionSubmitRequest request(String sessionId, VocabReviewRating rating) {
        VocabSessionWordRequest word = new VocabSessionWordRequest();
        word.setWordId("word-1"); word.setRating(rating); word.setCompletedModes(Set.of(VocabLearningMode.FLASHCARD));
        VocabSessionSubmitRequest request = new VocabSessionSubmitRequest();
        request.setSessionId(sessionId); request.setWords(List.of(word));
        return request;
    }
}
