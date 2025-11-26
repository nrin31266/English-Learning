package com.rin.learningcontentservice.utils;

import org.springframework.stereotype.Component;

@Component
public class TextUtils {

    public boolean hasPunctuation(String token) {
        if (token == null || token.isEmpty()) return false;

        // Các punctuation phổ biến trong tiếng Anh
        String puncts = ".,!?;:\"()[]{}…—–-";

        for (char c : token.toCharArray()) {
            if (puncts.indexOf(c) >= 0) {
                return true;
            }
        }
        return false;
    }

    public String normalizeWordLower(String token) {
        if (token == null) return null;

        return token
                .toLowerCase()                 // chữ thường
                .replace("'", "")              // bỏ apostrophe (it's → its)
                .replaceAll("[^a-z0-9]", "");  // ❗ giữ lại chữ + số
    }



    public String toSlug(String input) {
        if (input == null) return null;

        // 1) Normalize unicode (loại dấu tiếng Việt)
        String normalized = java.text.Normalizer.normalize(input, java.text.Normalizer.Form.NFD);
        String withoutAccents = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");

        // 2) Chỉ giữ a-z, 0-9 và space
        String cleaned = withoutAccents.toLowerCase().replaceAll("[^a-z0-9\\s-]", "");

        // 3) Replace space thành dấu -
        String dashed = cleaned.trim().replaceAll("\\s+", "-");

        // 4) Remove multiple hyphens
        return dashed.replaceAll("-{2,}", "-");
    }



}
