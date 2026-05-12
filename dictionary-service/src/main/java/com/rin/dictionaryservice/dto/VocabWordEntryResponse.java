package com.rin.dictionaryservice.dto;

import com.rin.dictionaryservice.model.Word;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class VocabWordEntryResponse {
    String id;
    String wordKey;
    String pos;
    int order;
    boolean wordReady;
    String note;
    Word wordDetail;
}
