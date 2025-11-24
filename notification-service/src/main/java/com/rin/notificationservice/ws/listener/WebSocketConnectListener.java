package com.rin.notificationservice.ws.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketConnectListener  implements ApplicationListener<SessionConnectEvent> {

    @Override
    public void onApplicationEvent(SessionConnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String userId = (String) accessor.getSessionAttributes().get("keyCloakId");
        if(userId != null && !userId.isEmpty()){
            log.info("User connected: {}", userId);
            // TODO: Add additional logic here if needed
        }else {
            log.warn("⚠️ SessionConnectEvent triggered but keyCloakId is null");
        }
    }
}
