package com.rin.learningcontentservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@EnableFeignClients
@SpringBootApplication
public class LearningContentServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(LearningContentServiceApplication.class, args);
    }

}
