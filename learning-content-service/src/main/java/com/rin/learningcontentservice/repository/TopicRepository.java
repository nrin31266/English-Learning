package com.rin.learningcontentservice.repository;

import com.rin.learningcontentservice.model.Topic;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TopicRepository extends JpaRepository<Topic,Long> {
}
