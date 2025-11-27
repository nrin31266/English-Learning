import AppLayout from "@/components/layout/AppLayout"
import { createBrowserRouter } from "react-router-dom"
import { Suspense, lazy, type ReactElement } from "react"
import SkeletonComponent from "@/components/SkeletonComponent"
import LessonDetails from "@/features/learningcontent/pages/LessonDetails"


const HomePage = () => <div>Home Page</div>
const TopicsPage = () => <div>Topics Page</div>
const DictionaryPage = () => <div>Dictionary Page</div>
const ReviewPage = () => <div>Review Page</div>
const SettingsPage = () => <div>Settings Page</div>
const ProfilePage = () => <div>Profile Page</div>
export const withSuspense = (element: ReactElement) => (
  <Suspense fallback={<SkeletonComponent/>}>
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
        element: <TopicsPage />,
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
