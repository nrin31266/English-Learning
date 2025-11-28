import FullScreenSpinner from "@/components/FullScreenSpinner"
import AppLayout from "@/components/layout/AppLayout"
import { Suspense, lazy, type ReactElement } from "react"
import { createBrowserRouter } from "react-router-dom"


const HomePage = () => <div>Home Page</div>
const TopicsPage = lazy(() => import('@/features/topic/pages/Topics'))
const TopicsDetailsPage = lazy(() => import('@/features/topic/pages/TopicDetails'))
const ShadowingModePage = lazy(() => import('@/features/learnshadowing/pages/ShadowingMode'))
const DictionaryPage = () => <div>Dictionary Page</div>
const ReviewPage = () => <div>Review Page</div>
const SettingsPage = () => <div>Settings Page</div>
const ProfilePage = () => <div>Profile Page</div>
export const withSuspense = (element: ReactElement) => (
  <Suspense fallback={<FullScreenSpinner label="Waiting..."/>}>
    {element}
  </Suspense>
)

const router = createBrowserRouter([
    
      {
        element: <AppLayout />, // layout bọc các route con
         children: [
      {
        path: "/",
        element: <HomePage />,
      },
      {
        path: "/topics",
        element: withSuspense(<TopicsPage />),
      },
      {
        path: "/topics/:slug",
        element: withSuspense(<TopicsDetailsPage />),
      },
      {
        path: "/learn/lessons/:slug/shadowing",
        element: withSuspense(<ShadowingModePage />),
      },
      {
        path: "/dictionary",
        element: <DictionaryPage />,
      },
      {
        path: "/review",
        element: <ReviewPage />,
      },
      {
        path: "/settings",
        element: <SettingsPage />,
      },
      {
        path: "/profile",
        element: <ProfilePage />,
      },
    ],
      },
]);

export default router;
