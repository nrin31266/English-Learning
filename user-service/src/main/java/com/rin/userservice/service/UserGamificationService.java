package com.rin.userservice.service;

import com.rin.userservice.dto.response.UserGamificationResponse;
import com.rin.userservice.model.UserGamification;
import com.rin.userservice.repository.UserGamificationRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class UserGamificationService {

    UserGamificationRepository gamificationRepository;

    @Transactional(readOnly = true)
    public UserGamificationResponse getMyGamification() {
        String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();
        UserGamification gamification = getOrCreateUserGamification(currentUserId);


        return UserGamificationResponse.builder()
                .userId(gamification.getUserId())
                .totalXp(gamification.getTotalXp())
                .rewardCoins(gamification.getRewardCoins())
                .rewardGems(gamification.getRewardGems())
                .currentStreak(gamification.getCurrentStreak())
                .longestStreak(gamification.getLongestStreak())
                .lastActiveDate(gamification.getLastActiveDate())
                .build();
    }


    @Transactional
    public void addRewards(String userId, int earnedXp, int earnedCoins) {
        UserGamification gamification = getOrCreateUserGamification(userId);

        // Cộng dồn các chỉ số
        gamification.setTotalXp(gamification.getTotalXp() + earnedXp);
        gamification.setRewardCoins(gamification.getRewardCoins() + earnedCoins);
        gamification.setLifetimeCoins(gamification.getLifetimeCoins() + earnedCoins);

        gamificationRepository.save(gamification);

        log.info("Cập nhật DB thành công cho User {}: +{} XP, +{} Coins", userId, earnedXp, earnedCoins);
    }

    /**
     * HÀM TIỆN ÍCH: Tái sử dụng logic tìm/tạo mới User
     */
    private UserGamification getOrCreateUserGamification(String userId) {
        return gamificationRepository.findById(userId)
                .orElseGet(() -> {
                    log.info("🆕 Generating default gamification record for Keycloak User: {}", userId);
                    UserGamification newGami = UserGamification.builder()
                            .userId(userId)
                            .totalXp(0L)
                            .rewardCoins(0L)
                            .lifetimeCoins(0L)
                            .rewardGems(0L)
                            .currentStreak(0)
                            .longestStreak(0)
                            .build();
                    return gamificationRepository.save(newGami);
                });
    }
}