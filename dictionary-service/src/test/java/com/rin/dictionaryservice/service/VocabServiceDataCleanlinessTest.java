package com.rin.dictionaryservice.service;

import com.rin.dictionaryservice.constant.VocabSubTopicStatus;
import com.rin.dictionaryservice.constant.VocabTopicStatus;
import com.rin.dictionaryservice.constant.WordCreationStatus;
import com.rin.dictionaryservice.dto.AiGenerateResponse;
import com.rin.dictionaryservice.dto.UpdateEntryContextRequest;
import com.rin.dictionaryservice.dto.VocabWordEntryResponse;
import com.rin.dictionaryservice.dto.ai.AiSingleMeaningPayload;
import com.rin.dictionaryservice.kafka.KafkaProducer;
import com.rin.dictionaryservice.model.*;
import com.rin.dictionaryservice.repository.*;
import com.rin.dictionaryservice.repository.httpclient.LanguageProcessingClient;
import com.rin.dictionaryservice.service.support.VocabAiResponseParser;
import com.rin.dictionaryservice.service.support.VocabContextScoringHelper;
import com.rin.englishlearning.common.exception.BaseException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VocabServiceDataCleanlinessTest {
    @Mock VocabTopicRepository topicRepo;
    @Mock VocabSubTopicRepository subtopicRepo;
    @Mock VocabWordEntryRepository wordEntryRepo;
    @Mock WordRepository wordRepository;
    @Mock LanguageProcessingClient lpsClient;
    @Mock KafkaProducer kafkaProducer;
    @Mock MongoTemplate mongoTemplate;
    @Mock RestTemplate restTemplate;
    @Mock VocabAiResponseParser aiResponseParser;
    @Mock VocabContextScoringHelper scoringHelper;
    @InjectMocks VocabService service;

    @Test
    void publicTopicListOnlyContainsActiveReadyTopics() {
        VocabTopic notReady = topic("processing", VocabTopicStatus.PROCESSING, true);
        VocabTopic inactive = topic("inactive", VocabTopicStatus.READY, false);
        VocabTopic visible = topic("visible", VocabTopicStatus.READY, true);
        when(topicRepo.findAll()).thenReturn(List.of(notReady, inactive, visible));
        when(subtopicRepo.findAllByTopicIdOrderByOrder(any())).thenReturn(List.of());

        var page = service.listPublicTopics(null, null, 0, 12, "newest");

        assertThat(page.getData()).extracting("id").containsExactly("visible");
    }

    @Test
    void topicCannotBeActivatedBeforeReady() {
        when(topicRepo.findById("topic")).thenReturn(Optional.of(topic("topic", VocabTopicStatus.PROCESSING, false)));
        assertThatThrownBy(() -> service.toggleTopicActive("topic")).isInstanceOf(BaseException.class);
        verify(topicRepo, never()).save(any());
    }

    @Test
    void subtopicCannotBeActivatedBeforeReady() {
        VocabSubTopic subtopic = subtopic(VocabSubTopicStatus.PROCESSING_WORDS, false);
        when(subtopicRepo.findById("sub")).thenReturn(Optional.of(subtopic));
        assertThatThrownBy(() -> service.toggleSubtopicActive("sub")).isInstanceOf(BaseException.class);
        verify(subtopicRepo, never()).save(any());
    }

    @Test
    void publicWordsExcludePendingEntryAndPendingSharedWord() {
        VocabTopic topic = topic("topic", VocabTopicStatus.READY, true);
        VocabSubTopic subtopic = subtopic(VocabSubTopicStatus.READY, true);
        VocabWordEntry pendingEntry = entry("e1", "pending-entry", false);
        VocabWordEntry pendingWordEntry = entry("e2", "pending-word", true);
        VocabWordEntry readyEntry = entry("e3", "ready", true);
        Word pendingWord = word("pending-word", WordCreationStatus.PROCESSING);
        Word readyWord = word("ready", WordCreationStatus.READY);
        when(subtopicRepo.findById("sub")).thenReturn(Optional.of(subtopic));
        when(topicRepo.findById("topic")).thenReturn(Optional.of(topic));
        when(wordEntryRepo.findAllBySubtopicIdOrderByOrder("sub"))
                .thenReturn(List.of(pendingEntry, pendingWordEntry, readyEntry));
        when(wordRepository.findAllById(any())).thenReturn(List.of(pendingWord, readyWord));

        List<VocabWordEntryResponse> result = service.listWordsForPublic("sub");

        assertThat(result).extracting(VocabWordEntryResponse::getWordKey).containsExactly("ready");
    }

    @Test
    void manualMeaningSelectionUpdatesCompletionCounters() {
        VocabWordEntry entry = entry("entry", "ready", false);
        stubCompletion(entry);
        when(wordEntryRepo.findById("entry")).thenReturn(Optional.of(entry));
        when(wordRepository.findById("ready|NOUN")).thenReturn(Optional.of(word("ready", WordCreationStatus.READY)));

        service.updateEntryContextManual("entry", UpdateEntryContextRequest.builder()
                .definition("definition").meaningVi("nghĩa").example("example")
                .viExample("ví dụ").level("B1").build());

        assertThat(entry.isWordReady()).isTrue();
        verify(subtopicRepo, atLeastOnce()).save(argThat(sub -> sub.getReadyWordCount() == 1 && sub.getStatus() == VocabSubTopicStatus.READY));
    }

    @Test
    void generatedSingleMeaningUpdatesCompletionCounters() {
        VocabWordEntry entry = entry("entry", "ready", false);
        stubCompletion(entry);
        when(wordEntryRepo.findById("entry")).thenReturn(Optional.of(entry));
        when(lpsClient.generateSingleMeaning(any(), any())).thenReturn(new AiGenerateResponse());
        when(aiResponseParser.parseSingleMeaningPayload(any()))
                .thenReturn(new AiSingleMeaningPayload("definition", "nghĩa", "example", "ví dụ", "B1"));
        when(wordRepository.findById("ready|NOUN")).thenReturn(Optional.empty(), Optional.of(word("ready", WordCreationStatus.READY)));

        service.generateSingleMeaningSync("entry");

        assertThat(entry.isWordReady()).isTrue();
        verify(subtopicRepo, atLeastOnce()).save(argThat(sub -> sub.getReadyWordCount() == 1 && sub.getStatus() == VocabSubTopicStatus.READY));
    }

    @Test
    void regenerateSubtopicsDeletesEntriesBeforeOldSubtopics() {
        VocabTopic topic = topic("topic", VocabTopicStatus.READY, true);
        when(topicRepo.findById("topic")).thenReturn(Optional.of(topic));

        service.acceptGenerateSubTopics("topic");

        var order = inOrder(mongoTemplate, subtopicRepo);
        order.verify(mongoTemplate).remove(any(org.springframework.data.mongodb.core.query.Query.class), eq(VocabWordEntry.class));
        order.verify(subtopicRepo).deleteByTopicId("topic");
        assertThat(topic.getStatus()).isEqualTo(VocabTopicStatus.GENERATING_SUBTOPICS);
        assertThat(topic.isActive()).isFalse();
    }

    private void stubCompletion(VocabWordEntry entry) {
        VocabSubTopic subtopic = subtopic(VocabSubTopicStatus.PROCESSING_WORDS, false);
        VocabTopic topic = topic("topic", VocabTopicStatus.PROCESSING, false);
        when(subtopicRepo.findById("sub")).thenReturn(Optional.of(subtopic));
        when(subtopicRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(topicRepo.findById("topic")).thenReturn(Optional.of(topic));
        when(wordEntryRepo.findAllBySubtopicIdOrderByOrder("sub")).thenReturn(List.of(entry));
        when(wordRepository.findAllById(any())).thenReturn(List.of(word("ready", WordCreationStatus.READY)));
        when(subtopicRepo.countByTopicId("topic")).thenReturn(1L);
        when(subtopicRepo.countByTopicIdAndStatus("topic", VocabSubTopicStatus.READY)).thenReturn(1L);
        when(wordEntryRepo.save(entry)).thenReturn(entry);
    }

    private VocabTopic topic(String id, VocabTopicStatus status, boolean active) {
        return VocabTopic.builder().id(id).title(id).status(status).isActive(active).subtopicCount(1).build();
    }

    private VocabSubTopic subtopic(VocabSubTopicStatus status, boolean active) {
        return VocabSubTopic.builder().id("sub").topicId("topic").title("Sub")
                .status(status).isActive(active).wordCount(1).build();
    }

    private VocabWordEntry entry(String id, String key, boolean ready) {
        return VocabWordEntry.builder().id(id).topicId("topic").subtopicId("sub")
                .wordKey(key).wordText(key).pos("NOUN").wordReady(ready).build();
    }

    private Word word(String key, WordCreationStatus status) {
        return Word.builder().id(key + "|NOUN").key(key).text(key).pos("NOUN")
                .status(status).definitions(List.of()).build();
    }
}
