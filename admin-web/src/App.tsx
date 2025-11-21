import { RouterProvider } from 'react-router-dom'
import router from './routers/router'
import AuthProvider from './features/keycloak/providers/AuthProvider'
import { Provider } from 'react-redux'
import store from './store'

const App = () => {
  return (
   <AuthProvider>
    <Provider store={store}>
       <RouterProvider router={router} />
    </Provider>
   </AuthProvider>
  )
}

export default App