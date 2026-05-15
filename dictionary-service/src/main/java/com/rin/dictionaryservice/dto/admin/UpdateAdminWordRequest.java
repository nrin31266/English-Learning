package com.rin.dictionaryservice.dto.admin;

import com.rin.dictionaryservice.model.Word;
import lombok.Data;

@Data
public class UpdateAdminWordRequest {
    String text;
    String summaryVi;
    Word.Phonetics phonetics;
    String cefrLevel;
    Boolean isPhrase;
    String phraseType;
    Boolean isValid;
    String context;
    String status;
}

