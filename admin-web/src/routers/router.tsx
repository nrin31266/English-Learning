import AppLayout from "@/components/layout/AppLayout"
import { createBrowserRouter } from "react-router-dom"
import { Suspense, lazy, type ReactElement } from "react"
import SkeletonComponent from "@/components/SkeletonComponent"

const AllTopic = lazy(() => import("@/features/learningcontent/pages/AllTopic"))
const GenerateLessons = lazy(() => import("@/features/learningcontent/pages/GenerateLessons"))

const withSuspense = (element: ReactElement) => (
  <Suspense fallback={<SkeletonComponent/>}>
    {element}
  </Suspense>
)

const router = createBrowserRouter([
    
      {
        element: <AppLayout />, // layout bọc các route con
        children: [
           // -------------------------
          // Dashboard
          // -------------------------
          {
            path: "/",
            element: <div>Dashboard</div>,
          },

          // -------------------------
          // Learning Content
          // -------------------------
          {
            path: "/topics",
            element: withSuspense(<AllTopic />),
          },
          {
            path: "/all-lessons",
            element: <div>All Lessons Page</div>,
          },
          {
            path: "/generate-lessons",
            element: withSuspense(<GenerateLessons />),
          },

          // -------------------------
          // Vocabulary
          // -------------------------
          {
            path: "/all-words",
            element: <div>All Words Page</div>,
          },

          // -------------------------
          // System
          // -------------------------
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

          // -------------------------
          // Profile & Settings
          // -------------------------
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
