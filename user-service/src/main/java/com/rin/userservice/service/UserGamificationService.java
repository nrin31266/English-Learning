package com.rin.userservice.service;

import com.rin.userservice.dto.response.GamificationRewardResult;
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

import java.time.LocalDate;
import java.time.ZoneId;

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

        LocalDate serverDate = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        LocalDate lastActiveDate = gamification.getLastActiveDate();

        return UserGamificationResponse.builder()
                .userId(gamification.getUserId())
                .totalXp(gamification.getTotalXp())
                .rewardCoins(gamification.getRewardCoins())
                .rewardGems(gamification.getRewardGems())
                .currentStreak(gamification.getCurrentStreak())
                .longestStreak(gamification.getLongestStreak())
                .lastActiveDate(gamification.getLastActiveDate())
                .serverDate(serverDate)
                .streakAlive(isStreakAlive(lastActiveDate, serverDate))
                .canIncreaseStreakToday(canIncreaseStreakToday(lastActiveDate, serverDate))
                .build();
    }

    @Transactional
    public GamificationRewardResult addRewards(String userId, int earnedXp, int earnedCoins) {
        UserGamification gamification = getOrCreateUserGamification(userId);

        LocalDate serverDate = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));

        gamification.setTotalXp(gamification.getTotalXp() + earnedXp);
        gamification.setRewardCoins(gamification.getRewardCoins() + earnedCoins);
        gamification.setLifetimeCoins(gamification.getLifetimeCoins() + earnedCoins);

        boolean streakUpdated = updateStreak(gamification, serverDate);

        gamificationRepository.save(gamification);

        boolean streakAlive = isStreakAlive(gamification.getLastActiveDate(), serverDate);
        boolean canIncreaseStreakToday = canIncreaseStreakToday(gamification.getLastActiveDate(), serverDate);

        log.info(
                "Cập nhật DB thành công cho User {}: +{} XP, +{} Coins, streakUpdated={}, currentStreak={}",
                userId,
                earnedXp,
                earnedCoins,
                streakUpdated,
                gamification.getCurrentStreak()
        );

        return GamificationRewardResult.builder()
                .earnedXp(earnedXp)
                .earnedCoins(earnedCoins)
                .currentStreak(gamification.getCurrentStreak())
                .longestStreak(gamification.getLongestStreak())
                .streakUpdated(streakUpdated)
                .lastActiveDate(gamification.getLastActiveDate())
                .serverDate(serverDate)
                .streakAlive(streakAlive)
                .canIncreaseStreakToday(canIncreaseStreakToday)
                .build();
    }

    private boolean updateStreak(UserGamification gamification, LocalDate serverDate) {
        LocalDate lastActiveDate = gamification.getLastActiveDate();

        if (lastActiveDate != null && lastActiveDate.isEqual(serverDate)) {
            return false;
        }

        if (lastActiveDate != null && lastActiveDate.isEqual(serverDate.minusDays(1))) {
            gamification.setCurrentStreak(gamification.getCurrentStreak() + 1);
        } else {
            gamification.setCurrentStreak(1);
        }

        gamification.setLongestStreak(
                Math.max(gamification.getLongestStreak(), gamification.getCurrentStreak())
        );

        gamification.setLastActiveDate(serverDate);

        return true;
    }

    private boolean isStreakAlive(LocalDate lastActiveDate, LocalDate serverDate) {
        return lastActiveDate != null &&
                (
                        lastActiveDate.isEqual(serverDate) ||
                                lastActiveDate.isEqual(serverDate.minusDays(1))
                );
    }

    private boolean canIncreaseStreakToday(LocalDate lastActiveDate, LocalDate serverDate) {
        return lastActiveDate == null || !lastActiveDate.isEqual(serverDate);
    }



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