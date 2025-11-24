import { RouterProvider } from 'react-router-dom'
import router from './routers/router'
import AuthProvider from './features/keycloak/providers/AuthProvider'
import { Provider } from 'react-redux'
import store from './store'
import WebSockerProvider from './features/ws/providers/WebSockerProvider'

const App = () => {
  return (
    <AuthProvider>
      <WebSockerProvider>
        <Provider store={store}>
          <RouterProvider router={router} />
        </Provider>

      </WebSockerProvider>

    </AuthProvider>
  )
}

export default App