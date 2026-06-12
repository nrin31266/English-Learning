package com.rin.userservice.model;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@AllArgsConstructor
@NoArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Table(name = "user_gamification")
public class UserGamification {

    @Id
    @Column(length = 64)
    String userId;

    @Column(nullable = false)
    @Builder.Default
    Long totalXp = 0L;

    @Column(nullable = false)
    @Builder.Default
    Long rewardCoins = 0L;

    @Column(nullable = false)
    @Builder.Default
    Integer currentStreak = 0;

    @Column(nullable = false)
    @Builder.Default
    Integer longestStreak = 0;

    private LocalDate lastActiveDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}