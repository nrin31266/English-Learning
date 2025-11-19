package com.rin.userservice.service;

import com.rin.userservice.model.UserProfile;
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

    @Cacheable(value = "userProfileById", key = "#jwt.subject")
    public UserProfile ensureUserProfileExistsFromJwt(Jwt jwt) {

        String userId = jwt.getSubject(); // sub
        log.info("✅ Ensuring user profile exists for Keycloak ID: {}", userId);
        return userProfileRepository.findByKeyCloakId(userId)
                .orElseGet(() -> {
                    UserProfile profile = new UserProfile();
                    profile.setKeyCloakId(userId);
                    profile.setFirstName(jwt.getClaim("given_name"));
                    profile.setLastName(jwt.getClaim("family_name"));
                    profile.setEmail(jwt.getClaim("email"));
                    return userProfileRepository.save(profile);
                });
    }

}
