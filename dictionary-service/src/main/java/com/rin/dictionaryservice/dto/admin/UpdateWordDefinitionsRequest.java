package com.rin.dictionaryservice.dto.admin;

import lombok.Data;

import java.util.List;

@Data
public class UpdateWordDefinitionsRequest {
    List<WordDefinitionDto> definitions;
    Boolean syncUsedEntries;
}

