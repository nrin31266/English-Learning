package com.rin.dictionaryservice.model.sub;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Definition {

    String type;        // noun, verb, adj...
    String definition;  // meaning in English
    String vietnamese;  // Vietnamese translation
    String example;     // Example sentence
}
