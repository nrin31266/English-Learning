package com.rin.userservice.service;

import com.rin.englishlearning.common.event.GamificationRewardEvent;
import com.rin.englishlearning.common.utils.GamificationUtils;
import com.rin.userservice.dto.response.GamificationRewardResult;
import com.rin.userservice.model.ProcessedGamificationEvent;
import com.rin.userservice.repository.ProcessedGamificationEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class GamificationRewardProcessor {
    private final ProcessedGamificationEventRepository processedRepository;
    private final UserGamificationService userGamificationService;

    @Transactional
    public Optional<GamificationRewardResult> process(GamificationRewardEvent event) {
        String eventId = resolveEventId(event);
        if (processedRepository.existsById(eventId)) return Optional.empty();

        double multiplier = GamificationUtils.extractMultiplier(event.getDifficulty());
        int earnedXp = Math.max(1, (int) Math.round(event.getDeltaScore() * multiplier));
        int earnedCoins = Math.max(1, (int) Math.floor((event.getDeltaScore() / 10.0) * multiplier));

        processedRepository.saveAndFlush(ProcessedGamificationEvent.builder()
                .eventId(eventId).userId(event.getUserId()).processedAt(LocalDateTime.now()).build());
        return Optional.of(userGamificationService.addRewards(event.getUserId(), earnedXp, earnedCoins));
    }

    private String resolveEventId(GamificationRewardEvent event) {
        if (event.getEventId() != null && !event.getEventId().isBlank()) return event.getEventId();
        return String.join(":", "legacy", event.getUserId(), String.valueOf(event.getTrigger()),
                String.valueOf(event.getTargetId()), String.valueOf(event.getTimestamp()));
    }
}
