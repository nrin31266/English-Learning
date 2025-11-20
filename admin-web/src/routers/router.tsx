import AuthProvider from "@/features/keycloak/providers/AuthProvider";
import AppLayout from "@/components/layout/AppLayout";
import { createBrowserRouter } from "react-router-dom";

const router = createBrowserRouter([
  {
    element: <AuthProvider />,
    children: [
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
            element: <div>Topics Page</div>,
          },
          {
            path: "/all-lessons",
            element: <div>All Lessons Page</div>,
          },
          {
            path: "/generate-lessons",
            element: <div>Generate Lessons Page</div>,
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
    ],
  },
]);

export default router;
