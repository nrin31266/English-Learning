package com.rin.userservice.repository;

import com.rin.userservice.model.ProcessedGamificationEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessedGamificationEventRepository extends JpaRepository<ProcessedGamificationEvent, String> {}
