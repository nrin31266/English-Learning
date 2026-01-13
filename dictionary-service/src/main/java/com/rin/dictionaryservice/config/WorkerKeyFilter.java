package com.rin.dictionaryservice.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@Component
public class WorkerKeyFilter extends OncePerRequestFilter {

    private static String HEADER_NAME = "X-Worker-Key";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${worker.api-key:}")
    private String workerApiKey;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        // Nếu server chưa cấu hình worker api key
        if (workerApiKey == null || workerApiKey.isBlank()) {
            writeJson(response,
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Worker API key is not configured",
                    "Missing property: worker.api-key (env WORKER_API_KEY)"
            );
            return;
        }

        String providedKey = request.getHeader(HEADER_NAME);

        if (providedKey == null || providedKey.isBlank()) {
            writeJson(response,
                    HttpStatus.UNAUTHORIZED,
                    "Unauthorized",
                    "Missing header: " + HEADER_NAME
            );
            return;
        }

        if (!Objects.equals(workerApiKey, providedKey)) {
            writeJson(response,
                    HttpStatus.UNAUTHORIZED,
                    "Unauthorized",
                    "Invalid worker key"
            );
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void writeJson(HttpServletResponse response,
                           HttpStatus status,
                           String message,
                           Object data) throws IOException {

        response.setStatus(status.value());
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        Map<String, Object> body = new HashMap<>();
        body.put("code", status.value());
        body.put("message", message);
        body.put("data", data);

        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
