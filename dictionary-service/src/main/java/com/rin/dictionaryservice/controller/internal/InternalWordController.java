package com.rin.dictionaryservice.controller.internal;

import com.rin.dictionaryservice.model.Word;
import com.rin.dictionaryservice.service.WordService;
import com.rin.englishlearning.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("/internal/words")
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class InternalWordController {
    WordService wordService;


    @PutMapping("/{id}")
    public ApiResponse<Void> saveWord(@RequestBody Word updatedWord,
                                      @PathVariable String id) {
        wordService.saveWord(updatedWord, id);
        return ApiResponse.success("Ok");
    }
}
