package com.rin.userservice.controller;

import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.userservice.model.UserProfile;
import com.rin.userservice.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/user-profiles")
@RequiredArgsConstructor
public class UserProfileController {
    private final UserProfileService userProfileService;


    @PostMapping("/me")
    public ApiResponse<UserProfile> getUserByJwt(@AuthenticationPrincipal Jwt jwt){
        UserProfile userProfile = userProfileService.ensureUserProfileExistsFromJwt(jwt);
        return ApiResponse.success(userProfile);
    }
}
