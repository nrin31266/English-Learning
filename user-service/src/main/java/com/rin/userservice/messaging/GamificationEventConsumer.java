package com.rin.userservice.messaging;

import com.rin.englishlearning.common.constants.KafkaTopics;
import com.rin.englishlearning.common.event.GamificationRewardEvent;
import com.rin.englishlearning.common.event.NotificationPushEvent;
import com.rin.englishlearning.common.utils.GamificationUtils;
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

        // Nếu điểm <= 0 thì không thưởng (Chống hack/bug logic)
        if (event.getDeltaScore() <= 0) {
            log.warn("Nhận được deltaScore <= 0 cho user {}, bỏ qua xử lý thưởng.", event.getUserId());
            return;
        }

        //  MỞ BUNG TRẦN: Dùng trực tiếp điểm thực tế từ hệ thống
        double scoreDifference = event.getDeltaScore();

        double multiplier = GamificationUtils.extractMultiplier(event.getDifficulty());

        // 1. Quy đổi XP: Nhân hệ số
        double baseXp = scoreDifference * multiplier;
        int earnedXp = Math.max(1, (int) Math.round(baseXp));

        // 2. Quy đổi Coin: Tỷ lệ 10 điểm = 1 Coin, nhân hệ số
        double baseCoins = (scoreDifference / 10.0) * multiplier;
        int earnedCoins = Math.max(1, (int) Math.floor(baseCoins));
        // ---------------------------------------------------------

        userGamificationService.addRewards(event.getUserId(), earnedXp, earnedCoins);

        // Đóng gói payload gửi sang Notification Service
        Map<String, Object> payload = new HashMap<>();
        payload.put("earnedXp", earnedXp);
        payload.put("earnedCoins", earnedCoins);

        NotificationPushEvent pushEvent = NotificationPushEvent.builder()
                .userId(event.getUserId())
                .module("GAMIFICATION")
                .actionType("REWARD_EARNED")
                .payload(payload)
                .build();

        // Gọi class Publisher để bắn đi
        publisher.sendNotificationPushEvent(pushEvent);
    }
}