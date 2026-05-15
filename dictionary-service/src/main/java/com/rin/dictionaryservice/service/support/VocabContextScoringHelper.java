package com.rin.dictionaryservice.service.support;

import com.rin.dictionaryservice.model.CefrLevel;
import com.rin.dictionaryservice.model.VocabSubTopic;
import com.rin.dictionaryservice.model.VocabTopic;
import com.rin.dictionaryservice.model.Word;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Component
@Slf4j
public class VocabContextScoringHelper {

    private static final double SUBTOPIC_DEF_KEYWORD_WEIGHT = 6.0;
    private static final double SUBTOPIC_EXAMPLE_KEYWORD_WEIGHT = 4.0;
    private static final double SUBTOPIC_MEANING_KEYWORD_WEIGHT = 1.2;
    private static final double SUBTOPIC_DEF_PHRASE_WEIGHT = 9.0;
    private static final double SUBTOPIC_EXAMPLE_PHRASE_WEIGHT = 6.0;

    private static final double TOPIC_DEF_KEYWORD_WEIGHT = 2.2;
    private static final double TOPIC_EXAMPLE_KEYWORD_WEIGHT = 1.6;
    private static final double TOPIC_MEANING_KEYWORD_WEIGHT = 0.6;
    private static final double TOPIC_DEF_PHRASE_WEIGHT = 3.4;
    private static final double TOPIC_EXAMPLE_PHRASE_WEIGHT = 2.4;

    private static final double TITLE_TAG_DEF_KEYWORD_WEIGHT = 3.4;
    private static final double TITLE_TAG_EXAMPLE_KEYWORD_WEIGHT = 2.2;
    private static final double TITLE_TAG_MEANING_KEYWORD_WEIGHT = 0.8;
    private static final double TITLE_TAG_DEF_PHRASE_WEIGHT = 4.2;
    private static final double TITLE_TAG_EXAMPLE_PHRASE_WEIGHT = 2.8;

    private static final int MISSING_DEFINITION_PENALTY = 12;
    private static final int MISSING_EXAMPLE_PENALTY = 8;
    private static final int MISSING_MEANING_PENALTY = 4;
    private static final int WORD_NOT_IN_EXAMPLE_PENALTY = 5;
    private static final int EXACT_CONTEXT_INDEX0_BONUS = 10;

    private static final double INDEX_TIEBREAKER_FACTOR = 0.05;

    private static final Pattern NON_WORD_PATTERN =
            Pattern.compile("[^\\p{L}\\p{N}+#./'-]+", Pattern.UNICODE_CHARACTER_CLASS);

    private static final Set<String> CONTEXT_STOP_WORDS = new HashSet<>(Set.of(
            "the", "and", "for", "with", "that", "this", "from", "into", "onto", "about",
            "above", "below", "between", "through", "during", "before", "after", "under",
            "over", "within", "without", "strictly", "exclude", "excludes", "excluded",
            "excluding", "include", "includes", "included", "including", "focus", "focuses",
            "cover", "covers", "covered", "vocabulary", "words", "word", "terms", "term",
            "related", "specific", "general", "common", "basic", "advanced", "process",
            "context", "subtopic", "topic", "english", "learners", "learning", "used", "using",
            "use", "does", "not", "must", "only", "what", "when", "where", "which", "while",
            "các", "và", "hoặc", "cho", "của", "trong", "ngoài", "liên", "quan"
    ));

    public Word.Definition selectDefinition(Word word, VocabTopic topic, VocabSubTopic subtopic) {
        List<Word.Definition> definitions = word.getDefinitions();

        if (definitions == null || definitions.isEmpty()) {
            return emptyDefinition();
        }

        if (subtopic == null) {
            return definitions.get(0);
        }

        ContextProfile profile = buildContextProfile(topic, subtopic);
        boolean exactContext = sameText(word.getContext(), subtopic.getDescription());

        Word.Definition best = definitions.get(0);
        double bestScore = Double.NEGATIVE_INFINITY;

        for (int i = 0; i < definitions.size(); i++) {
            Word.Definition def = definitions.get(i);
            double score = scoreDefinition(def, word, subtopic, profile, i, exactContext);

            if (score > bestScore) {
                bestScore = score;
                best = def;
            }
        }

        log.debug(
                "[VocabWordEntry] Selected definition for {}|{} with score {}",
                word.getKey(),
                word.getPos(),
                bestScore
        );

        return best;
    }

