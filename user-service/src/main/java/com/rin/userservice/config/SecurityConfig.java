package com.rin.userservice.config;


import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
//                .cors(cors-> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth
                                .anyRequest().authenticated()
                )
                .oauth2ResourceServer(resource -> resource
                        .jwt(token -> token.jwtAuthenticationConverter(new KeycloakJwtAuthenticationConverter()))
                )
                .build();
    }
}
