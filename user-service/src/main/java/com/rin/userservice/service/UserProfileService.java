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

@Service
@RequiredArgsConstructor
@Slf4j
public class UserProfileService {

    private final UserProfileRepository userProfileRepository;
    private final UserGamificationRepository userGamificationRepository;

    @Cacheable(value = "userProfileById", key = "#jwt.subject")
    public UserProfile ensureUserProfileExistsFromJwt(Jwt jwt) {

        String userId = jwt.getSubject();

        log.info("✅ Ensuring user profile exists for Keycloak ID: {}", userId);

        return userProfileRepository.findByKeyCloakId(userId)
                .orElseGet(() -> {
                    UserProfile profile = UserProfile.builder()
                            .keyCloakId(userId)
                            .firstName(jwt.getClaim("given_name"))
                            .lastName(jwt.getClaim("family_name"))
                            .email(jwt.getClaim("email"))
                            .build();

                    UserProfile savedProfile = userProfileRepository.save(profile);

                    UserGamification gamification = UserGamification.builder()
                            .userProfile(savedProfile)
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