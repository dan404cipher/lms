import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import adminService, { User, Course, SystemStats } from "@/services/adminService";
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  BarChart3, 
  Settings, 
  Activity,
  UserPlus,
  FileText,
  Calendar,
  TrendingUp,
  Shield,
  Database,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  Download,
  RefreshCw,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  Server,
  Globe,
  Cpu,
  HardDrive,
  Network,
  Bell,
  Search,
  Filter
} from "lucide-react";

interface AnalyticsData {
  userGrowth: { date: string; users: number }[];
  courseEnrollments: { course: string; enrollments: number }[];
  revenueData: { month: string; revenue: number }[];
  systemPerformance: { metric: string; value: number; status: 'good' | 'warning' | 'error' }[];
}

interface RecentActivity {
  id: string;
  type: 'user_registration' | 'course_created' | 'enrollment' | 'system_event';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
  severity: 'info' | 'warning' | 'error' | 'success';
}

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    activeSessions: 0,
    totalStorage: 0,
    systemHealth: 'healthy',
    monthlyGrowth: { users: 0, courses: 0, enrollments: 0 }
  });
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    userGrowth: [],
    courseEnrollments: [],
    revenueData: [],
    systemPerformance: []
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Redirect non-admin users
  useEffect(() => {
    if (user && !['admin', 'super_admin'].includes(user.role)) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        
        // Fetch all data in parallel
        const [
          usersResponse, 
          coursesResponse, 
          statsResponse, 
          analyticsResponse,
          healthResponse
        ] = await Promise.all([
          adminService.getAllUsers(),
          adminService.getAllCourses(),
          adminService.getSystemStats(),
          adminService.getAnalytics(timeframe),
          adminService.getSystemHealth()
        ]);
        
        if (usersResponse.success) {
          setUsers(usersResponse.data.users || []);
        }
        
        if (coursesResponse.success) {
          setCourses(coursesResponse.data?.courses || []);
        }
        
        if (statsResponse.success) {
          setStats(statsResponse.data);
        }

        if (analyticsResponse.success) {
          setAnalytics(analyticsResponse.data);
        }

        if (healthResponse.success) {
          setSystemHealth(healthResponse.data);
        }

        // Generate mock recent activity for demo
        setRecentActivity([
          {
            id: '1',
            type: 'user_registration',
            title: 'New User Registration',
            description: 'John Doe registered as a new learner',
            timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            user: 'John Doe',
            severity: 'info'
          },
          {
            id: '2',
            type: 'course_created',
            title: 'Course Published',
            description: 'Advanced React Development course was published',
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            user: 'Sarah Wilson',
            severity: 'success'
          },
          {
            id: '3',
            type: 'enrollment',
            title: 'Bulk Enrollment',
            description: '25 students enrolled in Python Basics course',
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            severity: 'info'
          },
          {
            id: '4',
            type: 'system_event',
            title: 'System Backup',
            description: 'Daily system backup completed successfully',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            severity: 'success'
          }
        ]);

      } catch (error) {
        console.error('Error fetching admin data:', error);
        // Set fallback data
        setUsers([]);
        setCourses([]);
        setStats({
          totalUsers: 0,
          totalCourses: 0,
          totalEnrollments: 0,
          activeSessions: 0,
          totalStorage: 0,
          systemHealth: 'healthy',
          monthlyGrowth: { users: 0, courses: 0, enrollments: 0 }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [timeframe]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Admin</Badge>;
      case 'super_admin':
        return <Badge variant="destructive" className="bg-purple-100 text-purple-800">Super Admin</Badge>;
      case 'instructor':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Instructor</Badge>;
      case 'learner':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Learner</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Inactive</Badge>;
      case 'suspended':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration':
        return <UserPlus className="h-4 w-4" />;
      case 'course_created':
        return <BookOpen className="h-4 w-4" />;
      case 'enrollment':
        return <GraduationCap className="h-4 w-4" />;
      case 'system_event':
        return <Server className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getCourseIcon = (title: string) => {
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
      // Triangle pattern (like Data Science)
      <svg key="triangles" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L20 18H4L12 2Z"/>
        <path d="M12 6L16 14H8L12 6Z"/>
      </svg>,
      // Dots pattern (like Web Development)
      <svg key="dots" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="6" cy="6" r="2"/>
        <circle cx="12" cy="6" r="2"/>
        <circle cx="18" cy="6" r="2"/>
        <circle cx="6" cy="12" r="2"/>
        <circle cx="12" cy="12" r="2"/>
        <circle cx="18" cy="12" r="2"/>
        <circle cx="6" cy="18" r="2"/>
        <circle cx="12" cy="18" r="2"/>
        <circle cx="18" cy="18" r="2"/>
      </svg>
    ];
    
    return icons[iconIndex];
  };

  const getCourseColor = (title: string) => {
    // Generate a consistent color based on course title
    const hash = title.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const colorIndex = Math.abs(hash) % 6;
    
    // Admin color scheme
    const adminColors = [
      'bg-red-500',       // Red
      'bg-amber-500',     // Amber
      'bg-lime-500',      // Lime
      'bg-sky-500',       // Sky
      'bg-blue-600',      // Dark Blue
      'bg-green-600'      // Dark Green
    ];
    
    return adminColors[colorIndex];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">System administration and analytics</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/users')}>
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
              <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Logout
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to logout? You will need to sign in again to access the admin dashboard.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout}>
                      Logout
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.totalUsers)}</p>
                  <div className="flex items-center mt-2">
                    <ArrowUpRight className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600">+{stats.monthlyGrowth.users}% this month</span>
                  </div>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Courses</p>
                  <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.totalCourses)}</p>
                  <div className="flex items-center mt-2">
                    <ArrowUpRight className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600">+{stats.monthlyGrowth.courses}% this month</span>
                  </div>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Enrollments</p>
                  <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.totalEnrollments)}</p>
                  <div className="flex items-center mt-2">
                    <ArrowUpRight className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600">+{stats.monthlyGrowth.enrollments}% this month</span>
                  </div>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.activeSessions}</p>
                  <div className="flex items-center mt-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">Live now</span>
                  </div>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Activity className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>



        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="courses">Courses</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-blue-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">New Users Today</p>
                      <p className="text-2xl font-bold text-blue-900">+{Math.floor(Math.random() * 20) + 5}</p>
                    </div>
                    <div className="h-10 w-10 bg-blue-200 rounded-lg flex items-center justify-center">
                      <UserPlus className="h-5 w-5 text-blue-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-gradient-to-r from-green-50 to-green-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Courses Published</p>
                      <p className="text-2xl font-bold text-green-900">+{Math.floor(Math.random() * 5) + 2}</p>
                    </div>
                    <div className="h-10 w-10 bg-green-200 rounded-lg flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-green-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-gradient-to-r from-purple-50 to-purple-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Active Sessions</p>
                      <p className="text-2xl font-bold text-purple-900">{stats.activeSessions}</p>
                    </div>
                    <div className="h-10 w-10 bg-purple-200 rounded-lg flex items-center justify-center">
                      <Activity className="h-5 w-5 text-purple-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-gradient-to-r from-orange-50 to-orange-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-700">System Health</p>
                      <p className="text-2xl font-bold text-orange-900">98%</p>
                    </div>
                    <div className="h-10 w-10 bg-orange-200 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-orange-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recent Activity
                      </CardTitle>
                      <CardDescription>Latest system events and user actions</CardDescription>
                    </div>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className={`p-2 rounded-full ${getSeverityColor(activity.severity)}`}>
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          <p className="text-xs text-gray-600">{activity.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Performing Courses */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Top Courses
                      </CardTitle>
                      <CardDescription>Most popular courses by enrollment</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate('/courses')}>
                      <Eye className="h-4 w-4 mr-2" />
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {courses.slice(0, 5).map((course, index) => (
                      <div key={course._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 truncate">{course.title}</p>
                            <p className="text-xs text-gray-600">
                              {typeof course.instructorId === 'object' && course.instructorId?.name 
                                ? course.instructorId.name 
                                : 'Unknown Instructor'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {course.stats?.enrollments || 0} enrollments
                          </p>
                          <p className="text-xs text-gray-600">
                            {course.stats?.averageRating ? `${course.stats.averageRating.toFixed(1)}★` : 'No rating'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Platform Statistics */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Platform Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Storage Used</span>
                      <span className="text-sm font-medium">{formatBytes(stats.totalStorage * 1024 * 1024 * 1024)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg. Session Duration</span>
                      <span className="text-sm font-medium">45 min</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Bounce Rate</span>
                      <span className="text-sm font-medium text-green-600">12%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Conversion Rate</span>
                      <span className="text-sm font-medium text-green-600">8.5%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Users */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Recent Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {users.slice(0, 4).map((user) => (
                      <div key={user._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="" />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                          <p className="text-xs text-gray-600">{user.email}</p>
                        </div>
                        {getRoleBadge(user.role)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/admin/users')}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Manage Users
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Review Courses
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Reports
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Database className="h-4 w-4 mr-2" />
                      System Backup
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Analytics Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg. Course Rating</p>
                      <p className="text-2xl font-bold text-gray-900">4.2★</p>
                      <p className="text-xs text-green-600">+0.3 from last month</p>
                    </div>
                    <div className="h-10 w-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                      <p className="text-2xl font-bold text-gray-900">78%</p>
                      <p className="text-xs text-green-600">+5% from last month</p>
                    </div>
                    <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Target className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Instructors</p>
                      <p className="text-2xl font-bold text-gray-900">24</p>
                      <p className="text-xs text-blue-600">+2 this month</p>
                    </div>
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Revenue (Credits)</p>
                      <p className="text-2xl font-bold text-gray-900">12.5K</p>
                      <p className="text-xs text-green-600">+15% from last month</p>
                    </div>
                    <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Growth Chart */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>User Growth</CardTitle>
                      <CardDescription>User registration trends over time</CardDescription>
                    </div>
                    <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="year">This Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Interactive chart would be implemented here</p>
                      <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
                        <div className="bg-blue-100 p-2 rounded">
                          <p className="font-medium">New Users</p>
                          <p className="text-blue-600">+{stats.monthlyGrowth.users}%</p>
                        </div>
                        <div className="bg-green-100 p-2 rounded">
                          <p className="font-medium">Active Users</p>
                          <p className="text-green-600">85%</p>
                        </div>
                        <div className="bg-purple-100 p-2 rounded">
                          <p className="font-medium">Retention</p>
                          <p className="text-purple-600">92%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Course Performance */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Course Performance</CardTitle>
                  <CardDescription>Enrollment and completion rates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {courses.slice(0, 5).map((course) => (
                      <div key={course._id} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium truncate">{course.title}</span>
                          <span className="text-gray-600 ml-2">
                            {course.stats?.enrollments || 0} enrollments
                          </span>
                        </div>
                        <Progress 
                          value={course.stats?.averageProgress || 0} 
                          className="h-2"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Completion Rate</span>
                          <span>{course.stats?.averageProgress || 0}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Categories */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Top Categories</CardTitle>
                  <CardDescription>Most popular course categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['Programming', 'Data Science', 'Design', 'Business', 'Marketing'].map((category, index) => (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                          </div>
                          <span className="text-sm font-medium">{category}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{Math.floor(Math.random() * 50) + 20} courses</p>
                          <p className="text-xs text-gray-500">{Math.floor(Math.random() * 1000) + 500} enrollments</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* User Demographics */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>User Demographics</CardTitle>
                  <CardDescription>User distribution by role</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm">Learners</span>
                      </div>
                      <span className="text-sm font-medium">65%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Instructors</span>
                      </div>
                      <span className="text-sm font-medium">25%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="text-sm">Admins</span>
                      </div>
                      <span className="text-sm font-medium">10%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Metrics */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>System Metrics</CardTitle>
                  <CardDescription>Platform performance indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Uptime</span>
                      <span className="text-sm font-medium text-green-600">99.9%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Response Time</span>
                      <span className="text-sm font-medium">120ms</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Storage Used</span>
                      <span className="text-sm font-medium">{formatBytes(stats.totalStorage * 1024 * 1024 * 1024)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Active Sessions</span>
                      <span className="text-sm font-medium">{stats.activeSessions}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            {/* User Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalUsers)}</p>
                      <p className="text-xs text-green-600">+{stats.monthlyGrowth.users}% this month</p>
                    </div>
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Users</p>
                      <p className="text-2xl font-bold text-gray-900">{Math.floor(stats.totalUsers * 0.85)}</p>
                      <p className="text-xs text-green-600">85% of total</p>
                    </div>
                    <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">New This Week</p>
                      <p className="text-2xl font-bold text-gray-900">+{Math.floor(Math.random() * 50) + 20}</p>
                      <p className="text-xs text-blue-600">+12% from last week</p>
                    </div>
                    <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <UserPlus className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Inactive Users</p>
                      <p className="text-2xl font-bold text-gray-900">{Math.floor(stats.totalUsers * 0.15)}</p>
                      <p className="text-xs text-yellow-600">15% of total</p>
                    </div>
                    <div className="h-10 w-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* User Management */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      User Management
                    </CardTitle>
                    <CardDescription>Overview of all system users</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </Button>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button onClick={() => navigate('/admin/users')}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Manage Users
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.slice(0, 10).map((user) => (
                    <div key={user._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src="" />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {getRoleBadge(user.role)}
                            {getStatusBadge(user.status)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-4">
                          <p className="text-sm text-gray-600">Credits: {user.credits}</p>
                          <p className="text-xs text-gray-500">
                            Joined {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* User Demographics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>User Distribution</CardTitle>
                  <CardDescription>Users by role and status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm">Learners</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{Math.floor(stats.totalUsers * 0.65)}</span>
                        <span className="text-xs text-gray-500">65%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Instructors</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{Math.floor(stats.totalUsers * 0.25)}</span>
                        <span className="text-xs text-gray-500">25%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="text-sm">Admins</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{Math.floor(stats.totalUsers * 0.10)}</span>
                        <span className="text-xs text-gray-500">10%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>User Activity</CardTitle>
                  <CardDescription>Recent user activity and engagement</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-green-50">
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900">New Registration</span>
                      </div>
                      <span className="text-xs text-green-700">2 min ago</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Course Enrollment</span>
                      </div>
                      <span className="text-xs text-blue-700">5 min ago</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-purple-50">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-900">Course Completion</span>
                      </div>
                      <span className="text-xs text-purple-700">15 min ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

                     <TabsContent value="courses" className="space-y-6">
             <Card className="border-0 shadow-sm">
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <BookOpen className="h-5 w-5" />
                   Course Management
                 </CardTitle>
                 <CardDescription>Overview of all courses and their performance</CardDescription>
               </CardHeader>
               <CardContent>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {courses.slice(0, 12).map((course) => (
                     <Card 
                       key={course._id} 
                       className="hover:shadow-md transition-all duration-200 cursor-pointer border-0 shadow-sm"
                     >
                       <CardContent className="p-4">
                         <div className="space-y-3">
                           {/* Icon */}
                           <div className={`w-10 h-10 rounded-lg ${getCourseColor(course.title)} flex items-center justify-center text-white flex-shrink-0`}>
                             {getCourseIcon(course.title)}
                           </div>
                           
                           {/* Course Title */}
                           <div>
                             <h3 className="font-medium text-foreground text-sm line-clamp-2 leading-tight">
                               {course.title}
                             </h3>
                           </div>
                           
                           {/* Course Stats */}
                           <div className="space-y-1">
                             <div className="text-xs text-muted-foreground">
                               {course.stats?.enrollments || 0} enrollments • {course.stats?.averageRating?.toFixed(1) || 'N/A'} rating
                             </div>
                             <div className="flex items-center gap-2">
                               <Badge variant={course.published ? "default" : "secondary"} className="text-xs">
                                 {course.published ? 'Published' : 'Draft'}
                               </Badge>
                               {course.categoryId && (
                                 <Badge variant="outline" className="text-xs">{course.categoryId.name}</Badge>
                               )}
                             </div>
                           </div>
                           
                           {/* Action Button */}
                           <div className="pt-2">
                             <Button 
                               variant="outline" 
                               size="sm" 
                               className="w-full"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 navigate(`/courses/${course._id}`);
                               }}
                             >
                               <Eye className="h-4 w-4 mr-2" />
                               View Course
                             </Button>
                           </div>
                         </div>
                       </CardContent>
                     </Card>
                   ))}
                 </div>
               </CardContent>
             </Card>
           </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
