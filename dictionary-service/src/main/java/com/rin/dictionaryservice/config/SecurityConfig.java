package com.rin.dictionaryservice.config;


import org.apache.tomcat.util.http.Method;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    @Order(1)
    public SecurityFilterChain internalChain(HttpSecurity http, WorkerKeyFilter workerKeyFilter) throws Exception {
        http.securityMatcher("/api/internal/**");

        http.csrf(AbstractHttpConfigurer::disable);
        http.authorizeHttpRequests(auth -> auth.anyRequest().permitAll());

        // Chỉ add filter trong chain internal
        http.addFilterBefore(workerKeyFilter, BearerTokenAuthenticationFilter.class);

        // Tắt resource server cho internal nếu không dùng JWT ở đây
        http.oauth2ResourceServer(AbstractHttpConfigurer::disable);

        return http.build();
    }

    @Bean
    @Order(2)
    public SecurityFilterChain apiChain(HttpSecurity http, CustomizeAuthenticationEntryPoint entryPoint) throws Exception {
        http.securityMatcher("/api/**"); // match các API còn lại (không phải /api/internal/**)

        http.csrf(AbstractHttpConfigurer::disable);

        http.authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.POST,  "/api/dictionaries/words/add-or-get-word").permitAll()
                // nếu endpoint thực tế là POST thì đổi POST
                .anyRequest().authenticated()
        );

        http.oauth2ResourceServer(oauth -> oauth
                .jwt(jwt -> jwt.jwtAuthenticationConverter(new KeycloakJwtAuthenticationConverter()))
                .authenticationEntryPoint(entryPoint)
        );

        return http.build();
    }

}
