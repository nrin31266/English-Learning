package com.rin.userservice.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;
import java.time.LocalDate;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserGamificationResponse {
    String userId;
    Long totalXp;
    Long rewardCoins;
    Long rewardGems;
    Integer currentStreak;
    Integer longestStreak;
    LocalDate lastActiveDate;
}