package com.rin.notificationservice.ws.principal;

import lombok.Data;

import java.security.Principal;

public class StompPrincipal implements Principal {
    private final String keyCloakId;

    public StompPrincipal(String keyCloakId) {
        this.keyCloakId = keyCloakId;
    }

    @Override
    public String getName() {
        return keyCloakId;
    }
}
