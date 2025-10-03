import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import Navbar from "./components/Navbar";
import PageTransition from "./components/PageTransition";
import Layout from "./components/Layout";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import InstructorDashboard from "./pages/InstructorDashboard";
import InstructorSessions from "./pages/InstructorSessions";
import InstructorMaterials from "./pages/InstructorMaterials";
import AdminDashboard from "./pages/AdminDashboard";
import Courses from "./pages/Courses";
import UnifiedCourseDetail from "./pages/UnifiedCourseDetail";
import LessonViewer from "./pages/LessonViewer";
import Activity from "./pages/Activity";
import UserManagement from "./pages/UserManagement";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <div className="min-h-screen bg-background">
              <PageTransition>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password/:token" element={<ResetPassword />} />
                  <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
                  <Route path="/courses" element={<Layout><Courses /></Layout>} />
                  <Route path="/courses/:courseId" element={<Layout><UnifiedCourseDetail /></Layout>} />
                  <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonViewer />} />
                  <Route path="/activity" element={<Layout><Activity /></Layout>} />
                  
                  {/* Instructor Routes */}
                  <Route path="/instructor/dashboard" element={<Layout><InstructorDashboard /></Layout>} />
                  <Route path="/instructor/sessions" element={<Layout><InstructorSessions /></Layout>} />
                  <Route path="/instructor/materials" element={<Layout><InstructorMaterials /></Layout>} />
                  <Route path="/instructor/courses/:courseId" element={<Layout><UnifiedCourseDetail /></Layout>} />
                  
                  {/* Admin Routes */}
                  <Route path="/admin/dashboard" element={<Layout><AdminDashboard /></Layout>} />
                  <Route path="/admin/users" element={<Layout><UserManagement /></Layout>} />
                  
                  {/* User Routes */}
                  <Route path="/profile" element={<Layout><Profile /></Layout>} />
                  <Route path="/settings" element={<Layout><Settings /></Layout>} />
                  
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<Layout><NotFound /></Layout>} />
                </Routes>
              </PageTransition>

            </div>
          </BrowserRouter>
          </TooltipProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
