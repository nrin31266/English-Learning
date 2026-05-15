package com.rin.dictionaryservice.dto.admin;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WordDefinitionSyncSummary {
    int updatedEntryCount;
    int rescoredEntryCount;
    int skippedEntryCount;
}

