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

    @Transactional
    public UserGamificationResponse getMyGamification() {
        // Lấy Keycloak ID từ token của phiên đăng nhập hiện tại
        String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();

        // Tìm bản ghi, nếu trống (User mới đăng nhập lần đầu) thì tự động tạo mới
        UserGamification gamification = gamificationRepository.findById(currentUserId)
                .orElseGet(() -> {
                    log.info("🆕 Generating default gamification record for Keycloak User: {}", currentUserId);
                    UserGamification newGami = UserGamification.builder()
                            .userId(currentUserId)
                            .totalXp(0L)
                            .rewardCoins(0L)
                            .currentStreak(0)
                            .longestStreak(0)
                            .build();
                    return gamificationRepository.save(newGami);
                });

        // Map sang DTO sạch
        return UserGamificationResponse.builder()
                .userId(gamification.getUserId())
                .totalXp(gamification.getTotalXp())
                .rewardCoins(gamification.getRewardCoins())
                .currentStreak(gamification.getCurrentStreak())
                .longestStreak(gamification.getLongestStreak())
                .lastActiveDate(gamification.getLastActiveDate())
                .build();
    }
}