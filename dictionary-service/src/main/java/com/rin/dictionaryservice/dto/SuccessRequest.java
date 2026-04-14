package com.rin.dictionaryservice.dto;

import com.rin.dictionaryservice.model.CefrLevel;
import com.rin.dictionaryservice.model.Word;
import lombok.Data;
import java.util.List;

@Data
public class SuccessRequest {
    String summaryVi;
    Word.Phonetics phonetics;
    List<Word.Definition> definitions;
    Boolean isValid;  // true: hợp lệ, false: không hợp lệ (từ rác, ký tự đặc biệt...)
    CefrLevel cefrLevel;
}