package com.rin.notificationservice.ws.interceptor;

import com.rin.notificationservice.ws.principal.StompPrincipal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtDecoders;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class KeycloakStompInterceptor implements ChannelInterceptor {

    private final JwtDecoder jwtDecoder;

    public KeycloakStompInterceptor(
            @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}")
            String issuerUri
    ) {
        this.jwtDecoder = JwtDecoders.fromIssuerLocation(issuerUri);
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {

        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {

            String auth = accessor.getFirstNativeHeader("Authorization");

            if (auth == null || !auth.startsWith("Bearer ")) {
                throw new IllegalArgumentException("Missing or invalid Authorization header");
            }

            String token = auth.substring(7);
            var jwt = jwtDecoder.decode(token);

            String keyCloakId = jwt.getSubject();

            StompPrincipal principal = new StompPrincipal(keyCloakId);

            accessor.setUser(principal);
            accessor.getSessionAttributes().put("keycloakId", keyCloakId);

            log.info("✅ STOMP authenticated: principal={}", principal.getName());
        }

        return message;
    }
}