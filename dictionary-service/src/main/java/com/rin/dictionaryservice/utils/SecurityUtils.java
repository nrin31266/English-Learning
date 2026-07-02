package com.rin.dictionaryservice.utils;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

public final class SecurityUtils {
    private SecurityUtils() {}

    public static String getCurrentUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) return null;
        return authentication.getPrincipal() instanceof Jwt jwt ? jwt.getSubject() : null;
    }
}
