package com.rin.dictionaryservice.dto;

public enum WordResponseStatus {
    READY,       // có data đầy đủ từ DB
    FALLBACK,    // data tạm từ API (đang chờ worker xử lý),
    PROCESSING,
    FAILED       // worker đã thử 3 lần nhưng failed
}