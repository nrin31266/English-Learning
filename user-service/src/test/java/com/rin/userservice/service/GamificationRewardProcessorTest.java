package com.rin.userservice.service;

import com.rin.englishlearning.common.event.GamificationRewardEvent;
import com.rin.userservice.repository.ProcessedGamificationEventRepository;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class GamificationRewardProcessorTest {
    @Test
    void skipsAnAlreadyProcessedKafkaEvent() {
        ProcessedGamificationEventRepository processed = mock(ProcessedGamificationEventRepository.class);
        UserGamificationService gamification = mock(UserGamificationService.class);
        when(processed.existsById("event-1")).thenReturn(true);
        GamificationRewardProcessor processor = new GamificationRewardProcessor(processed, gamification);

        var result = processor.process(GamificationRewardEvent.builder().eventId("event-1").userId("user-1").deltaScore(100).build());

        assertThat(result).isEmpty();
        verifyNoInteractions(gamification);
    }
}
