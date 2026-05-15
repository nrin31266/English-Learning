package com.rin.dictionaryservice.dto.admin;

import lombok.Data;

@Data
public class CreateAdminWordRequest {
    String wordText;
    String pos;
    String context;
}

