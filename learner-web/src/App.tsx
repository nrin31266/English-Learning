import { RouterProvider } from 'react-router-dom'
import router from './routers/router'
import AuthProvider from './features/keycloak/providers/AuthProvider'
import { Provider } from 'react-redux'
import store from './store'
import WebSockerProvider from './features/ws/providers/WebSockerProvider'
import { NotificationHost } from './components/NotificationHost'


const App = () => {
  return (
    <Provider store={store}> {/* ĐƯA REDUX PROVIDER LÊN ĐẦU TIÊN */}
    
      <AuthProvider>
        <WebSockerProvider>
          
          <RouterProvider router={router} />
          <NotificationHost />
          
        </WebSockerProvider>
      </AuthProvider>
    </Provider>
  )
}

export default App