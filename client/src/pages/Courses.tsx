import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";


import courseService from "@/services/courseService";
import instructorService from "@/services/instructorService";


interface Course {
  _id: string;
  title: string;
  description: string;
  instructor: {
    name: string;
  };
  category: {
    name: string;
  };
  courseCode?: string;
  progress?: number; // Optional for instructor courses
  icon?: string;
  iconColor?: string;
  imageUrl?: string;
  stats?: {
    enrollments: number;
    completions: number;
    averageRating: number;
    totalRatings: number;
  };
  published?: boolean;
}

const Courses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const getCourseIcon = (title: string, iconColor?: string) => {
    // Generate a consistent icon based on course title
    const hash = title.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const iconIndex = Math.abs(hash) % 6;
    
    const icons = [
      // Hexagons (like Program Overview)
      <svg key="hexagons" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L14.5 8.5L21 11L14.5 13.5L12 20L9.5 13.5L3 11L9.5 8.5L12 2Z"/>
        <path d="M12 6L13 9L16 10L13 11L12 14L11 11L8 10L11 9L12 6Z"/>
      </svg>,
      // Concentric circles (like AI Fundamentals)
      <svg key="circles" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <circle cx="12" cy="12" r="2" fill="currentColor"/>
      </svg>,
      // Horizontal lines (like Statistics)
      <svg key="lines" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="7" width="18" height="2" rx="1"/>
        <rect x="3" y="11" width="14" height="2" rx="1"/>
        <rect x="3" y="15" width="10" height="2" rx="1"/>
      </svg>,
      // Overlapping squares (like Machine Learning)
      <svg key="squares" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="4" width="8" height="8" rx="1"/>
        <rect x="8" y="8" width="8" height="8" rx="1"/>
      </svg>,
      // Database/stacked ovals (like Research)
      <svg key="database" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <ellipse cx="12" cy="6" rx="8" ry="3"/>
        <ellipse cx="12" cy="12" rx="8" ry="3"/>
        <ellipse cx="12" cy="18" rx="8" ry="3"/>
      </svg>,
      // Grid (like Pre Work)
      <svg key="grid" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="4" width="6" height="6" rx="1"/>
        <rect x="12" y="4" width="6" height="6" rx="1"/>
        <rect x="4" y="12" width="6" height="6" rx="1"/>
        <rect x="12" y="12" width="6" height="6" rx="1"/>
      </svg>
    ];
    
    return icons[iconIndex];
  };

  const getCourseColor = (title: string) => {
    // Generate a consistent color based on course title and user role
    const hash = title.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const colorIndex = Math.abs(hash) % 6;
    
    // Different color schemes for students vs instructors
    const studentColors = [
      'bg-blue-500',      // Blue
      'bg-green-500',     // Green
      'bg-orange-500',    // Orange
      'bg-teal-500',      // Teal
      'bg-cyan-500',      // Cyan
      'bg-emerald-500'    // Emerald
    ];
    
    const instructorColors = [
      'bg-purple-500',    // Purple
      'bg-indigo-500',    // Indigo
      'bg-pink-500',      // Pink
      'bg-rose-500',      // Rose
      'bg-violet-500',    // Violet
      'bg-fuchsia-500'    // Fuchsia
    ];
    
    return user?.role === 'instructor' ? instructorColors[colorIndex] : studentColors[colorIndex];
  };



  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        let response;
        
        if (user?.role === 'instructor') {
          // For instructors, get courses they are assigned to teach
          response = await instructorService.getMyCourses();
        } else {
          // For learners, get courses they are enrolled in
          response = await courseService.getMyCourses();
        }
        
        setCourses(response.data.courses);
      } catch (error) {
        console.error('Error fetching courses:', error);
        // Fallback to empty array if API fails
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [user?.role]);

  if (loading) {
    return (
      <div className="container mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">
              {user?.role === 'instructor' ? 'My Teaching Courses' : 'Active Courses'}
            </h1>

          </div>
        </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((course) => (
          <Card 
            key={course._id} 
            className="hover:shadow-md transition-all duration-200 cursor-pointer border-0 shadow-sm"
            onClick={() => navigate(`/courses/${course._id}`)}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-lg ${getCourseColor(course.title)} flex items-center justify-center text-white flex-shrink-0`}>
                  {getCourseIcon(course.title, course.iconColor)}
                </div>
                
                {/* Course Title */}
                <div>
                  <h3 className="font-medium text-foreground text-sm line-clamp-2 leading-tight">
                    {course.title}
                  </h3>
                </div>
                
                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-muted rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full ${(course.progress || 0) > 0 ? 'bg-foreground' : 'bg-muted-foreground/20'}`}
                      style={{ width: `${course.progress || 0}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {course.progress || 0}% complete
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Courses;
