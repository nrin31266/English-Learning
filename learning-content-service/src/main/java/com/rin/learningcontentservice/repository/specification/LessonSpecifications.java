package com.rin.learningcontentservice.repository.specification;

import com.rin.learningcontentservice.dto.request.LessonFilterRequest;
import com.rin.learningcontentservice.model.Lesson;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;


public class LessonSpecifications {

    public static Specification<Lesson> filter(LessonFilterRequest f) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (f.getStatus() != null)
                predicates.add(cb.equal(root.get("status"), f.getStatus()));

            if (f.getLessonType() != null)
                predicates.add(cb.equal(root.get("lessonType"), f.getLessonType()));

            if (f.getLanguageLevel() != null)
                predicates.add(cb.equal(root.get("languageLevel"), f.getLanguageLevel()));

            if (f.getSourceType() != null)
                predicates.add(cb.equal(root.get("sourceType"), f.getSourceType()));

            if (f.getTopicSlug() != null)
                predicates.add(cb.equal(root.get("topic").get("slug"), f.getTopicSlug()));

            if (f.getEnableDictation() != null)
                predicates.add(cb.equal(root.get("enableDictation"), f.getEnableDictation()));

            if (f.getEnableShadowing() != null)
                predicates.add(cb.equal(root.get("enableShadowing"), f.getEnableShadowing()));

            // search title or slug
            if (f.getSearch() != null && !f.getSearch().isBlank()) {
                String search = "%" + f.getSearch().toLowerCase() + "%";
                Predicate titleLike = cb.like(cb.lower(root.get("title")), search);
                Predicate slugLike = cb.like(cb.lower(root.get("slug")), search);
                predicates.add(cb.or(titleLike, slugLike));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
