package com.rin.dictionaryservice.repository.httpclient;


import com.rin.dictionaryservice.dto.DictionaryApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.List;

@FeignClient(name = "dictionary-api-client", url = "https://api.dictionaryapi.dev")
public interface DictionaryApiClient {

    @GetMapping("/api/v2/entries/en/{word}")
    List<DictionaryApiResponse> getWord(@PathVariable("word") String word);
}