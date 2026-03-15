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

    // Chuẩn hóa từ: chữ thường, bỏ dấu nháy, chỉ giữ a-z0-9
    public static String normalizeWordLower(String token) {
        if (token == null) return null;

        return token
                .toLowerCase()
                .replace("'", "")
                .replaceAll("[^a-z0-9]", "");
    }

    // Tạo slug từ chuỗi (bỏ dấu, thay space bằng -)
    public static String toSlug(String input) {
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