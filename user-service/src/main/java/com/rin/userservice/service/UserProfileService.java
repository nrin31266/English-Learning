package com.rin.userservice.service;

import com.rin.userservice.model.UserGamification;
import com.rin.userservice.model.UserProfile;
import com.rin.userservice.repository.UserGamificationRepository;
import com.rin.userservice.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserProfileService {

    private final UserProfileRepository userProfileRepository;
    private final UserGamificationRepository userGamificationRepository;

    @Cacheable(value = "userProfileById", key = "#jwt.subject")
    @Transactional //Thêm Transactional để đảm bảo lưu cả 2 bảng đồng bộ, lỗi 1 bảng là rollback sạch
    public UserProfile ensureUserProfileExistsFromJwt(Jwt jwt) {

        String userId = jwt.getSubject();

        log.info("✅ Ensuring user baseline profile exists for Keycloak ID: {}", userId);

        // Dùng trực tiếp findById vì keyCloakId giờ đã là khóa chính String
        return userProfileRepository.findById(userId)
                .orElseGet(() -> {
                    log.info("🆕 Profile not found. Registering new user profile and gamification ecosystem for ID: {}", userId);

                    UserProfile profile = UserProfile.builder()
                            .keyCloakId(userId)
                            .firstName(jwt.getClaim("given_name"))
                            .lastName(jwt.getClaim("family_name"))
                            .email(jwt.getClaim("email"))
                            .build();

                    UserProfile savedProfile = userProfileRepository.save(profile);

                    // KHỞI TẠO GAMIFICATION DẸT: Dùng chung Id String của Keycloak, sạch sẽ tuyệt đối
                    UserGamification gamification = UserGamification.builder()
                            .userId(userId)
                            .totalXp(0L)
                            .rewardCoins(0L)
                            .currentStreak(0)
                            .longestStreak(0)
                            .build();

                    userGamificationRepository.save(gamification);

                    return savedProfile;
                });
    }
}