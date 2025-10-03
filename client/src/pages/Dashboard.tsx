import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Monitor,

} from "lucide-react";
import { useNavigate } from "react-router-dom";
import courseService from "@/services/courseService";
import activityService from "@/services/activityService";

interface Course {
  _id: string;
  title: string;
  instructor: { name: string };
  category: { name: string };
  courseCode?: string;
  progress: number;
  icon: string;
  iconColor: string;
}

interface Activity {
  _id: string;
  type: 'live-class' | 'quiz' | 'assignment' | 'discussion' | 'residency';
  title: string;
  subtitle: string;
  instructor: string;
  date: string;
  time?: string;
  duration?: string;
  status: 'ongoing' | 'upcoming' | 'completed' | 'missed';
  courseCode?: string;
  hasRecording?: boolean;
}

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect instructors and admins to their dashboard
  useEffect(() => {
    if (user && user.role) {
      if (user.role === 'instructor') {
        navigate('/instructor/dashboard');
      } else if (user.role === 'admin' || user.role === 'super_admin') {
        navigate('/admin/dashboard');
      }
    }
  }, [user?.role, navigate]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [coursesResponse, activitiesResponse] = await Promise.all([
          courseService.getMyCourses(),
          activityService.getMyActivities()
        ]);
        
        setCourses(coursesResponse.data.courses);
        setActivities(activitiesResponse.data.activities);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };



  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'live-class':
        return <Video className="h-4 w-4 text-green-600" />;
      case 'quiz':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'assignment':
        return <FileText className="h-4 w-4 text-purple-600" />;
      case 'discussion':
        return <Bell className="h-4 w-4 text-orange-600" />;
      case 'residency':
        return <User className="h-4 w-4 text-red-600" />;
      default:
        return <BookOpen className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: Activity['status']) => {
    switch (status) {
      case 'ongoing':
        return <Badge variant="default" className="bg-green-100 text-green-800">Ongoing</Badge>;
      case 'upcoming':
        return <Badge variant="secondary">Upcoming</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-600">Completed</Badge>;
      case 'missed':
        return <Badge variant="destructive">Missed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const upcomingActivities = activities.filter(a => a.status === 'upcoming').slice(0, 3);
  const recentActivities = activities.filter(a => a.status === 'completed').slice(0, 3);
  const totalProgress = courses.length > 0 ? courses.reduce((sum, course) => sum + course.progress, 0) / courses.length : 0;

  return (
    <div className="container mx-auto">
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">
            Welcome back, {user?.name}!
          </h1>

        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-4 space-y-6">
          {/* Continue Learning */}
          <Card>
            <CardHeader>
              <CardTitle>Continue Learning</CardTitle>
              <CardDescription>
                Pick up where you left off
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : courses.length > 0 ? (
                <div className="space-y-3">
                  {courses.slice(0, 3).map((course) => (
                    <div key={course._id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/courses/${course._id}`)}>
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-lg ${course.iconColor || 'bg-primary'} flex items-center justify-center text-white text-lg`}>
                          {course.icon || '📚'}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground text-sm line-clamp-1">
                          {course.title}
                        </h4>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          <span>Progress: {course.progress}%</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                        Resume
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No courses to continue</p>
                  <p className="text-sm text-muted-foreground">
                    Start exploring courses to see them here
                  </p>
                  <Button onClick={() => navigate('/courses')} className="mt-2">
                    Browse Courses
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Learning Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Learning Activities</CardTitle>
              <CardDescription>
                Your active and completed activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : upcomingActivities.length > 0 || recentActivities.length > 0 ? (
                <div className="space-y-3">
                  {upcomingActivities.map((activity) => (
                    <div key={activity._id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="flex-shrink-0">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground text-sm line-clamp-1">
                          {activity.title}
                        </h4>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{activity.date}</span>
                          {activity.time && (
                            <>
                              <Clock className="h-3 w-3" />
                              <span>{activity.time}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(activity.status)}
                    </div>
                  ))}
                  {recentActivities.map((activity) => (
                    <div key={activity._id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="flex-shrink-0">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground text-sm line-clamp-1">
                          {activity.title}
                        </h4>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{activity.date}</span>
                          {activity.time && (
                            <>
                              <Clock className="h-3 w-3" />
                              <span>{activity.time}</span>
                            </>
                          )}
                          <span>- {activity.instructor}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(activity.status)}
                        {activity.hasRecording && (
                          <Button size="sm" variant="outline">
                            <Play className="h-3 w-3 mr-1" />
                            Watch
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No activities available</p>
                  <p className="text-sm text-muted-foreground">
                    Check back later for new activities
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Fixed Sidebar */}
        <div className="lg:col-span-2">
          <div className="sticky top-20 space-y-4">
            {/* Courses Overview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-sm">
                  <Monitor className="h-4 w-4 mr-2" />
                  Courses
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">COMPLETE</span>
                    <span className="font-medium">0</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">INCOMPLETE</span>
                    <span className="font-medium">0</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">AT RISK</span>
                    <span className="font-medium">0</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Attendance
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">66.67%</div>
                    <div className="text-xs text-muted-foreground">Overall Attendance</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Present</span>
                      <span className="font-medium text-green-600">12 sessions</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Absent</span>
                      <span className="font-medium text-red-600">6 sessions</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-medium">18 sessions</span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-green-600 h-1.5 rounded-full" style={{ width: '66.67%' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gradebook */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Gradebook
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">3.8</div>
                    <div className="text-xs text-muted-foreground">Current GPA</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">A Grades</span>
                      <span className="font-medium text-green-600">4 courses</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">B Grades</span>
                      <span className="font-medium text-blue-600">2 courses</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">In Progress</span>
                      <span className="font-medium text-orange-600">1 course</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full justify-between p-0 h-auto">
                    <span className="text-xs text-muted-foreground">View Full Gradebook</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
