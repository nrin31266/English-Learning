package com.rin.dictionaryservice.dto.admin;

import lombok.Data;

@Data
public class PatchWordDefinitionRequest {
    String definition;
    String meaningVi;
    String example;
    String viExample;
    String level;
    Boolean syncUsedEntries;
}

