package com.rin.dictionaryservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    // ─── LỚP 1: DÀNH CHO INTERNAL WORKER (Ưu tiên số 1) ──────────────
    @Bean
    @Order(1)
    public SecurityFilterChain internalChain(HttpSecurity http, WorkerKeyFilter workerKeyFilter) throws Exception {
        // Match chính xác đường dẫn mà Python đang gọi
        http.securityMatcher("/vocab/internal/**", "/api/internal/**");

        http.csrf(AbstractHttpConfigurer::disable);

        // Cho phép đi qua không cần JWT
        http.authorizeHttpRequests(auth -> auth.anyRequest().permitAll());

        // Gắn cái Filter kiểm tra X-Worker-Key của bạn vào
        http.addFilterBefore(workerKeyFilter, UsernamePasswordAuthenticationFilter.class);

        // Tắt Keycloak ở luồng này
        http.oauth2ResourceServer(AbstractHttpConfigurer::disable);

        return http.build();
    }

    // ─── LỚP 2: DÀNH CHO USER BÌNH THƯỜNG (Ưu tiên số 2) ─────────────
    @Bean
    @Order(2)
    public SecurityFilterChain apiChain(HttpSecurity http, CustomizeAuthenticationEntryPoint entryPoint) throws Exception {
        // Match tất cả các API còn lại
        http.securityMatcher("/**");

        http.csrf(AbstractHttpConfigurer::disable);

        http.authorizeHttpRequests(auth -> auth
                .anyRequest().permitAll() // Hoặc .authenticated() tùy logic của bạn
        );

        // Bật Keycloak để check JWT token từ UI truyền lên
        http.oauth2ResourceServer(oauth -> oauth
                .jwt(jwt -> jwt.jwtAuthenticationConverter(new KeycloakJwtAuthenticationConverter()))
                .authenticationEntryPoint(entryPoint)
        );

        return http.build();
    }
}