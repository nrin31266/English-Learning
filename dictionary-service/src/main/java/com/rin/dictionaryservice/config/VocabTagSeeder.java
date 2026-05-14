package com.rin.dictionaryservice.config;


import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.rin.dictionaryservice.model.VocabTag;
import com.rin.dictionaryservice.repository.VocabTagRepository;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

@Component
@RequiredArgsConstructor
public class VocabTagSeeder implements CommandLineRunner {

    private final VocabTagRepository vocabTagRepository;

    @Override
    public void run(String... args) {
        if (vocabTagRepository.count() > 0) {
            return;
        }

        List<String> names = List.of(
                "A1", "A2", "B1", "B2", "C1", "C2",
                "TOEIC", "IELTS", "TOEFL", "SAT",
                "Listening", "Speaking", "Reading", "Writing",
                "Grammar", "Vocabulary", "Pronunciation",
                "Business", "Travel", "Daily Life",
                "Interview", "Meeting", "Presentation", "Email",
                "Hotel", "Airport", "Restaurant", "Shopping",
                "Conversation", "Storytelling", "Debate",
                "Technology", "Programming", "Web Development",
                "Frontend", "Backend", "Database", "DevOps",
                "AI", "Cyber Security",
                "Academic", "Science", "Medical", "Finance",
                "Marketing", "Law",
                "Kids", "Teenagers", "University",
                "Slang", "Idioms", "Phrasal Verbs", "Collocations"
        );

        List<VocabTag> tags = names.stream()
                .map(name -> VocabTag.builder()
                        .name(name)
                        .slug(toSlug(name))
                        .sortOrder(names.indexOf(name) + 1)
                        .isActive(true)
                        .build())
                .toList();

        vocabTagRepository.saveAll(tags);
    }

    private String toSlug(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");

        return normalized.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
    }
}