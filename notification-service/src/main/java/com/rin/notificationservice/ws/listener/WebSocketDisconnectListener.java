package com.rin.notificationservice.ws.listener;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketDisconnectListener implements ApplicationListener<SessionDisconnectEvent> {


    @Override
    public void onApplicationEvent(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String userId = (String) accessor.getSessionAttributes().get("keyCloakId");

        if (userId != null && !userId.isEmpty()) {
            log.info("User {} disconnected", userId);
            // TODO: Add additional logic here if needed
        }else{
            log.warn("⚠️ SessionDisconnectEvent triggered but keyCloakId is null");
        }
    }
}
