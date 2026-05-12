package com.rin.dictionaryservice.dto;

import com.rin.dictionaryservice.model.Word;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class VocabWordEntryResponse {
    String id;
    String wordKey;
    String wordText;         // display text with proper casing & diacritics (Word.text, e.g. "Node.js", "déjà")
    String pos;
    int order;
    boolean wordReady;
    String note;
    Word wordDetail;

    // ─── Context-matched definition ──────────────────
    String contextDefinition;  // EN
    String contextMeaningVi;   // VI
    String contextExample;     // EN Example
    String contextViExample;   // VI Example
    String contextLevel;       // e.g. "B1"
}
