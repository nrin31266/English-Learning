package com.rin.userservice.repository;

import com.rin.userservice.model.UserGamification;
import com.rin.userservice.model.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserGamificationRepository extends JpaRepository<UserGamification, Long> {
    Optional<UserGamification> findByUserProfile(UserProfile userProfile);
}