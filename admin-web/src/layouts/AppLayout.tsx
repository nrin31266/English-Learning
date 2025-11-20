import AppHeader from '@/components/layout/AppHeader'
import LogoName from '@/components/LogoName'
import { Button } from '@/components/ui/button'
import KeycloakClient from '@/features/keycloak/keycloak'
import React from 'react'
import { Outlet } from 'react-router-dom'

const AppLayout = () => {
  return (
    <div className='grid grid-rows-2'>
      <AppHeader/>
      
      
      {/* AppLayout
      <Button
        onClick={() => {
          const keycloak = KeycloakClient.getInstance().keycloak;
          keycloak.login();
        }}
      >Login</Button>
      <Button
        onClick={() => {
          const keycloak = KeycloakClient.getInstance().keycloak;
          const confirmLogout = window.confirm("Bạn có chắc muốn đăng xuất không?");
          if (confirmLogout) {
            keycloak.logout();
          }
        }}
      >
        Logout
      </Button>
      <Outlet />

      <Outlet />

      <Button
        onClick={() => {
          const keycloak = KeycloakClient.getInstance().keycloak;
          keycloak.accountManagement();
          // keycloak.login();
        }}
      >Security</Button>
      <Outlet /> */}
    </div>
  )
}

export default AppLayout