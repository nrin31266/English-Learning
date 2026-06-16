package com.rin.englishlearning.common.utils;


import com.rin.englishlearning.common.constants.DifficultyLevel;

public final class GamificationUtils {

    private GamificationUtils() {}

    public static double extractMultiplier(DifficultyLevel level) {
        if (level == null) return 1.0;
        return switch (level) {
            case A1, EASY -> 1.0;
            case A2 -> 1.5;
            case B1, MEDIUM -> 2.0;
            case B2 -> 2.5;
            case C1, HARD -> 3.0;
            case C2, EXPERT -> 3.5;
            default -> 1.0;
        };
    }
}