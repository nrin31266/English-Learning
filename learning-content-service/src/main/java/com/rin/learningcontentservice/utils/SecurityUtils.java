package com.rin.learningcontentservice.utils;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

public class SecurityUtils {

    // Chặn khởi tạo class này bằng từ khóa new
    private SecurityUtils() {
        throw new IllegalStateException("Utility class");
    }

    public static String getCurrentUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof Jwt jwt) {
            return jwt.getSubject(); // Trả về ID của Keycloak
        }

        return null;
    }
}