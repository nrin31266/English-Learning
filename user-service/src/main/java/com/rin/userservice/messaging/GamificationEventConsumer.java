package com.rin.userservice.messaging;

import com.rin.englishlearning.common.constants.KafkaTopics;
import com.rin.englishlearning.common.event.GamificationRewardEvent;
import com.rin.englishlearning.common.event.NotificationPushEvent;
import com.rin.englishlearning.common.utils.GamificationUtils;
import com.rin.userservice.dto.response.GamificationRewardResult;
import com.rin.userservice.service.UserGamificationService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class GamificationEventConsumer {

    GamificationEventPublisher publisher;
    UserGamificationService userGamificationService;

    @KafkaListener(
            topics = KafkaTopics.GAMIFICATION_REWARD_TOPIC,
            containerFactory = "gamificationRewardEventContainerFactory"
    )
    public void handleGamificationReward(GamificationRewardEvent event) {
        log.info(
                "Received GamificationRewardEvent: userId={}, trigger={}, points={}",
                event.getUserId(),
                event.getTrigger(),
                event.getDeltaScore()
        );

        if (event.getDeltaScore() <= 0) {
            log.warn("Nhận được deltaScore <= 0 cho user {}, bỏ qua xử lý thưởng.", event.getUserId());
            return;
        }

        double scoreDifference = event.getDeltaScore();
        double multiplier = GamificationUtils.extractMultiplier(event.getDifficulty());

        double baseXp = scoreDifference * multiplier;
        int earnedXp = Math.max(1, (int) Math.round(baseXp));

        double baseCoins = (scoreDifference / 10.0) * multiplier;
        int earnedCoins = Math.max(1, (int) Math.floor(baseCoins));

        GamificationRewardResult result = userGamificationService.addRewards(
                event.getUserId(),
                earnedXp,
                earnedCoins
        );

        sendRewardNotification(event.getUserId(), result);

        if (result.isStreakUpdated()) {
            sendStreakNotification(event.getUserId(), result);
        }
    }

    private void sendRewardNotification(String userId, GamificationRewardResult result) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("earnedXp", result.getEarnedXp());
        payload.put("earnedCoins", result.getEarnedCoins());

        NotificationPushEvent pushEvent = NotificationPushEvent.builder()
                .userId(userId)
                .module("GAMIFICATION")
                .actionType("REWARD_EARNED")
                .payload(payload)
                .build();

        publisher.sendNotificationPushEvent(pushEvent);
    }

    private void sendStreakNotification(String userId, GamificationRewardResult result) {
        Map<String, Object> payload = new HashMap<>();

        payload.put("currentStreak", result.getCurrentStreak());
        payload.put("longestStreak", result.getLongestStreak());

        payload.put(
                "lastActiveDate",
                result.getLastActiveDate() != null ? result.getLastActiveDate().toString() : null
        );

        payload.put(
                "serverDate",
                result.getServerDate() != null ? result.getServerDate().toString() : null
        );

        payload.put("streakAlive", result.isStreakAlive());
        payload.put("canIncreaseStreakToday", result.isCanIncreaseStreakToday());

        NotificationPushEvent pushEvent = NotificationPushEvent.builder()
                .userId(userId)
                .module("GAMIFICATION")
                .actionType("STREAK_UPDATED")
                .payload(payload)
                .build();

        publisher.sendNotificationPushEvent(pushEvent);
    }
}