    public boolean containsSameDefinition(List<Word.Definition> definitions, Word.Definition newDef) {
        if (definitions == null || definitions.isEmpty() || newDef == null) {
            return false;
        }

        String newDefinition = normalizeText(newDef.getDefinition());
        String newMeaning = normalizeText(newDef.getMeaningVi());

        if (newDefinition.isBlank() && newMeaning.isBlank()) {
            return false;
        }

        return definitions.stream().anyMatch(def ->
                normalizeText(def.getDefinition()).equals(newDefinition)
                        || (!newMeaning.isBlank()
                        && normalizeText(def.getMeaningVi()).equals(newMeaning))
        );
    }

    private double scoreDefinition(
            Word.Definition def,
            Word word,
            VocabSubTopic subtopic,
            ContextProfile profile,
            int index,
            boolean exactContext
    ) {
        String definition = normalizeText(def.getDefinition());
        String example = normalizeText(def.getExample());
        String meaningVi = normalizeText(def.getMeaningVi());

        double score = 0;

        score += keywordScore(definition, profile.subtopicIncludeKeywords, SUBTOPIC_DEF_KEYWORD_WEIGHT);
        score += keywordScore(example, profile.subtopicIncludeKeywords, SUBTOPIC_EXAMPLE_KEYWORD_WEIGHT);
        score += keywordScore(meaningVi, profile.subtopicIncludeKeywords, SUBTOPIC_MEANING_KEYWORD_WEIGHT);
        score += phraseScore(definition, profile.subtopicIncludePhrases, SUBTOPIC_DEF_PHRASE_WEIGHT);
        score += phraseScore(example, profile.subtopicIncludePhrases, SUBTOPIC_EXAMPLE_PHRASE_WEIGHT);

        score += keywordScore(definition, profile.topicDescriptionKeywords, TOPIC_DEF_KEYWORD_WEIGHT);
        score += keywordScore(example, profile.topicDescriptionKeywords, TOPIC_EXAMPLE_KEYWORD_WEIGHT);
        score += keywordScore(meaningVi, profile.topicDescriptionKeywords, TOPIC_MEANING_KEYWORD_WEIGHT);
        score += phraseScore(definition, profile.topicDescriptionPhrases, TOPIC_DEF_PHRASE_WEIGHT);
        score += phraseScore(example, profile.topicDescriptionPhrases, TOPIC_EXAMPLE_PHRASE_WEIGHT);

        score += keywordScore(definition, profile.titleTagKeywords, TITLE_TAG_DEF_KEYWORD_WEIGHT);
        score += keywordScore(example, profile.titleTagKeywords, TITLE_TAG_EXAMPLE_KEYWORD_WEIGHT);
        score += keywordScore(meaningVi, profile.titleTagKeywords, TITLE_TAG_MEANING_KEYWORD_WEIGHT);
        score += phraseScore(definition, profile.titleTagPhrases, TITLE_TAG_DEF_PHRASE_WEIGHT);
        score += phraseScore(example, profile.titleTagPhrases, TITLE_TAG_EXAMPLE_PHRASE_WEIGHT);

        score += cefrScore(def.getLevel(), subtopic.getCefrLevel());

        if (isBlank(def.getDefinition())) {
            score -= MISSING_DEFINITION_PENALTY;
        }

        if (isBlank(def.getExample())) {
            score -= MISSING_EXAMPLE_PENALTY;
        }

        if (isBlank(def.getMeaningVi())) {
            score -= MISSING_MEANING_PENALTY;
        }

        String wordText = word.getText() != null && !word.getText().isBlank()
                ? normalizeText(word.getText())
                : normalizeText(word.getKey() != null ? word.getKey().replace('_', ' ') : "");

        if (!wordText.isBlank() && !example.contains(wordText)) {
            score -= WORD_NOT_IN_EXAMPLE_PENALTY;
        }

        if (exactContext && index == 0) {
            score += EXACT_CONTEXT_INDEX0_BONUS;
        }

        score -= index * INDEX_TIEBREAKER_FACTOR;

        return score;
    }

