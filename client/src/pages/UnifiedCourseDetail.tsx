import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, 
  User, 
  Calendar,
  Clock,
  Play,
  FileText,
  Video,
  CheckCircle,
  ArrowRight,
  Bell,
  BarChart3,
  Plus,
  Edit,
  ChevronDown,
  ChevronRight,
  Target,
  Download,
  Eye,

} from "lucide-react";
import courseService from "@/services/courseService";
import instructorService from "@/services/instructorService";

interface CourseResource {
  _id: string;
  title: string;
  type: 'pdf' | 'video' | 'document';
  size?: string;
  viewed: boolean;
  url?: string;
}

interface CourseVideo {
  _id: string;
  title: string;
  duration: number;
  completed: boolean;
  url?: string;
}

interface CourseAssessment {
  _id: string;
  title: string;
  type: 'quiz' | 'assignment' | 'exam';
  dueDate: string;
  completed: boolean;
  score?: number;
  totalPoints: number;
}

interface CourseRecording {
  _id: string;
  title: string;
  date: string;
  duration: number;
  viewed: boolean;
  url?: string;
}

interface CourseGroup {
  _id: string;
  name: string;
  members: number;
  maxMembers: number;
  joined: boolean;
}

interface CourseNote {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface Module {
  _id: string;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
}

interface Lesson {
  _id: string;
  title: string;
  description: string;
  contentType: 'video' | 'pdf' | 'scorm';
  duration: number;
  order: number;
  isPublished: boolean;
}

interface Assessment {
  _id: string;
  title: string;
  description: string;
  type: 'quiz' | 'assignment' | 'exam';
  dueDate: string;
  totalPoints: number;
  isPublished: boolean;
}

interface Session {
  _id: string;
  title: string;
  description: string;
  type: 'live-class' | 'office-hours' | 'review';
  scheduledAt: string;
  duration: number;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
}

interface Material {
  _id: string;
  title: string;
  description: string;
  type: 'pdf' | 'video' | 'document' | 'link';
  fileUrl: string;
  isPublished: boolean;
  uploadDate: string;
}

interface Announcement {
  _id: string;
  title: string;
  content: string;
  isPublished: boolean;
  createdAt: string;
}

interface CourseDetail {
  _id: string;
  title: string;
  description: string;
  instructor: {
    name: string;
    email?: string;
  };
  category: {
    name: string;
  };
  courseCode?: string;
  progress?: {
    videosCompleted: number;
    totalVideos: number;
    resourcesViewed: number;
    totalResources: number;
    percentage: number;
  };
  stats?: {
    enrollments: number;
    completions: number;
    averageRating: number;
    totalRatings: number;
    averageProgress: number;
  };
  lastAccessed?: {
    type: 'video' | 'resource';
    title: string;
    id: string;
  };
  syllabus?: CourseResource[] | string;
  prerequisites?: (CourseVideo | CourseResource)[] | string;
  assessments?: CourseAssessment[];
  instructorAssessments?: Assessment[];
  recordings?: CourseRecording[];
  groups?: CourseGroup[];
  notes?: CourseNote[];
  modules?: Module[];
  sessions?: Session[];
  materials?: Material[];
  announcements?: Announcement[];
  published?: boolean;
  createdAt?: string;
}

const UnifiedCourseDetail = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState<string | null>(null);

  const isInstructor = user?.role === 'instructor';



