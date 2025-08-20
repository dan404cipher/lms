import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";
import PageTransition from "./components/PageTransition";
import Layout from "./components/Layout";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import InstructorDashboard from "./pages/InstructorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Courses from "./pages/Courses";
import UnifiedCourseDetail from "./pages/UnifiedCourseDetail";
import LessonViewer from "./pages/LessonViewer";
import Activity from "./pages/Activity";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <Navbar />
            <PageTransition>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
                <Route path="/courses" element={<Layout><Courses /></Layout>} />
                <Route path="/courses/:courseId" element={<Layout><UnifiedCourseDetail /></Layout>} />
                <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonViewer />} />
                <Route path="/activity" element={<Layout><Activity /></Layout>} />
                
                {/* Instructor Routes */}
                <Route path="/instructor/dashboard" element={<Layout><InstructorDashboard /></Layout>} />
                <Route path="/instructor/courses/:courseId" element={<Layout><UnifiedCourseDetail /></Layout>} />
                
                {/* Admin Routes */}
                <Route path="/admin/dashboard" element={<Layout><AdminDashboard /></Layout>} />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<Layout><NotFound /></Layout>} />
              </Routes>
            </PageTransition>

          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
