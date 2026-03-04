package com.rin.notificationservice.ws.principal;


import java.security.Principal;

public class StompPrincipal implements Principal {
    private final String keycloakId;

    public StompPrincipal(String keycloakId) {
        this.keycloakId = keycloakId;
    }

    @Override
    public String getName() {
        return keycloakId;
    }
}
