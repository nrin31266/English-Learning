import React, { createContext, useContext, useEffect, useState } from 'react'
import { Stomp, type CompatClient } from "@stomp/stompjs";
import { useAuth } from '@/features/keycloak/providers/AuthProvider';
import KeycloakClient from '@/features/keycloak/keycloak';
const WsContext = createContext<CompatClient | null>(null);
export const useWebSocket = () => useContext(WsContext);
const WebSockerProvider = ({ children }: { children: React.ReactNode }) => {
    const [stompClient, setStompClient] = useState<CompatClient | null>(null);
    const auth = useAuth();

    useEffect(() => {
        if (!auth.profile?.keyCloakId) return;
        const client = Stomp.client(import.meta.env.VITE_WEBSOCKET_URL as string);
        if (!client.connected) {
            client.connect(
                {
                    Authorization: `Bearer ${KeycloakClient.getInstance().keycloak.token}`,
                },
                () => {
                    console.log("✅ Connected WebSocket");
                    setStompClient(client);

                
                },
                (err: unknown) => console.log("❌ WS connect error", err)
            );

        }
        return () => {
            if (client.connected) {
                client.disconnect(() => {
                    console.log("🔌 Disconnected WebSocket");
                });
            }
        }

    }, [auth.profile?.keyCloakId]);

    return (
        <WsContext.Provider value={stompClient}>
            {children}
        </WsContext.Provider>
    )
}

export default WebSockerProvider