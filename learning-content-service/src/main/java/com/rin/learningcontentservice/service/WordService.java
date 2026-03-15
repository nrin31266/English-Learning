package com.rin.learningcontentservice.service;

import com.rin.learningcontentservice.repository.LessonWordRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;

@RequiredArgsConstructor
@Service
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WordService {
    LessonWordRepository lessonWordRepository;


}
