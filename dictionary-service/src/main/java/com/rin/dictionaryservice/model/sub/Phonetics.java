package com.rin.dictionaryservice.model.sub;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Phonetics {
    String us;      // IPA US
    String uk;      // IPA UK
    String audioUs; // Link audio US
    String audioUk; // Link audio UK
}
