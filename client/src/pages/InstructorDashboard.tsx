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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect non-instructors and non-admins to student dashboard
  useEffect(() => {
    if (user && user.role && !['instructor', 'admin', 'super_admin'].includes(user.role)) {
      navigate('/dashboard');
    }
  }, [user?.role, navigate]);

  useEffect(() => {
    const fetchInstructorData = async () => {
      try {
        setLoading(true);
        const [sessionsResponse, assessmentsResponse, materialsResponse] = await Promise.all([
          instructorService.getUpcomingSessions(),
          instructorService.getRecentAssessments(),
          instructorService.getRecentMaterials()
        ]);
        
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

  // Calculate dashboard stats
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
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

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assessments.length}</p>
                <p className="text-sm text-muted-foreground">Active Assessments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Upload className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{materials.length}</p>
                <p className="text-sm text-muted-foreground">Course Materials</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>



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


    </div>
  );
};

export default InstructorDashboard;
