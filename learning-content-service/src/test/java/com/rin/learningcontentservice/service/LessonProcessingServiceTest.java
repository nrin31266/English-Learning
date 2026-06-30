package com.rin.learningcontentservice.service;

import com.rin.learningcontentservice.dto.request.ProgressUpdateRequest;
import com.rin.learningcontentservice.dto.response.ProgressUpdateResponse;
import com.rin.learningcontentservice.kafka.KafkaProducer;
import com.rin.learningcontentservice.model.*;
import com.rin.learningcontentservice.repository.LessonRepository;
import com.rin.learningcontentservice.repository.UserLessonProgressRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LessonProcessingServiceTest {
    @Mock private LessonRepository lessonRepository;
    @Mock private UserLessonProgressRepository progressRepository;
    @Mock private KafkaProducer kafkaProducer;

    private LessonProcessingService service;
    private UserLessonProgress progress;

    @BeforeEach
    void setUp() {
        service = new LessonProcessingService(lessonRepository, progressRepository, kafkaProducer);
        Jwt jwt = Jwt.withTokenValue("token").header("alg", "none")
                .subject("user-1").issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60)).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(jwt, null, List.of()));

        LessonSentence sentence = LessonSentence.builder().id(10L).isActive(true).build();
        Lesson lesson = Lesson.builder().id(1L).version(1).sentences(List.of(sentence)).build();
        progress = UserLessonProgress.builder().userId("user-1").lessonId(1L)
                .mode(LearningMode.SHADOWING).lessonVersion(1).build();
        when(lessonRepository.findById(1L)).thenReturn(Optional.of(lesson));
        when(progressRepository.findByUserIdAndLessonIdAndMode("user-1", 1L, LearningMode.SHADOWING))
                .thenReturn(Optional.of(progress));
        when(progressRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void shadowingCompletesAtAnyScoreAndOnlyRewardsBestScoreDelta() {
        ProgressUpdateResponse first = update(40);
        assertThat(first.isJustCompletedLesson()).isTrue();
        assertThat(progress.getProgressItems().get(10L).getBestScore()).isEqualTo(40);
        assertThat(progress.getLessonScore()).isEqualTo(40);

        clearInvocations(kafkaProducer);
        ProgressUpdateResponse lower = update(30);
        assertThat(lower.isJustCompletedLesson()).isFalse();
        assertThat(progress.getProgressItems().get(10L).getBestScore()).isEqualTo(40);
        assertThat(progress.getProgressItems().get(10L).getLatestScore()).isEqualTo(30);
        verifyNoInteractions(kafkaProducer);

        update(70);
        assertThat(progress.getProgressItems().get(10L).getBestScore()).isEqualTo(70);
        assertThat(progress.getProgressItems().get(10L).getAttemptCount()).isEqualTo(3);
        assertThat(progress.getLessonScore()).isEqualTo(70);
        ArgumentCaptor<com.rin.englishlearning.common.event.GamificationRewardEvent> event =
                ArgumentCaptor.forClass(com.rin.englishlearning.common.event.GamificationRewardEvent.class);
        verify(kafkaProducer).publishGamificationRewardEvent(event.capture());
        assertThat(event.getValue().getDeltaScore()).isEqualTo(30);
    }

    private ProgressUpdateResponse update(double score) {
        return service.updateProgress(ProgressUpdateRequest.builder()
                .lessonId(1L).sentenceId(10L).mode(LearningMode.SHADOWING).score(score).build());
    }
}
