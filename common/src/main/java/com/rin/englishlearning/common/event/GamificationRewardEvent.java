package com.rin.englishlearning.common.event;

import com.rin.englishlearning.common.constants.DifficultyLevel;
import com.rin.englishlearning.common.constants.GamificationTrigger;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GamificationRewardEvent {
    private String eventId;
    private String userId;
    private double deltaScore;
    private GamificationTrigger trigger;
    private String targetId;
    private long timestamp;
    private DifficultyLevel difficulty;
}
