package com.rin.dictionaryservice.dto.admin;

import com.rin.dictionaryservice.constant.WordCreationStatus;
import com.rin.dictionaryservice.model.CefrLevel;
import com.rin.dictionaryservice.model.Word;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AdminWordResponse {
    String id;
    String text;
    String key;
    String pos;
    WordCreationStatus status;
    String summaryVi;
    CefrLevel cefrLevel;
    Word.Phonetics phonetics;
    int definitionCount;
    long usedEntryCount;
    long readyEntryCount;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}

