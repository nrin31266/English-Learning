package com.rin.learningcontentservice.repository;

import com.rin.learningcontentservice.dto.response.TopicMinimalResponse;
import com.rin.learningcontentservice.dto.response.TopicResponse;
import com.rin.learningcontentservice.model.Topic;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface TopicRepository extends JpaRepository<Topic,Long> {
    Optional<Topic> findBySlug(String slug);
    // =========================================================
    // Admin Topic Response DTO
//    private Long id;
//    private String name;
//    private String slug;
//    private String description;
//    Boolean isActive =false;
//    String color; // Highlight topic
//    private LocalDateTime createdAt;
//    private LocalDateTime updatedAt;
//    private int lessonCount;
    @Query("""
        SELECT new com.rin.learningcontentservice.dto.response.TopicResponse(
                        t.id,
                        t.name,
                        t.slug,
                        t.description,
                        t.isActive,
                        t.color,
                        t.createdAt,
                        t.updatedAt,
                        COUNT(DISTINCT l.id)
                )
                 FROM Topic t
                 LEFT JOIN Lesson l ON l.topic.id = t.id
                 GROUP BY t.id
                 ORDER BY t.createdAt DESC
        """)
    List<TopicResponse> findAdminTopics();

    // =========================================================
    @Query("""
        SELECT new com.rin.learningcontentservice.dto.response.TopicMinimalResponse(
                        t.id,
                        t.name,
                        t.slug
                )
                 FROM Topic t
    """)
    List<TopicMinimalResponse> findTopicMinimals();

    @Transactional
    @Modifying
    @Query("DELETE FROM Topic t WHERE t.slug = :slug")
    void deleteBySlug(String slug);
}
