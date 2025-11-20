import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import KeycloakClient from '@/features/keycloak/keycloak';

import { useAuth } from '@/features/keycloak/providers/AuthProvider'

import { useTranslation } from "react-i18next";

const AccessDenied = () => {
  // const { profile } = useAuth();
  const { t } = useTranslation();
  const keycloak = KeycloakClient.getInstance().keycloak;
  return (
    <div className='flex h-screen w-full items-center justify-center'>
        <Card className='h-max w-[600px]'>
            <CardHeader className='font-bold text-red-500 text-2xl'>{t("auth.accessDenied")}</CardHeader>
            {/* ep logout */}
            <CardContent>
                <p>{t("common.hello", { name: keycloak.tokenParsed?.given_name + " " + keycloak.tokenParsed?.family_name })}</p>

                <p className='text-gray-500 mt-4'>{t("auth.adminOnly")}</p>
            </CardContent>
            <CardFooter>
                <Button
                className='w-full'
                
                onClick={() => {
                  const keycloak = KeycloakClient.getInstance().keycloak;
                   keycloak.logout({
                      // redirectUri: window.location.origin,
                    });
                }}
                >Logout</Button>
            </CardFooter>
        </Card>
    </div>
  )
}

export default AccessDenied