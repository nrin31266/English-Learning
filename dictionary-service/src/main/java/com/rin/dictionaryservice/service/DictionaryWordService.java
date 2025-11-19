package com.rin.dictionaryservice.service;

import com.rin.dictionaryservice.repository.DictionaryWordRepository;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@FieldDefaults(makeFinal = true, level = lombok.AccessLevel.PRIVATE)
@RequiredArgsConstructor
public class DictionaryWordService {
    DictionaryWordRepository dictionaryWordRepository;


}
