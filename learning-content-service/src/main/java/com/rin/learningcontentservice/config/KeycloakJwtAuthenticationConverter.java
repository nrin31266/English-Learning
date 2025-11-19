package com.rin.learningcontentservice.config;


import org.springframework.core.convert.converter.Converter;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class KeycloakJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {


    @Override
    public AbstractAuthenticationToken convert(@NonNull Jwt source) {
        return new JwtAuthenticationToken(
                source,
                // concat : nối 2 stream lại với nhau
                // new JwtGrantedAuthoritiesConverter().convert(source).stream() is realm_access now

                Stream.concat(
                        new JwtGrantedAuthoritiesConverter().convert(source).stream(),
                        extractResourceRoles(source).stream()
                ).collect(Collectors.toSet())
        );
    }
//? extends GrantedAuthority = collection chứa “cái gì đó là GrantedAuthority hoặc subclass”
//    Cho phép linh hoạt truyền các collection khác nhau mà vẫn an toàn về kiểu.
//    Cách phổ biến trong Spring Security để trả authorities từ JWT converter.
    private Collection<? extends GrantedAuthority> extractResourceRoles(Jwt jwt) {
        // Logic to extract roles from the JWT token
        var resourceAccess = new HashMap<>(jwt.getClaim("resource_access"));
        var eternal = (Map<String, List<String>>) resourceAccess.get("account");
        var roles = eternal.get("roles");
        return roles.stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.replace("-", "_").toUpperCase()))
                .toList();
    }
}
