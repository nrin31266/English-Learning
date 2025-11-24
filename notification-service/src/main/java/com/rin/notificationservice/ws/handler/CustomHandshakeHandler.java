//package com.rin.notificationservice.ws.handler;
//
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.http.server.ServerHttpRequest;
//import org.springframework.web.socket.WebSocketHandler;
//import org.springframework.web.socket.server.support.DefaultHandshakeHandler;
//
//import java.security.Principal;
//import java.util.Map;
//@Slf4j
//public class CustomHandshakeHandler extends DefaultHandshakeHandler {
//    @Override
//    protected Principal determineUser(ServerHttpRequest request, WebSocketHandler wsHandler, Map<String, Object> attributes) {
//        String userId = (String) attributes.get("userId");
//        log.info("userId = {}", userId);
//        return () -> userId;
//    }
//}
