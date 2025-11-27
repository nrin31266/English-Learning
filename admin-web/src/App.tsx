import { RouterProvider } from 'react-router-dom'
import router from './routers/router'
import AuthProvider from './features/keycloak/providers/AuthProvider'
import { Provider } from 'react-redux'
import store from './store'
import WebSockerProvider from './features/ws/providers/WebSockerProvider'
import { NotificationHost } from './components/NotificationHost'

const App = () => {
  return (
    <AuthProvider>
      <WebSockerProvider>
        <Provider store={store}>
          <RouterProvider router={router} />
          <NotificationHost />
        </Provider>

      </WebSockerProvider>

    </AuthProvider>
  )
}

export default App