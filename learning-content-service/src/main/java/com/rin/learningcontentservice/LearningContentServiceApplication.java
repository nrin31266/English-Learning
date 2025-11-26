package com.rin.learningcontentservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.data.web.config.EnableSpringDataWebSupport;

//@EnableSpringDataWebSupport(pageSerializationMode = EnableSpringDataWebSupport.PageSerializationMode.VIA_DTO)
@EnableFeignClients
@SpringBootApplication
public class LearningContentServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(LearningContentServiceApplication.class, args);
    }

}
