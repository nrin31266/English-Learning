package com.rin.dictionaryservice.dto.admin;

import com.rin.dictionaryservice.constant.WordCreationStatus;
import com.rin.dictionaryservice.model.CefrLevel;
import com.rin.dictionaryservice.model.Word;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class AdminWordDetailResponse {
    String id;
    String text;
    String key;
    String pos;
    WordCreationStatus status;
    String summaryVi;
    Word.Phonetics phonetics;
    List<WordDefinitionDto> definitions;
    boolean isPhrase;
    String phraseType;
    boolean isValid;
    CefrLevel cefrLevel;
    String context;
    long usedEntryCount;
    long readyEntryCount;
    List<WordEntryUsageResponse> entriesPreview;
    WordDefinitionSyncSummary syncSummary;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}

