package com.rin.userservice.model;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Entity
@Table(name = "processed_gamification_event")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProcessedGamificationEvent {
    @Id @Column(length = 160) String eventId;
    @Column(nullable = false, length = 64) String userId;
    @Column(nullable = false) LocalDateTime processedAt;
}
