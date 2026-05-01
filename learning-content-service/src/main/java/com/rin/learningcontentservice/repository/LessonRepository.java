package com.rin.learningcontentservice.repository;

import com.rin.learningcontentservice.dto.projection.HomeLessonProjection;
import com.rin.learningcontentservice.model.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface LessonRepository extends JpaRepository<Lesson, Long>, JpaSpecificationExecutor<Lesson> {



    Optional<Lesson> findByAiJobId(String aiJobId);


    @Query(value = """
            SELECT 
                x.id AS id, 
                x.topic_id AS topicId, 
                x.title AS title, 
                x.thumbnail_url AS thumbnailUrl, 
                x.slug AS slug, 
                x.language_level AS languageLevel, 
                x.source_type AS sourceType, 
                x.duration_seconds AS durationSeconds,
                x.enable_dictation AS enableDictation, 
                x.enable_shadowing AS enableShadowing,
                -- ĐẾM TRỰC TIẾP SỐ CÂU ACTIVE BẰNG SQL
                (SELECT COUNT(s.id) FROM lesson_sentences s WHERE s.lesson_id = x.id AND s.is_active = true) AS activeSentenceCount
            FROM (
                SELECT l.*,
                       ROW_NUMBER() OVER (PARTITION BY l.topic_id ORDER BY l.published_at DESC) AS rn
                FROM lessons l
                WHERE l.topic_id IN (:topicIds)
                  AND l.published_at IS NOT NULL
            ) x
            WHERE x.rn <= :limitLessonsPerTopic
            ORDER BY x.topic_id, x.published_at DESC
            """, nativeQuery = true)
    List<HomeLessonProjection> findLatestLessonsByTopicIds(
            @Param("topicIds") List<Long> topicIds,
            @Param("limitLessonsPerTopic") int limitLessonsPerTopic
    );

    @Query(value = """
        SELECT 
            l.id AS id, 
            l.topic_id AS topicId, 
            l.title AS title, 
            l.thumbnail_url AS thumbnailUrl, 
            l.slug AS slug, 
            l.language_level AS languageLevel, 
            l.source_type AS sourceType, 
            l.duration_seconds AS durationSeconds,
            l.enable_dictation AS enableDictation, 
            l.enable_shadowing AS enableShadowing,
            -- Đếm số câu active trực tiếp
            (SELECT COUNT(s.id) FROM lesson_sentences s WHERE s.lesson_id = l.id AND s.is_active = true) AS activeSentenceCount
        FROM lessons l
        WHERE l.topic_id = :topicId 
          AND l.published_at IS NOT NULL
        ORDER BY l.published_at DESC
        """, nativeQuery = true)
    List<HomeLessonProjection> findAllLessonsWithCountByTopicId(@Param("topicId") Long topicId);
}