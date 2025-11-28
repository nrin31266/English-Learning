package com.rin.learningcontentservice.repository;

import com.rin.learningcontentservice.model.Lesson;
import feign.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface LessonRepository extends JpaRepository<Lesson, Long>, JpaSpecificationExecutor<Lesson> {
    Optional<Lesson> findBySlug(String slug);
    Optional<Lesson> findByAiJobId(String aiJobId);


    @Query(value = """
        SELECT * FROM (
            SELECT l.*,
                   ROW_NUMBER() OVER (PARTITION BY l.topic_id ORDER BY l.published_at DESC) AS rn
            FROM lessons l
            WHERE l.topic_id IN (:topicIds)
              AND l.published_at IS NOT NULL
        ) x
        WHERE x.rn <= :limitLessonsPerTopic
        ORDER BY x.topic_id, x.published_at DESC
        """, nativeQuery = true)
    List<Lesson> findLessonsByTopicIdsForHome(
            @Param("topicIds") List<Long> topicIds,
            @Param("limitLessonsPerTopic") int limitLessonsPerTopic
    );
}
