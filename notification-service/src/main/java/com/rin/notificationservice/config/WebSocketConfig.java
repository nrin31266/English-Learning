package com.rin.notificationservice.config;


import com.rin.notificationservice.ws.interceptor.KeycloakStompInterceptor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Slf4j
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}")
    private String issuerUrl;

    @Autowired
    private KeycloakStompInterceptor stompInterceptor;

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompInterceptor);
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {

        log.info("Keycloak Issuer URL: {}", issuerUrl);

        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");


        log.info("✅ WebSocket endpoint /ws registered with SockJS");

    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes("/app");
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setUserDestinationPrefix("/user");
    }
//🎯 1) /app → Khi client SEND lên server
//
//    Prefix này dành cho client gửi message vào controller.
//
//    Ví dụ frontend gửi:
//
//            client.send("/app/chat.sendMessage", {}, JSON.stringify(msg));
//
//
//    Backend map:
//
//    @MessageMapping("/chat.sendMessage")
//    public void sendMessage(MessageDto message) {
//    ...
//    }
//
//
//📝 Tóm tắt:
//
//    Prefix	Ý nghĩa
///app/**	Client gửi lên server → @MessageMapping xử lý
// 🎯 2) /topic → Khi server broadcast đến tất cả client (public)
//
// Dùng cho thông báo public kiểu “publish-subscribe”.
//
// Ví dụ client subscribe:
//
// client.subscribe("/topic/global-news", msg => ...)
//
//
// Backend gửi broadcast:
//
// simpMessagingTemplate.convertAndSend("/topic/global-news", payload);
//
//
// 📝 Tóm tắt:
//
// Prefix	Ý nghĩa
// /topic/**	Broadcast tới tất cả client subscribe
// 🎯 3) /queue → Khi server gửi message point-to-point (private nhưng không theo user)
//
// Phù hợp khi bạn muốn gửi message riêng theo session, không theo userId.
//
// Ví dụ 1 client subscribe:
//
// client.subscribe("/queue/system-alerts", msg => ...)
//
//
// Backend:
//
// simpMessagingTemplate.convertAndSend("/queue/system-alerts", payload);
//
//
// 📝 Dùng khi bạn không cần userId, chỉ gửi đến 1 queue cụ thể.
//
// 🎯 4) /user → Khi server gửi message riêng cho từng user (private – chuẩn nhất)
//
// Đây là prefix cực quan trọng.
//
// Frontend:
//
// client.subscribe("/user/queue/notifications", msg => ...)
//
//
// Backend:
//
// simpMessagingTemplate.convertAndSendToUser(userId, "/queue/notifications", payload);
//
//
// Spring sẽ tự biến:
//
// /user/queue/notifications
// → thành
//
// /queue/notifications-user12345
//
// Dựa theo Principal bạn set bằng:
//
// accessor.setUser(new StompPrincipal(keyCloakId));
//
//
// 📝 Tóm tắt:
//
// Prefix	Ý nghĩa
// /user/**	Message riêng cho từng user, dựa vào Principal
// 🎯 BẢNG TÓM TẮT RÕ RÀNG NHẤT
// Use case	Client SEND	Server SEND	Ghi chú
// Gửi lệnh lên server	/app/**	❌	gọi @MessageMapping
// Broadcast công khai	❌	/topic/**	giống pub/sub
// Gửi riêng 1 session	❌	/queue/**	theo session ID
// Gửi riêng 1 user	❌	/user/queue/**	dùng Principal
}
