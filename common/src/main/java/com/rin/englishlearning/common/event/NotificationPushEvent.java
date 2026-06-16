package com.rin.englishlearning.common.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPushEvent {
    private String userId;     // Bắt buộc là KeycloakId
    private String module;     // VD: "GAMIFICATION", "LESSON_SYSTEM"
    private String actionType; // VD: "REWARD_EARNED", "STREAK_UPDATED"
    private Map<String, Object> payload; // Payload linh hoạt tùy action
}