  useEffect(() => {
    const fetchCourseDetail = async () => {
      if (!courseId) return;
      
      try {
        setLoading(true);
        const response = isInstructor 
          ? await instructorService.getCourseDetail(courseId)
          : await courseService.getCourseDetail(courseId);
        
        setCourse(response.data.course);
      } catch (error) {
        console.error('Error fetching course detail:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseDetail();
  }, [courseId, isInstructor]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleResume = () => {
    if (course?.lastAccessed) {
      // Navigate to the last accessed content
      console.log('Resuming from:', course.lastAccessed);
    }
  };

  const handleViewResource = (resource: CourseResource) => {
    console.log('Viewing resource:', resource);
  };

  const handleDownloadResource = (resource: CourseResource) => {
    console.log('Downloading resource:', resource);
  };

  const handleViewVideo = (video: CourseVideo) => {
    console.log('Viewing video:', video);
  };

  const handleViewRecording = (recording: CourseRecording) => {
    console.log('Viewing recording:', recording);
  };



  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Course Not Found</h2>
          <p className="text-muted-foreground mb-4">The course you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate('/courses')}>Back to Courses</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground mb-2">{course.title}</h1>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <User className="h-4 w-4" />
                <span>{course.instructor.name}</span>
              </div>
              <div className="flex items-center space-x-1">
                <BookOpen className="h-4 w-4" />
                <span>{course.category.name}</span>
              </div>
              {course.courseCode && (
                <div className="flex items-center space-x-1">
                  <span>Code: {course.courseCode}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">

            {isInstructor && (
              <Button onClick={() => setShowAddForm('module')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Module
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar for Students */}
        {!isInstructor && course.progress && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Course Progress</span>
              <span className="text-sm text-muted-foreground">{course.progress.percentage}%</span>
            </div>
            <Progress value={course.progress.percentage} className="h-2" />
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>{course.progress.videosCompleted}/{course.progress.totalVideos} videos completed</span>
              <span>{course.progress.resourcesViewed}/{course.progress.totalResources} resources viewed</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          {isInstructor && <TabsTrigger value="sessions">Sessions</TabsTrigger>}
          {isInstructor && <TabsTrigger value="announcements">Announcements</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Course Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Course Statistics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {course.stats && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Enrollments</span>
                        <span className="font-medium">{course.stats.enrollments}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Completions</span>
                        <span className="font-medium">{course.stats.completions}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Average Rating</span>
                        <span className="font-medium">{course.stats.averageRating.toFixed(1)}★</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Ratings</span>
                        <span className="font-medium">{course.stats.totalRatings}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Syllabus */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Syllabus</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Array.isArray(course.syllabus) && course.syllabus.length > 0 ? (
                  <div className="space-y-2">
                    {course.syllabus.map((resource) => (
                      <div key={resource._id} className="flex items-center justify-between p-2 border rounded hover:bg-muted/30 transition-colors">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">{resource.title}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {resource.viewed && <CheckCircle className="h-4 w-4 text-green-600" />}
                          <Button size="sm" variant="ghost" onClick={() => handleViewResource(resource)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDownloadResource(resource)}>
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No syllabus available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Prerequisites */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Prerequisites</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Array.isArray(course.prerequisites) && course.prerequisites.length > 0 ? (
                  <div className="space-y-2">
                    {course.prerequisites.map((prereq) => (
                      <div key={prereq._id} className="flex items-center justify-between p-2 border rounded hover:bg-muted/30 transition-colors">
                        <div className="flex items-center space-x-2">
                          {prereq.type === 'video' ? <Video className="h-4 w-4 text-blue-600" /> : <FileText className="h-4 w-4 text-green-600" />}
                          <span className="text-sm">{prereq.title}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {prereq.type === 'video' && (prereq as CourseVideo).completed && <CheckCircle className="h-4 w-4 text-green-600" />}
                          {prereq.type === 'video' && <Button size="sm" variant="ghost" onClick={() => handleViewVideo(prereq as CourseVideo)}>
                            <Play className="h-3 w-3" />
                          </Button>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No prerequisites</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Course Modules</span>
                {isInstructor && (
                  <Button size="sm" onClick={() => setShowAddForm('module')} className="ml-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Module
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {course.modules && course.modules.length > 0 ? (
                <div className="space-y-3">
                  {course.modules.map((module) => (
                    <div key={module._id} className="border rounded-lg p-3 hover:bg-muted/30 transition-colors">
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => toggleModule(module._id)}
                      >
                        <div className="flex items-center space-x-2">
                          <BookOpen className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{module.title}</span>
                          <Badge variant="secondary" className="text-xs">
                            {module.lessons.length} lessons
                          </Badge>
                        </div>
                        {expandedModules.includes(module._id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                      
                      {expandedModules.includes(module._id) && (
                        <div className="mt-3 space-y-2">
                          <p className="text-sm text-muted-foreground">{module.description}</p>
                          {module.lessons.map((lesson) => (
                            <div key={lesson._id} className="flex items-center justify-between p-2 border rounded bg-background">
                              <div className="flex items-center space-x-2">
                                {lesson.contentType === 'video' ? <Video className="h-4 w-4 text-blue-600" /> : <FileText className="h-4 w-4 text-green-600" />}
                                <span className="text-sm">{lesson.title}</span>
                                <Badge variant="outline" className="text-xs">
                                  {lesson.duration} min
                                </Badge>
                              </div>
                              {isInstructor && (
                                <div className="flex items-center space-x-2">
                                  <Badge variant={lesson.isPublished ? "default" : "secondary"}>
                                    {lesson.isPublished ? 'Published' : 'Draft'}
                                  </Badge>
                                  <Button variant="ghost" size="sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No modules available yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assessments Tab */}
        <TabsContent value="assessments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Assessments</span>
                {isInstructor && (
                  <Button size="sm" onClick={() => setShowAddForm('assessment')} className="ml-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Assessment
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {course.assessments && course.assessments.length > 0 ? (
                <div className="space-y-3">
                  {course.assessments.map((assessment) => (
                    <div key={assessment._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-4 w-4 text-purple-600" />
                        <div>
                          <h4 className="font-medium">{assessment.title}</h4>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">{assessment.type}</Badge>
                            <span>Due: {assessment.dueDate}</span>
                            {assessment.score && (
                              <span>Score: {assessment.score}/{assessment.totalPoints}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {assessment.completed && <CheckCircle className="h-4 w-4 text-green-600" />}
                        <Button size="sm" variant="outline">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No assessments available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="h-5 w-5" />
                <span>Course Materials</span>
                {isInstructor && (
                  <Button size="sm" onClick={() => setShowAddForm('material')} className="ml-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Material
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {course.materials && course.materials.length > 0 ? (
                <div className="space-y-3">
                  {course.materials.map((material) => (
                    <div key={material._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <div>
                          <h4 className="font-medium">{material.title}</h4>
                          <p className="text-sm text-muted-foreground">{material.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">{material.type}</Badge>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Download className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No materials available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab - Instructor Only */}
        {isInstructor && (
          <TabsContent value="sessions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Video className="h-5 w-5" />
                  <span>Live Sessions</span>
                  <Button size="sm" onClick={() => setShowAddForm('session')} className="ml-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Session
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {course.sessions && course.sessions.length > 0 ? (
                  <div className="space-y-3">
                    {course.sessions.map((session) => (
                      <div key={session._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-center space-x-3">
                          <Video className="h-4 w-4 text-green-600" />
                          <div>
                            <h4 className="font-medium">{session.title}</h4>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <Badge variant="outline" className="text-xs">{session.type}</Badge>
                              <span>{session.scheduledAt}</span>
                              <span>{session.duration} min</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={session.status === 'live' ? "default" : "secondary"}>
                            {session.status}
                          </Badge>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Video className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No sessions scheduled</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Announcements Tab - Instructor Only */}
        {isInstructor && (
          <TabsContent value="announcements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Announcements</span>
                  <Button size="sm" onClick={() => setShowAddForm('announcement')} className="ml-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    New Announcement
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {course.announcements && course.announcements.length > 0 ? (
                  <div className="space-y-3">
                    {course.announcements.map((announcement) => (
                      <div key={announcement._id} className="p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{announcement.title}</p>
                          <Badge variant={announcement.isPublished ? "default" : "secondary"}>
                            {announcement.isPublished ? 'Published' : 'Draft'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{announcement.content}</p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(announcement.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No announcements yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default UnifiedCourseDetail;
