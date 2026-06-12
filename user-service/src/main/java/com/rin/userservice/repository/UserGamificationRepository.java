package com.rin.userservice.repository;

import com.rin.userservice.model.UserGamification;

import org.springframework.data.jpa.repository.JpaRepository;


public interface UserGamificationRepository extends JpaRepository<UserGamification, String> {

}