    private ContextProfile buildContextProfile(VocabTopic topic, VocabSubTopic subtopic) {
        String subtopicTitle = safe(subtopic.getTitle());
        String subtopicTitleVi = safe(subtopic.getTitleVi());
        String subtopicDescription = safe(subtopic.getDescription());

        String topicTitle = topic != null ? safe(topic.getTitle()) : "";
        String topicDescription = topic != null ? safe(topic.getDescription()) : "";
        String topicTags = topic != null && topic.getTags() != null
                ? joinText(topic.getTags().toArray(String[]::new))
                : "";

        ContextProfile profile = new ContextProfile();

        profile.subtopicIncludeText = normalizeText(extractIncludedText(subtopicDescription));
        if (profile.subtopicIncludeText.isBlank()) {
            profile.subtopicIncludeText = normalizeText(subtopicDescription);
        }

        profile.topicDescriptionText = normalizeText(topicDescription);
        profile.titleTagText = normalizeText(joinText(
                subtopicTitle,
                subtopicTitleVi,
                topicTitle,
                topicTags
        ));

        profile.subtopicIncludeKeywords = extractKeywords(profile.subtopicIncludeText);
        profile.topicDescriptionKeywords = extractKeywords(profile.topicDescriptionText);
        profile.titleTagKeywords = extractKeywords(profile.titleTagText);

        profile.subtopicIncludePhrases = extractPhrases(profile.subtopicIncludeText);
        profile.topicDescriptionPhrases = extractPhrases(profile.topicDescriptionText);
        profile.titleTagPhrases = extractPhrases(profile.titleTagText);

        return profile;
    }

    private String extractIncludedText(String description) {
        if (isBlank(description)) {
            return "";
        }

        List<String> included = Arrays.stream(description.split("(?<=[.!?])\\s+"))
                .filter(sentence -> {
                    String s = sentence.toLowerCase(Locale.ROOT);
                    return s.contains("include")
                            || s.contains("focus")
                            || s.contains("cover");
                })
                .toList();

        return included.isEmpty() ? description : String.join(" ", included);
    }

    private double keywordScore(String text, Set<String> keywords, double weight) {
        if (text == null || text.isBlank() || keywords == null || keywords.isEmpty()) {
            return 0;
        }

        double score = 0;
        Set<String> textTokens = extractKeywords(text);

        for (String keyword : keywords) {
            if (textTokens.contains(keyword)) {
                score += weight;
            }
        }

        return score;
    }

    private double phraseScore(String text, List<String> phrases, double weight) {
        if (text == null || text.isBlank() || phrases == null || phrases.isEmpty()) {
            return 0;
        }

        double score = 0;
        String normalized = normalizeText(text);

        for (String phrase : phrases) {
            if (normalized.contains(phrase)) {
                score += weight;
            }
        }

        return score;
    }

    private Set<String> extractKeywords(String text) {
        String normalized = normalizeText(text);

        if (normalized.isBlank()) {
            return Set.of();
        }

        Set<String> result = new LinkedHashSet<>();

        for (String token : normalized.split("\\s+")) {
            if (token.length() < 3) {
                continue;
            }

            if (CONTEXT_STOP_WORDS.contains(token)) {
                continue;
            }

            result.add(token);
        }

        return result;
    }

    private List<String> extractPhrases(String text) {
        List<String> tokens = new ArrayList<>(extractKeywords(text));
        List<String> phrases = new ArrayList<>();

        for (int size = 2; size <= 3; size++) {
            for (int i = 0; i + size <= tokens.size(); i++) {
                String phrase = String.join(" ", tokens.subList(i, i + size));

                if (phrase.length() >= 8) {
                    phrases.add(phrase);
                }
            }
        }

        return phrases;
    }

    private double cefrScore(CefrLevel actual, CefrLevel target) {
        if (actual == null || target == null) {
            return 0;
        }

        int distance = Math.abs(actual.ordinal() - target.ordinal());

        return switch (distance) {
            case 0 -> 6;
            case 1 -> 3;
            case 2 -> 0;
            default -> -2;
        };
    }

    private Word.Definition emptyDefinition() {
        return Word.Definition.builder()
                .definition("")
                .meaningVi("")
                .example("")
                .viExample("")
                .level(CefrLevel.B1)
                .build();
    }

    private boolean sameText(String a, String b) {
        return !isBlank(a)
                && !isBlank(b)
                && normalizeText(a).equals(normalizeText(b));
    }

    private String normalizeText(String value) {
        if (value == null) {
            return "";
        }

        return NON_WORD_PATTERN.matcher(value.toLowerCase(Locale.ROOT))
                .replaceAll(" ")
                .trim()
                .replaceAll("\\s+", " ");
    }

    private String joinText(String... values) {
        if (values == null) {
            return "";
        }

        return Arrays.stream(values)
                .filter(v -> v != null && !v.isBlank())
                .collect(Collectors.joining(" "));
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static class ContextProfile {
        String subtopicIncludeText = "";
        String topicDescriptionText = "";
        String titleTagText = "";

        Set<String> subtopicIncludeKeywords = Set.of();
        Set<String> topicDescriptionKeywords = Set.of();
        Set<String> titleTagKeywords = Set.of();

        List<String> subtopicIncludePhrases = List.of();
        List<String> topicDescriptionPhrases = List.of();
        List<String> titleTagPhrases = List.of();
    }
}