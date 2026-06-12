package com.rin.userservice.controller;

import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.userservice.dto.response.UserGamificationResponse;
import com.rin.userservice.service.UserGamificationService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/gamification")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserGamificationController {

    UserGamificationService gamificationService;

    @GetMapping("/me")
    public ApiResponse<UserGamificationResponse> getMyGamification() {
        UserGamificationResponse response = gamificationService.getMyGamification();
        return ApiResponse.success(response);
    }
}