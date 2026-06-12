package com.rin.englishlearning.common.event;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GamificationRewardEvent {
    private String userId;      // Định danh người dùng
    private double deltaScore;  // Điểm chênh lệch (Luôn > 0)
    private double multiplier;  // Hệ số nhân thưởng
    private String source;
}