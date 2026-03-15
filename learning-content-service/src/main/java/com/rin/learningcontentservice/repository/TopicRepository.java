package com.rin.learningcontentservice.repository;

import com.rin.learningcontentservice.dto.response.TopicSummaryResponse;
import com.rin.learningcontentservice.dto.response.TopicOptionResponse;
import com.rin.learningcontentservice.dto.response.TopicResponseWithLessonCount;
import com.rin.learningcontentservice.model.Topic;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface TopicRepository extends JpaRepository<Topic,Long> {
    Optional<Topic> findBySlug(String slug);

    @Query("""
        SELECT new com.rin.learningcontentservice.dto.response.TopicResponseWithLessonCount(
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
    List<TopicResponseWithLessonCount> findAdminTopics();

    // =========================================================
    @Query("""
        SELECT new com.rin.learningcontentservice.dto.response.TopicOptionResponse(
                        t.id,
                        t.name,
                        t.slug
                )
                 FROM Topic t
    """)
    List<TopicOptionResponse> findTopicOptions();

    @Query("""
    SELECT new com.rin.learningcontentservice.dto.response.TopicSummaryResponse(
            t.id,
            t.name,
            t.slug,
            t.updatedAt,
            COUNT(DISTINCT l.id)
    )
    FROM Topic t
    LEFT JOIN Lesson l ON l.topic.id = t.id
    WHERE t.isActive = true
    GROUP BY t.id, t.name, t.slug, t.updatedAt
    ORDER BY t.updatedAt DESC
""")
    List<TopicSummaryResponse> findActiveTopics();



    @Transactional
    @Modifying
    @Query("DELETE FROM Topic t WHERE t.slug = :slug")
    void deleteBySlug(String slug);


}
