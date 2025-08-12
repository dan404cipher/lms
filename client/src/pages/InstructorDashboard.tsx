import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  User, 
  LogOut, 
  Settings, 
  Play, 
  Clock, 
  Calendar,
  TrendingUp,
  Video,
  FileText,
  CheckCircle,
  ArrowRight,
  Bell,
  Users,
  Star,
  Upload,
  Eye,
  BarChart3,

} from "lucide-react";
import { useNavigate } from "react-router-dom";
import instructorService from "@/services/instructorService";

interface Course {
  _id: string;
  title: string;
  description: string;
  category: { name: string };
  courseCode?: string;
  stats: {
    enrollments: number;
    completions: number;
    averageRating: number;
    totalRatings: number;
  };
  published: boolean;
  createdAt: string;
}

interface Session {
  _id: string;
  title: string;
  description: string;
  scheduledAt: string;
  duration: number;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  courseId: string;
  courseTitle: string;
  participants: number;
}

interface Assessment {
  _id: string;
  title: string;
  type: 'quiz' | 'assignment' | 'exam';
  courseId: string;
  courseTitle: string;
  dueDate: string;
  submissions: number;
  averageScore?: number;
}

interface Material {
  _id: string;
  title: string;
  type: 'pdf' | 'video' | 'document' | 'link';
  courseId: string;
  courseTitle: string;
  uploadDate: string;
  downloads: number;
}

const InstructorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect non-instructors to student dashboard
  useEffect(() => {
    if (user && user.role !== 'instructor') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchInstructorData = async () => {
      try {
        setLoading(true);
        const [coursesResponse, sessionsResponse, assessmentsResponse, materialsResponse] = await Promise.all([
          instructorService.getMyCourses(),
          instructorService.getUpcomingSessions(),
          instructorService.getRecentAssessments(),
          instructorService.getRecentMaterials()
        ]);
        
        setCourses(coursesResponse.data.courses);
        setSessions(sessionsResponse.data.sessions);
        setAssessments(assessmentsResponse.data.assessments);
        setMaterials(materialsResponse.data.materials);
      } catch (error) {
        console.error('Error fetching instructor data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInstructorData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };



  const getSessionStatusBadge = (status: Session['status']) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'live':
        return <Badge variant="default" className="bg-green-100 text-green-800">Live</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-600">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getAssessmentTypeIcon = (type: Assessment['type']) => {
    switch (type) {
      case 'quiz':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'assignment':
        return <FileText className="h-4 w-4 text-purple-600" />;
      case 'exam':
        return <FileText className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMaterialTypeIcon = (type: Material['type']) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-600" />;
      case 'video':
        return <Video className="h-4 w-4 text-blue-600" />;
      case 'document':
        return <FileText className="h-4 w-4 text-green-600" />;
      case 'link':
        return <ArrowRight className="h-4 w-4 text-purple-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getInstructorCourseIcon = (title: string) => {
    // Generate a consistent icon based on course title
    const hash = title.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const iconIndex = Math.abs(hash) % 6;
    
    const icons = [
      // Diamond shapes (instructor style)
      <svg key="diamonds" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L15 8L21 12L15 16L12 22L9 16L3 12L9 8L12 2Z"/>
        <path d="M12 6L13 9L16 10L13 11L12 14L11 11L8 10L11 9L12 6Z"/>
      </svg>,
      // Star pattern (instructor style)
      <svg key="stars" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L14.5 8.5L21 11L14.5 13.5L12 20L9.5 13.5L3 11L9.5 8.5L12 2Z"/>
        <circle cx="12" cy="12" r="3" fill="currentColor"/>
      </svg>,
      // Zigzag lines (instructor style)
      <svg key="zigzag" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 8L7 4L11 8L15 4L19 8L21 6"/>
        <path d="M3 16L7 12L11 16L15 12L19 16L21 14"/>
      </svg>,
      // Crossed squares (instructor style)
      <svg key="crossed" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="4" width="8" height="8" rx="1"/>
        <rect x="12" y="12" width="8" height="8" rx="1"/>
        <path d="M4 4L20 20M20 4L4 20" stroke="currentColor" strokeWidth="1"/>
      </svg>,
      // Spiral pattern (instructor style)
      <svg key="spiral" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12C12 8 16 8 16 12C16 16 12 16 12 12C12 8 8 8 8 12C8 16 12 16 12 12"/>
      </svg>,
      // Triangle grid (instructor style)
      <svg key="triangles" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L20 18H4L12 2Z"/>
        <path d="M12 8L16 14H8L12 8Z"/>
      </svg>
    ];
    
    return icons[iconIndex];
  };

  const getInstructorCourseColor = (title: string) => {
    // Generate a consistent color based on course title
    const hash = title.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const colorIndex = Math.abs(hash) % 6;
    
    const colors = [
      'bg-purple-500',    // Purple
      'bg-indigo-500',    // Indigo
      'bg-pink-500',      // Pink
      'bg-rose-500',      // Rose
      'bg-violet-500',    // Violet
      'bg-fuchsia-500'    // Fuchsia
    ];
    
    return colors[colorIndex];
  };

  // Calculate dashboard stats
  const totalEnrollments = courses.reduce((sum, course) => sum + course.stats.enrollments, 0);
  const totalCompletions = courses.reduce((sum, course) => sum + course.stats.completions, 0);
  const averageRating = courses.length > 0 
    ? courses.reduce((sum, course) => sum + course.stats.averageRating, 0) / courses.length 
    : 0;
  const upcomingSessions = sessions.filter(s => s.status === 'scheduled').length;

  return (
    <div className="container mx-auto">
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">
            Welcome back, {user?.name}!
          </h1>

        </div>
      </div>

      {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{courses.length}</p>
                <p className="text-sm text-muted-foreground">Total Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalEnrollments}</p>
                <p className="text-sm text-muted-foreground">Total Enrollments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Star className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{averageRating.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingSessions}</p>
                <p className="text-sm text-muted-foreground">Upcoming Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Courses */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Courses</CardTitle>
              <CardDescription>
                Your latest course activities
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/courses')}>
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.slice(0, 6).map((course) => (
                <Card key={course._id} className="hover:shadow-md transition-all duration-200 cursor-pointer border-0 shadow-sm" onClick={() => navigate(`/courses/${course._id}`)}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-lg ${getInstructorCourseColor(course.title)} flex items-center justify-center text-white flex-shrink-0`}>
                        {getInstructorCourseIcon(course.title)}
                      </div>
                      
                      {/* Course Title */}
                      <div>
                        <h4 className="font-medium text-foreground text-sm line-clamp-2 leading-tight">
                          {course.title}
                        </h4>
                      </div>
                      
                      {/* Course Stats */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Students</span>
                          <span className="font-medium text-blue-600">{course.stats.enrollments}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Rating</span>
                          <span className="font-medium text-green-600">{course.stats.averageRating.toFixed(1)}★</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Status</span>
                          <Badge variant={course.published ? "default" : "secondary"} className="text-xs">
                            {course.published ? 'Published' : 'Draft'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No courses created yet</p>
              <Button onClick={() => navigate('/courses/new')} className="mt-2">
                Create Course
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Sessions and Recent Activities */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Sessions</CardTitle>
                <CardDescription>
                  Your next scheduled sessions
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/instructor/sessions')}>
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.slice(0, 5).map((session) => (
                  <div key={session._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Video className="h-4 w-4 text-blue-600" />
                      <div>
                        <h4 className="font-medium text-foreground text-sm line-clamp-1">
                          {session.title}
                        </h4>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>{session.courseTitle}</span>
                          <span>-</span>
                          <span>{session.participants} participants</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getSessionStatusBadge(session.status)}
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No upcoming sessions</p>
                <Button onClick={() => navigate('/instructor/sessions/new')} className="mt-2">
                  Schedule Session
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Assessments</CardTitle>
                <CardDescription>
                  Latest quiz and assignment submissions
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/instructor/assessments')}>
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : assessments.length > 0 ? (
              <div className="space-y-3">
                {assessments.slice(0, 5).map((assessment) => (
                  <div key={assessment._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getAssessmentTypeIcon(assessment.type)}
                      <div>
                        <h4 className="font-medium text-foreground text-sm line-clamp-1">
                          {assessment.title}
                        </h4>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>{assessment.courseTitle}</span>
                          <span>-</span>
                          <span>{assessment.submissions} submissions</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {assessment.type}
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No recent assessments</p>
                <Button onClick={() => navigate('/instructor/assessments/new')} className="mt-2">
                  Create Assessment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Course Materials */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Course Materials</CardTitle>
              <CardDescription>
                Recently uploaded content
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/instructor/materials')}>
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : materials.length > 0 ? (
            <div className="space-y-3">
              {materials.slice(0, 3).map((material) => (
                <div key={material._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getMaterialTypeIcon(material.type)}
                    <div>
                      <h4 className="font-medium text-foreground text-sm line-clamp-1">
                        {material.title}
                      </h4>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <span>{material.downloads} downloads</span>
                        <span>-</span>
                        <span>{material.uploadDate}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {material.type}
                    </Badge>
                    <Button size="sm" variant="outline">
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No materials uploaded</p>
              <Button onClick={() => navigate('/instructor/materials/new')} className="mt-2">
                Upload Material
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Overview */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Analytics Overview</CardTitle>
          <CardDescription>
            Key metrics for your courses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">{totalEnrollments}</div>
              <p className="text-sm text-muted-foreground">Total Enrollments</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{totalCompletions}</div>
              <p className="text-sm text-muted-foreground">Course Completions</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{averageRating.toFixed(1)}</div>
              <p className="text-sm text-muted-foreground">Average Rating</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">{upcomingSessions}</div>
              <p className="text-sm text-muted-foreground">Upcoming Sessions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstructorDashboard;
