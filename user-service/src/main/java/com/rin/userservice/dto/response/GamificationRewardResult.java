package com.rin.userservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GamificationRewardResult {
    private int earnedXp;
    private int earnedCoins;

    private int currentStreak;
    private int longestStreak;
    private boolean streakUpdated;

    private LocalDate lastActiveDate;
    private LocalDate serverDate;
    private boolean streakAlive;
    private boolean canIncreaseStreakToday;
}