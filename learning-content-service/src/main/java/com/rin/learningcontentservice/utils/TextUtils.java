package com.rin.learningcontentservice.utils;

import java.text.Normalizer;

public class TextUtils {
    private TextUtils() {
        /* This utility class should not be instantiated */
    }


    // Kiểm tra token có chứa dấu câu không
    public static boolean hasPunctuation(String token) {
        if (token == null || token.isEmpty()) return false;

        String punctuationMarks = ".,!?;:\"()[]{}…—–-";
        for (char c : token.toCharArray()) {
            if (punctuationMarks.indexOf(c) >= 0) {
                return true;
            }
        }
        return false;
    }
    public static String normalizeWordLower(String word) {
        if (word == null) return null;

        return word.toLowerCase().trim();
    }

    public static String normalizeWordSoft(String word) {
        if (word == null) return null;

        word = word.trim();

        // remove ký tự không hợp lệ ở đầu
        word = word.replaceAll("^[^a-zA-Z'-]+", "");

        // remove ký tự không hợp lệ ở cuối
        word = word.replaceAll("[^a-zA-Z'-]+$", "");

        return word;
    }

    // Tạo slug từ chuỗi (bỏ dấu, thay space bằng -)
    public static String createSlug(String input) {
        if (input == null) return null;

        // Bỏ dấu tiếng Việt
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
        String withoutAccents = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");

        // Xóa ký tự đặc biệt, thay space bằng -
        String cleaned = withoutAccents.toLowerCase().replaceAll("[^a-z0-9\\s-]", "");
        String dashed = cleaned.trim().replaceAll("\\s+", "-");

        return dashed.replaceAll("-{2,}", "-");
    }
}