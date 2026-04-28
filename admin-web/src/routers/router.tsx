import AppLayout from "@/components/layout/AppLayout"
import { createBrowserRouter } from "react-router-dom"
import { Suspense, lazy, type ReactElement } from "react"
import SkeletonComponent from "@/components/SkeletonComponent"
import LessonDetails from "@/features/learningcontent/pages/LessonDetails"


const AllTopic = lazy(() => import("@/features/learningcontent/pages/AllTopic"))
const GenerateLessons = lazy(() => import("@/features/learningcontent/pages/GenerateLessons"))
const AllLesson = lazy(() => import("@/features/learningcontent/pages/AllLesson"))


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
            element: <div>Dashboard</div>,
          },
          {
            path: "/topics",
            element: withSuspense(<AllTopic />),
          },
          {
            path: "/all-lessons",
            element: withSuspense(<AllLesson />),
          },
          {
            path: "/lessons/:slug",
            element: withSuspense(<LessonDetails />),
          },
          {
            path: "/generate-lessons",
            element: withSuspense(<GenerateLessons />),
          },

          // {
          //   path: "/all-words",
          //   element: <div>All Words Page</div>,
          // },
          // {
          //   path: "/word-queue",
          //   element: withSuspense(<WordQueue />),
          // },


          {
            path: "/system/health",
            element: <div>Health Check Page</div>,
          },
          {
            path: "/system/queues",
            element: <div>Queue Monitor Page</div>,
          },
          {
            path: "/system/ai-jobs",
            element: <div>AI Jobs Page</div>,
          },
          {
            path: "/system/logs",
            element: <div>Logs Page</div>,
          },

          {
            path: "/profile",
            element: <div>Profile Page</div>,
          },
          {
            path: "/settings",
            element: <div>Settings Page</div>,
          },
        ],
      },
]);

export default router;
