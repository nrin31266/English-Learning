package com.rin.englishlearning.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ApiResponse<T> {
    @Builder.Default
    int code = 200;
    T result;
    String message;

    /**
     * Factory methods hiện tại cho 200 OK (Giữ nguyên)
     */
    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .message("Success")
                .result(data)
                .build();
    }

    public static <T> ApiResponse<T> success(T data, String message) {
        return ApiResponse.<T>builder()
                .message(message)
                .result(data)
                .build();
    }

    public static ApiResponse<Void> success(String message) {
        return ApiResponse.<Void>builder()
                .message(message)
                .build();
    }



    // 201 Created: Dùng cho POST tạo mới tài nguyên thành công
    public static <T> ResponseEntity<ApiResponse<T>> created(T data) {
        ApiResponse<T> response = ApiResponse.<T>builder()
                .code(HttpStatus.CREATED.value())
                .message("Created")
                .result(data)
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // 202 Accepted: Dùng khi nhận request và vứt vào Kafka chạy ngầm (chưa có kết quả ngay)
    public static <T> ResponseEntity<ApiResponse<T>> accepted(String message) {
        ApiResponse<T> response = ApiResponse.<T>builder()
                .code(HttpStatus.ACCEPTED.value())
                .message(message)
                .build();
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    // 204 No Content: Dùng cho PUT/DELETE thành công nhưng không cần trả data về
    // Lưu ý: Chuẩn REST thì 204 không được phép có body, nên ta trả về rỗng luôn.
    public static ResponseEntity<Void> noContent() {
        return ResponseEntity.noContent().build();
    }
}