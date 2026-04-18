package com.rin.dictionaryservice.utils;



public class TextUtils {
    private TextUtils() {
        /* This utility class should not be instantiated */
    }
    public static String canonicalForm(String text) {
        if (text == null) return null;

        text = text.trim();

        // remove noise đầu/cuối trực tiếp
        text = text.replaceAll("^[^a-zA-Z'-]+", "");
        text = text.replaceAll("[^a-zA-Z'-]+$", "");

        // normalize apostrophe + lowercase
        text = text.replace('’', '\'').toLowerCase();

        // remove toàn bộ ký tự không phải a-z0-9 (final cleanup)
        text = text.replaceAll("[^a-z0-9]", "");

        return text.isEmpty() ? null : text;
    }public static String normalizeWordSoft(String word) {
        if (word == null) return null;

        word = word.trim();

        // remove ký tự không hợp lệ ở đầu
        word = word.replaceAll("^[^a-zA-Z'-]+", "");

        // remove ký tự không hợp lệ ở cuối
        word = word.replaceAll("[^a-zA-Z'-]+$", "");

        return word;
    }
}