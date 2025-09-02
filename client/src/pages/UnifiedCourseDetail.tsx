import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  BarChart3,
  Plus,
  Edit,
  ChevronDown,
  ChevronRight,
  Target,
  Download,
  Eye,
  X,
  Upload,
  Search,
  Users,
  ChevronLeft,
  Trash,
} from "lucide-react";
import courseService from "@/services/courseService";
import instructorService from "@/services/instructorService";
import adminService, { Course } from "@/services/adminService";
import ScheduleSessionModal from "@/components/ScheduleSessionModal";
import SessionsAndRecordings from "@/components/SessionsAndRecordings";

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
  type: 'video';
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
  order: number;
  isPublished: boolean;
  files?: Array<{
    _id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
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
  instructorId?: string;
  category: {
    name: string;
  };
  categoryId?: string;
  courseCode?: string;
  difficulty?: string;
  duration?: number;
  priceCredits?: number;
  shortDescription?: string;
  language?: string;
  tags?: string[];
  requirements?: string[];
  learningOutcomes?: string[];
  updatedAt?: string;
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
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Debug logging
  console.log('UnifiedCourseDetail - courseId:', courseId, 'user:', user?.role);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  console.log('course', course);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem(`courseTab_${courseId}`);
    return savedTab || "overview";
  });
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    order: 1,
    type: 'quiz',
    dueDate: '',
    totalPoints: 100,
    duration: 60,
    scheduledAt: '',
    content: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // Course settings state
  const [courseSettings, setCourseSettings] = useState({
    courseCode: '',
    difficulty: 'beginner',
    duration: 0,
    priceCredits: 0,
    title: '',
    description: '',
    shortDescription: '',
    language: 'en',
    tags: [] as string[],
    requirements: [] as string[],
    learningOutcomes: [] as string[],
    instructorId: ''
  });
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [savingCourse, setSavingCourse] = useState(false);
  const [instructors, setInstructors] = useState<any[]>([]);

  // Batch management state
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  const isInstructor = user?.role === 'instructor';
  const isAdmin = user?.role === 'admin';

  // Helper function to get instructor name safely
  const getInstructorName = () => {
    if (course?.instructor?.name) {
      return course.instructor.name;
    }
    return 'Unknown Instructor';
  };

  // Helper function to get category name safely
  const getCategoryName = () => {
    if (course?.category?.name) {
      return course.category.name;
    }
    return 'Uncategorized';
  };

  // Function to get button text and action based on active tab
  const getAddButtonConfig = () => {
    switch (activeTab) {
      case 'content':
        return { text: 'Add Module', action: 'module' };
      case 'materials':
        return { text: 'Upload Material', action: 'material' };
      case 'sessions':
        return { text: 'Schedule Session', action: 'session' };
      default:
        return { text: 'Add Module', action: 'module' };
    }
  };

  const { text: addButtonText, action: addButtonAction } = getAddButtonConfig();

  // Fetch enrolled users for batch management
  const fetchEnrolledStudents = async () => {
    if (!courseId || !isAdmin) {
      console.log('fetchEnrolledStudents: Skipping - courseId:', courseId, 'isAdmin:', isAdmin);
      return;
    }

    try {
      setBatchLoading(true);
      console.log('Fetching enrolled students for courseId:', courseId);
      const response = await adminService.getEnrolledStudents(courseId);
      setEnrolledStudents(response.data.students || []);
    } catch (error) {
      console.error('Error fetching enrolled users:', error);
      console.error('CourseId was:', courseId);
      setEnrolledStudents([]);
    } finally {
      setBatchLoading(false);
    }
  };

  // Fetch instructors for course assignment
  const fetchInstructors = async () => {
    if (!isAdmin) return;

    try {
      console.log('Fetching instructors for admin...');
      const params = new URLSearchParams();
      params.append('role', 'instructor');
      params.append('status', 'active');
      params.append('limit', '100'); // Get all active instructors

      const response = await adminService.getAllUsers(params);
      console.log('Instructors response:', response);
      console.log('Instructors data:', response.data);
      console.log('Instructors users:', response.data.users);
      console.log('Instructors count:', response.data.users?.length || 0);
      setInstructors(response.data.users || []);
    } catch (error) {
      console.error('Error fetching instructors:', error);
      setInstructors([]);
    }
  };

  // Initialize course settings when course data loads
  useEffect(() => {
    if (course) {
      setCourseSettings({
        courseCode: course.courseCode || '',
        difficulty: course.difficulty || 'beginner',
        duration: course.duration || 0,
        priceCredits: course.priceCredits || 0,
        title: course.title || '',
        description: course.description || '',
        shortDescription: course.shortDescription || '',
        language: course.language || 'en',
        tags: course.tags || [],
        requirements: course.requirements || [],
        learningOutcomes: course.learningOutcomes || [],
        instructorId: course.instructorId || ''
      });
    }
  }, [course]);

  // Fetch instructors when component loads (admin only)
  useEffect(() => {
    if (isAdmin) {
      fetchInstructors();
    }
  }, [isAdmin]);

  // Fetch all users for adding to batch
  const fetchAllUsers = async () => {
    if (!isAdmin) return;

    try {
      const response = await adminService.getAllUsers();
      setAllUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching all users:', error);
    }
  };

  // Save course settings
  const saveCourseSettings = async () => {
    if (!courseId) return;

    setSavingCourse(true);
    try {
      const service = isAdmin ? adminService : instructorService;
      await service.updateCourse(courseId, courseSettings);

      // Refresh course data
      let response;
      if (isAdmin) {
        response = await adminService.getCourseById(courseId);
      } else {
        response = await instructorService.getCourseDetail(courseId);
      }
      setCourse(response.data.course);

      // Refresh enrolled students list if admin
      if (isAdmin) {
        await fetchEnrolledStudents();
      }

      setIsEditingCourse(false);
      toast({
        title: "Success",
        description: "Course settings updated successfully.",
      });
    } catch (error: any) {
      console.error('Error saving course settings:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save course settings.",
        variant: "destructive",
      });
    } finally {
      setSavingCourse(false);
    }
  };

  // Add users to course
  const addStudentsToCourse = async (userIds: string[]) => {
    if (!courseId || userIds.length === 0) {
      console.log('addStudentsToCourse: Skipping - courseId:', courseId, 'userIds:', userIds);
      return;
    }

    // Validate courseId format (should be a MongoDB ObjectId)
    if (!courseId.match(/^[0-9a-fA-F]{24}$/)) {
      console.error('Invalid courseId format:', courseId);
      toast({
        title: "Error",
        description: "Invalid course ID format.",
        variant: "destructive",
      });
      return;
    }

    // Validate userIds format
    for (const userId of userIds) {
      if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
        console.error('Invalid userId format:', userId);
        toast({
          title: "Error",
          description: "Invalid user ID format.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setBatchLoading(true);
      console.log('Adding users to course - courseId:', courseId, 'userIds:', userIds);
      console.log('Request details - courseId type:', typeof courseId, 'userIds type:', typeof userIds);
      console.log('userIds array length:', userIds.length);
      console.log('userIds content:', JSON.stringify(userIds, null, 2));
      await adminService.addStudentsToCourse(courseId, userIds);

      toast({
        title: "Success",
        description: `${userIds.length} user(s) added to the course.`,
      });
      setSelectedUsers([]);

      // Refresh the enrolled students list
      await fetchEnrolledStudents();
    } catch (error) {
      console.error('Error adding users to course:', error);
      console.error('Error response status:', error.response?.status);
      console.error('Error response data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Error message:', error.message);
      console.error('Error response status:', error.response?.status);
      console.error('Error response headers:', error.response?.headers);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: "Failed to add users to course.",
        variant: "destructive",
      });
    } finally {
      setBatchLoading(false);
    }
  };

  // Remove student from course
  const removeStudentFromCourse = async (studentId: string) => {
    if (!courseId) return;

    try {
      setBatchLoading(true);
      await adminService.removeStudentFromCourse(courseId, studentId);

      toast({
        title: "Success",
        description: "Student removed from course.",
      });

      // Refresh the enrolled students list
      await fetchEnrolledStudents();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove student from course.",
        variant: "destructive",
      });
    } finally {
      setBatchLoading(false);
    }
  };
  const fetchCourseDetail = async () => {
    if (!courseId || authLoading) return; // Wait for auth to load

    try {
      setLoading(true);
      let response;
      if (isAdmin) {
        response = await adminService.getCourseById(courseId);
      } else if (isInstructor) {
        response = await instructorService.getCourseDetail(courseId);
      } else {
        response = await courseService.getCourseDetail(courseId);
      }

      setCourse(response.data.course);
      console.log('course session', response.data.course);
    } catch (error: any) {
      console.error('Error fetching course detail:', error);
      if (error.response?.status === 403) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this course.",
          variant: "destructive",
        });
        navigate('/courses');
      } else if (error.response?.status === 404) {
        toast({
          title: "Course Not Found",
          description: "The course you're looking for doesn't exist.",
          variant: "destructive",
        });
        navigate('/courses');
      } else {
        toast({
          title: "Error",
          description: "Failed to load course details. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseDetail();
  }, [courseId, isInstructor, isAdmin, authLoading, isScheduleModalOpen]);

  // Fetch users when batch tab is active
  useEffect(() => {
    console.log('Batch tab useEffect - activeTab:', activeTab, 'isAdmin:', isAdmin, 'courseId:', courseId);
    if (activeTab === 'batch' && isAdmin && courseId) {
      console.log('Loading batch data...');
      fetchAllUsers();
      fetchEnrolledStudents();
    }
  }, [activeTab, isAdmin, courseId]);

  // Update enrolled students when course data changes
  useEffect(() => {
    if (course && isAdmin && courseId) {
      // Fetch enrolled students when course changes
      fetchEnrolledStudents();
    }
  }, [course, isAdmin, courseId]);

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

  const handleDownloadResource = async (resource: CourseResource) => {
    if (!resource.url) {
      toast({
        title: "Download Failed",
        description: "No download URL available for this resource",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create download link
      const link = document.createElement('a');
      link.href = resource.url;
      link.download = resource.title;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Success",
        description: `${resource.title} download initiated!`
      });
    } catch (error) {
      console.error('Error downloading resource:', error);
      toast({
        title: "Download Failed",
        description: `Failed to download ${resource.title}`,
        variant: "destructive"
      });
    }
  };

  const handleDownloadMaterial = async (material: any) => {
    if (!courseId) return;

    try {
      setLoading(true);

      const service = isAdmin ? adminService : instructorService;
      const blob = await service.downloadMaterial(courseId, material._id);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = material.fileName || material.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `${material.title} downloaded successfully!`
      });
    } catch (error) {
      console.error('Error downloading material:', error);
      toast({
        title: "Download Failed",
        description: `Failed to download ${material.title}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewVideo = (video: CourseVideo) => {
    console.log('Viewing video:', video);
  };

  const handleUploadMaterial = () => {
    if (!courseId) return;

    // Create file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = '*/*'; // Accept any file type
    fileInput.style.display = 'none';

    fileInput.onchange = async (event) => {
      const target = event.target as HTMLInputElement;
      const files = target.files;

      if (!files || files.length === 0) return;

      try {
        setLoading(true);

        for (const file of Array.from(files)) {
          // Check file size (100MB limit for materials)
          if (file.size > 100 * 1024 * 1024) {
            toast({
              title: "File Too Large",
              description: `${file.name} is larger than 100MB limit`,
              variant: "destructive"
            });
            continue;
          }

          toast({
            title: "Uploading...",
            description: `Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`,
          });

          try {
            console.log('Upload attempt - User role:', user?.role);
            console.log('Upload attempt - Is admin:', isAdmin);
            console.log('Upload attempt - Is instructor:', isInstructor);
            console.log('Upload attempt - Course ID:', courseId);
            console.log('Upload attempt - File:', file.name, file.size);

            const service = isAdmin ? adminService : instructorService;
            const formData = new FormData();
            formData.append('material', file);
            const response = await service.uploadMaterial(courseId, formData);

            if (response.success) {
              toast({
                title: "Success",
                description: `${file.name} uploaded successfully!`
              });
            }
          } catch (error) {
            toast({
              title: "Upload Failed",
              description: `Failed to upload ${file.name}`,
              variant: "destructive"
            });
          }
        }

        // Refresh course data to show new materials
        let response;
        if (isAdmin) {
          response = await adminService.getCourseById(courseId);
          setCourse(response.data as CourseDetail);
        } else if (isInstructor) {
          response = await instructorService.getCourseDetail(courseId);
          setCourse(response.data.course as CourseDetail);
        } else {
          response = await courseService.getCourseDetail(courseId);
          setCourse(response.data.course as CourseDetail);
        }

      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to upload materials",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
        document.body.removeChild(fileInput);
      }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
  };

  const handleFormSubmit = async () => {
    if (!courseId || !formData.title.trim()) return;

    setIsSubmitting(true);
    try {
      // Choose the appropriate service based on user role
      const service = isAdmin ? adminService : instructorService;

      switch (showAddForm) {
        case 'module':
          await service.createModule(courseId, {
            title: formData.title,
            description: formData.description,
            order: formData.order
          });
          break;
        case 'assessment':
          await service.createAssessment(courseId, {
            title: formData.title,
            description: formData.description,
            type: formData.type,
            dueDate: formData.dueDate,
            totalPoints: formData.totalPoints
          });
          break;
        case 'session':
          // Open the schedule session modal instead of creating directly
          setIsScheduleModalOpen(true);
          return; // Don't proceed with the rest of the function
        case 'announcement':
          await service.createAnnouncement(courseId, {
            title: formData.title,
            content: formData.content
          });
          break;
        case 'material':
          if (!selectedFiles || selectedFiles.length === 0) {
            toast({
              title: "Error",
              description: "Please select a file to upload.",
              variant: "destructive",
            });
            return;
          }

          // Create FormData for file upload
          const materialFormData = new FormData();
          materialFormData.append('title', formData.title);
          materialFormData.append('description', formData.description || '');
          materialFormData.append('material', selectedFiles[0]);

          await service.uploadMaterial(courseId, materialFormData);
          break;
        case 'lesson':
          if (!selectedModuleId) {
            toast({
              title: "Error",
              description: "No module selected for lesson creation.",
              variant: "destructive",
            });
            return;
          }
          await service.createLesson(courseId, selectedModuleId, {
            title: formData.title,
            description: formData.description,
            order: formData.order
          });
          break;
        default:
          break;
      }

      // Refresh course data
      let response;
      if (isAdmin) {
        response = await adminService.getCourseById(courseId);
      } else if (isInstructor) {
        response = await instructorService.getCourseDetail(courseId);
      } else {
        response = await courseService.getCourseDetail(courseId);
      }
      setCourse(response.data.course);

      // Show success message
      toast({
        title: "Success!",
        description: `${showAddForm === 'module' ? 'Module' :
          showAddForm === 'assessment' ? 'Assessment' :
            showAddForm === 'session' ? 'Session' :
              showAddForm === 'announcement' ? 'Announcement' :
                showAddForm === 'lesson' ? 'Lesson' : 'Item'} created successfully.`,
      });

      // Reset form and close modal
      setFormData({
        title: '',
        description: '',
        order: 1,
        type: 'quiz',
        dueDate: '',
        totalPoints: 100,
        duration: 60,
        scheduledAt: '',
        content: ''
      });
      setShowAddForm(null);
      setSelectedModuleId(null);
      setSelectedFiles(null);
    } catch (error: any) {
      console.error('Error creating item:', error);
      let errorMessage = "Failed to create item. Please try again.";

      if (error.response?.status === 404) {
        errorMessage = "Module not found. The database has been refreshed. Please refresh the page.";
      } else if (error.response?.status === 401) {
        errorMessage = "Authentication error. Please try again.";
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to perform this action.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleViewRecording = (recording: CourseRecording) => {
    console.log('Viewing recording:', recording);
  };


  const handleDeleteLesson = (lessonId: string) => {
    console.log('Deleting lesson:', lessonId);
  };


  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading authentication...</p>
        </div>
      </div>
    );
  }

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
          <Button size="sm" onClick={() => navigate('/courses')}>Back to Courses</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 flex gap-5 items-center">
            <div className="flex items-center gap-5 cursor-pointer" onClick={() => navigate('/courses')}>
              <ChevronLeft />
            </div>
            <div className="flex flex-col ">
              <h1 className="text-xl font-bold text-foreground mb-2">{course.title}</h1>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>{getInstructorName()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{getCategoryName()}</span>
                </div>
                {course.courseCode && (
                  <div className="flex items-center space-x-1">
                    <span>Code: {course.courseCode}</span>
                  </div>
                )}
                {isAdmin && (
                  <div className="flex items-center space-x-1">
                    <Badge variant={course.published ? "default" : "secondary"}>
                      {course.published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">

            {(isInstructor || isAdmin) && activeTab !== 'overview' && (
              <Button size="sm" onClick={() => addButtonAction === 'session' ? setIsScheduleModalOpen(true) : setShowAddForm(addButtonAction)}>
                <Plus className="h-3 w-3 mr-1" />
                {addButtonText}
              </Button>
            )}

          </div>
        </div>

        {/* Progress Bar for Students */}
        {!isInstructor && !isAdmin && course.progress && (
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
      <Tabs value={activeTab} onValueChange={(tab) => {
        setActiveTab(tab);
        localStorage.setItem(`courseTab_${courseId}`, tab);
      }} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          {isAdmin && <TabsTrigger value="batch">Batch</TabsTrigger>}
          {isAdmin && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
                  {course.stats ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Enrollments</span>
                        <span className="font-medium">{course.stats.enrollments || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Completions</span>
                        <span className="font-medium">{course.stats.completions || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Average Rating</span>
                        <span className="font-medium">{(course.stats.averageRating || 0).toFixed(1)}★</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Ratings</span>
                        <span className="font-medium">{course.stats.totalRatings || 0}</span>
                      </div>
                      {isAdmin && course.stats.averageProgress !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Avg Progress</span>
                          <span className="font-medium">{course.stats.averageProgress}%</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">No statistics available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Syllabus */}
            {/* <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Syllabus</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {course.syllabus && Array.isArray(course.syllabus) && course.syllabus.length > 0 ? (
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
            </Card> */}

            {/* Prerequisites */}
            {/* <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Prerequisites</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {course.prerequisites && Array.isArray(course.prerequisites) && course.prerequisites.length > 0 ? (
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
            </Card> */}

            {/* Course Info for Admin */}
            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5" />
                    <span>Course Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Difficulty</span>
                      <Badge variant="outline" className="capitalize">{course.difficulty || 'Not set'}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Duration</span>
                      <span className="font-medium">{course.duration ? `${course.duration} hours` : 'Not set'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Price</span>
                      <span className="font-medium">{course.priceCredits ? `${course.priceCredits} credits` : 'Free'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Created</span>
                      <span className="font-medium">{course.createdAt ? new Date(course.createdAt).toLocaleDateString() : 'Unknown'}</span>
                    </div>
                    {course.updatedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last Updated</span>
                        <span className="font-medium">{new Date(course.updatedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Course Modules</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {course.modules && Array.isArray(course.modules) && course.modules.length > 0 ? (
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
                            <div
                              key={lesson._id}
                              className="flex items-center justify-between p-2 border rounded bg-background hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => navigate(`/courses/${courseId}/lessons/${lesson._id}`)}
                            >
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-green-600" />
                                <span className="text-sm">{lesson.title}</span>
                                {lesson.files && lesson.files.length > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {lesson.files.length} file{lesson.files.length !== 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                              {(isInstructor || isAdmin) && (
                                <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                  <Badge variant={lesson.isPublished ? "default" : "secondary"}>
                                    {lesson.isPublished ? 'Published' : 'Draft'}
                                  </Badge>
                                  {lesson.files && lesson.files.length > 0 && (
                                    <Button variant="ghost" size="sm">
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedLessonId(lesson._id);
                                      setShowFileUpload(true);
                                    }}
                                  >
                                    <Upload className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/courses/${courseId}/lessons/${lesson._id}`)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  {isAdmin &&(<div className="bg-red-400 text-white p-1 rounded-lg cursor-pointer" onClick={() => handleDeleteLesson(lesson._id)}>
                                    <Trash className="h-4 w-4" />
                                  </div>)}
                                </div>
                              )}
                            </div>
                          ))}
                          {(isInstructor || isAdmin) && (
                            <div className="pt-2 border-t">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedModuleId(module._id);
                                  setShowFileUpload(true);
                                }}
                                className="w-full"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Files
                              </Button>
                            </div>
                          )}
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


        {/* Materials Tab */}
        <TabsContent value="materials" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Download className="h-5 w-5" />
                  <span>Course Materials</span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {course.materials && Array.isArray(course.materials) && course.materials.length > 0 ? (
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
                        <Button size="sm" variant="outline" onClick={() => handleDownloadMaterial(material)}>
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

        {/* Sessions Tab - All Users */}
        <TabsContent value="sessions" className="space-y-6">
          {/* Show SessionsAndRecordings for instructors and admins */}
          {(isInstructor || isAdmin) ? (
            <SessionsAndRecordings courseId={courseId!} isInstructor={isInstructor} isAdmin={isAdmin} />
          ) : (
            /* Show basic session display for learners */
            <>
              {course.sessions && Array.isArray(course.sessions) && course.sessions.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      <span>Sessions</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {course.sessions.map((session) => (
                        <div key={session._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                          <div className="flex items-center space-x-3">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            <div>
                              <h4 className="font-medium">{session.title}</h4>
                              <p className="text-sm text-muted-foreground">{session.description}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {new Date(session.scheduledAt).toLocaleString()}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {session.duration} min
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant={
                                session.status === 'completed' ? 'default' :
                                  session.status === 'live' ? 'destructive' :
                                    session.status === 'cancelled' ? 'secondary' :
                                      'outline'
                              }
                            >
                              {session.status}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {session.type.replace('-', ' ')}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      <span>Sessions</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-6">
                      <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No sessions scheduled</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>



        {/* Batch Tab - Admin Only */}
        {isAdmin && (
          <TabsContent value="batch" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {/* Batch Management */}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column - Users in Course */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Users in Course</h3>
                      <Badge variant="outline">
                        {enrolledStudents.length} users
                      </Badge>
                    </div>

                    {batchLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-sm text-muted-foreground">Loading course users...</p>
                      </div>
                    ) : enrolledStudents.length > 0 ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {enrolledStudents.map((user) => (
                          <div key={user._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {user.role}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeStudentFromCourse(user._id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                        <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No users in this course</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Add users from the database to get started.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Column - All Users in Database */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">All Users</h3>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search users..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-48"
                        />
                      </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {allUsers
                        .filter(user =>
                          (searchTerm === '' ||
                            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
                          !enrolledStudents.some(enrolled => enrolled._id === user._id)
                        )
                        .map((user) => (
                          <div
                            key={user._id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedUsers(prev =>
                                prev.includes(user._id)
                                  ? prev.filter(id => id !== user._id)
                                  : [...prev, user._id]
                              );
                            }}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {user.role}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {selectedUsers.includes(user._id) && (
                                <CheckCircle className="h-4 w-4 text-primary" />
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addStudentsToCourse([user._id]);
                                }}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>

                    {allUsers.filter(user =>
                      !enrolledStudents.some(enrolled => enrolled._id === user._id)
                    ).length === 0 && (
                        <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No users available</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            All users are already in this course.
                          </p>
                        </div>
                      )}
                  </div>
                </div>

                {/* Bulk Actions */}
                {selectedUsers.length > 0 && (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <p className="text-sm">
                      {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedUsers([])}
                      >
                        Clear Selection
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => addStudentsToCourse(selectedUsers)}
                      >
                        Add {selectedUsers.length} User{selectedUsers.length !== 1 ? 's' : ''} to Course
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Settings Tab - Admin Only */}
        {isAdmin && (
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Edit className="h-5 w-5" />
                  <span>Course Settings</span>
                </CardTitle>
                <CardDescription>
                  Manage course settings, publication status, and administrative actions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Publication Status */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Publication Status</h3>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Course Status</p>
                        <p className="text-sm text-muted-foreground">
                          {course.published ? 'Published' : 'Draft'} - {course.published ? 'Course is visible to students' : 'Course is in draft mode'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={course.published ? "outline" : "default"}
                        onClick={async () => {
                          try {
                            await adminService.updateCourseStatus(courseId!, course.published ? 'inactive' : 'active');
                            // Refresh course data
                            const response = await adminService.getCourseById(courseId!);
                            setCourse((response.data) as any);
                            toast({
                              title: "Success",
                              description: `Course ${course.published ? 'unpublished' : 'published'} successfully.`,
                            });
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to update course status.",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        {course.published ? 'Unpublish' : 'Publish'} Course
                      </Button>
                    </div>
                  </div>

                  {/* Course Information */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Course Information</h3>
                      <div className="flex gap-2">
                        {isEditingCourse ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setIsEditingCourse(false);
                                // Reset to original values
                                if (course) {
                                  setCourseSettings({
                                    courseCode: course.courseCode || '',
                                    difficulty: course.difficulty || 'beginner',
                                    duration: course.duration || 0,
                                    priceCredits: course.priceCredits || 0,
                                    title: course.title || '',
                                    description: course.description || '',
                                    shortDescription: course.shortDescription || '',
                                    language: course.language || 'en',
                                    tags: course.tags || [],
                                    requirements: course.requirements || [],
                                    learningOutcomes: course.learningOutcomes || [],
                                    instructorId: course.instructorId || ''
                                  });
                                }
                              }}
                              disabled={savingCourse}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={saveCourseSettings}
                              disabled={savingCourse}
                            >
                              {savingCourse ? 'Saving...' : 'Save Changes'}
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-blue-500 hover:text-white border-0 transition-none"
                            onClick={() => setIsEditingCourse(true)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="courseCode">Course Code</Label>
                        <Input
                          id="courseCode"
                          value={courseSettings.courseCode}
                          onChange={(e) => setCourseSettings(prev => ({ ...prev, courseCode: e.target.value }))}
                          placeholder="Enter course code"
                          disabled={!isEditingCourse}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="difficulty">Difficulty Level</Label>
                        <Select
                          value={courseSettings.difficulty}
                          onValueChange={(value) => setCourseSettings(prev => ({ ...prev, difficulty: value as 'beginner' | 'intermediate' | 'advanced' }))}
                          disabled={!isEditingCourse}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="duration">Duration (minutes)</Label>
                        <Input
                          id="duration"
                          type="number"
                          value={courseSettings.duration}
                          onChange={(e) => setCourseSettings(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                          placeholder="Enter duration in minutes"
                          disabled={!isEditingCourse}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="priceCredits">Price (credits)</Label>
                        <Input
                          id="priceCredits"
                          type="number"
                          value={courseSettings.priceCredits}
                          onChange={(e) => setCourseSettings(prev => ({ ...prev, priceCredits: parseInt(e.target.value) || 0 }))}
                          placeholder="Enter price in credits"
                          disabled={!isEditingCourse}
                        />
                      </div>


                      {isAdmin && (
                        <div className="space-y-2">
                          <Label htmlFor="instructor">Instructor</Label>
                          <Select
                            value={courseSettings.instructorId}
                            onValueChange={(value) => setCourseSettings(prev => ({ ...prev, instructorId: value }))}
                            disabled={!isEditingCourse}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={
                                courseSettings.instructorId
                                  ? `Current: ${instructors.find(i => i._id === courseSettings.instructorId)?.name || course.instructor?.name || 'Unknown Instructor'}`
                                  : "Select instructor"
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {instructors.map((instructor) => (
                                <SelectItem key={instructor._id} value={instructor._id}>
                                  {instructor.name} ({instructor.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Change the instructor assigned to this course
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Course Title and Description */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Course Title</Label>
                        <Input
                          id="title"
                          value={courseSettings.title}
                          onChange={(e) => setCourseSettings(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Enter course title"
                          disabled={!isEditingCourse}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shortDescription">Short Description</Label>
                        <Input
                          id="shortDescription"
                          value={courseSettings.shortDescription}
                          onChange={(e) => setCourseSettings(prev => ({ ...prev, shortDescription: e.target.value }))}
                          placeholder="Enter short description"
                          disabled={!isEditingCourse}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Full Description</Label>
                        <Textarea
                          id="description"
                          value={courseSettings.description}
                          onChange={(e) => setCourseSettings(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Enter full course description"
                          rows={4}
                          disabled={!isEditingCourse}
                        />
                      </div>
                    </div>

                    {/* Language and Tags */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="language">Language</Label>
                        <Select
                          value={courseSettings.language}
                          onValueChange={(value) => setCourseSettings(prev => ({ ...prev, language: value }))}
                          disabled={!isEditingCourse}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                            <SelectItem value="de">German</SelectItem>
                            <SelectItem value="hi">Hindi</SelectItem>
                            <SelectItem value="zh">Chinese</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tags">Tags</Label>
                        <Input
                          id="tags"
                          value={courseSettings.tags.join(', ')}
                          onChange={(e) => setCourseSettings(prev => ({
                            ...prev,
                            tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
                          }))}
                          placeholder="Enter tags separated by commas"
                          disabled={!isEditingCourse}
                        />
                      </div>
                    </div>

                    {/* Requirements and Learning Outcomes */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="requirements">Requirements</Label>
                        <Textarea
                          id="requirements"
                          value={courseSettings.requirements.join('\n')}
                          onChange={(e) => setCourseSettings(prev => ({
                            ...prev,
                            requirements: e.target.value.split('\n').filter(req => req.trim().length > 0)
                          }))}
                          placeholder="Enter requirements (one per line)"
                          rows={3}
                          disabled={!isEditingCourse}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="learningOutcomes">Learning Outcomes</Label>
                        <Textarea
                          id="learningOutcomes"
                          value={courseSettings.learningOutcomes.join('\n')}
                          onChange={(e) => setCourseSettings(prev => ({
                            ...prev,
                            learningOutcomes: e.target.value.split('\n').filter(outcome => outcome.trim().length > 0)
                          }))}
                          placeholder="Enter learning outcomes (one per line)"
                          rows={3}
                          disabled={!isEditingCourse}
                        />
                      </div>
                    </div>
                  </div>



                  {/* Category */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Category</h3>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Current Category</p>
                        <p className="text-sm text-muted-foreground">
                          {getCategoryName()}
                        </p>
                      </div>
                      <Button variant="outline" disabled>
                        Change Category
                      </Button>
                    </div>
                  </div>

                  {/* Course Statistics */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Course Statistics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Enrollments</p>
                        <p className="text-2xl font-bold">{course.stats?.enrollments || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Completions</p>
                        <p className="text-2xl font-bold">{course.stats?.completions || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Average Rating</p>
                        <p className="text-2xl font-bold">{(course.stats?.averageRating || 0).toFixed(1)}★</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Average Progress</p>
                        <p className="text-2xl font-bold">{course.stats?.averageProgress || 0}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Course Metadata */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Course Metadata</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Created Date</Label>
                        <p className="text-sm text-muted-foreground">
                          {course.createdAt ? new Date(course.createdAt).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Last Updated</Label>
                        <p className="text-sm text-muted-foreground">
                          {course.updatedAt ? new Date(course.updatedAt).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Course ID</Label>
                        <p className="text-sm text-muted-foreground font-mono">{course._id}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Total Modules</Label>
                        <p className="text-sm text-muted-foreground">
                          {course.modules?.length || 0} modules
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
                    <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-destructive">Delete Course</p>
                          <p className="text-sm text-muted-foreground">
                            Permanently delete this course and all its content. This action cannot be undone.
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          onClick={async () => {
                            if (confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
                              try {
                                await adminService.deleteCourse(courseId!);
                                toast({
                                  title: "Success",
                                  description: "Course deleted successfully.",
                                });
                                navigate('/courses');
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to delete course.",
                                  variant: "destructive",
                                });
                              }
                            }
                          }}
                        >
                          Delete Course
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Add Form Modal */}
      <Dialog open={showAddForm !== null} onOpenChange={() => {
        setShowAddForm(null);
        setSelectedModuleId(null);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {showAddForm === 'module' && 'Add New Module'}
              {showAddForm === 'assessment' && 'Add New Assessment'}
              {showAddForm === 'session' && 'Schedule New Session'}
              {showAddForm === 'announcement' && 'Create New Announcement'}
              {showAddForm === 'material' && 'Upload New Material'}
              {showAddForm === 'lesson' && 'Add New Lesson'}
            </DialogTitle>
            <DialogDescription>
              {showAddForm === 'module' && 'Create a new module for your course content.'}
              {showAddForm === 'assessment' && 'Create a new assessment for your students.'}
              {showAddForm === 'session' && 'Schedule a new live session for your students.'}
              {showAddForm === 'announcement' && 'Create a new announcement for your course.'}
              {showAddForm === 'material' && 'Upload new course materials for your students.'}
              {showAddForm === 'lesson' && 'Create a new lesson within the selected module.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Title Field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="col-span-3"
                placeholder="Enter title..."
              />
            </div>

            {/* Description Field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="col-span-3"
                placeholder="Enter description..."
                rows={3}
              />
            </div>

            {showAddForm === 'module' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="order" className="text-right">
                  Order
                </Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.order}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (value > 0 || e.target.value === '') {
                      handleInputChange('order', value || '');
                    }
                  }}
                  className="col-span-3"
                  min="1"
                />
              </div>
            )}

            {showAddForm === 'assessment' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">
                    Type
                  </Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="quiz">Quiz</option>
                    <option value="assignment">Assignment</option>
                    <option value="exam">Exam</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="dueDate" className="text-right">
                    Due Date
                  </Label>
                  <Input
                    id="dueDate"
                    type="datetime-local"
                    value={formData.dueDate}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="totalPoints" className="text-right">
                    Total Points
                  </Label>
                  <Input
                    id="totalPoints"
                    type="number"
                    value={formData.totalPoints}
                    onChange={(e) => handleInputChange('totalPoints', parseInt(e.target.value))}
                    className="col-span-3"
                    min="1"
                  />
                </div>
              </>
            )}

            {showAddForm === 'session' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="sessionType" className="text-right">
                    Type
                  </Label>
                  <select
                    id="sessionType"
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="live-class">Live Class</option>
                    <option value="office-hours">Office Hours</option>
                    <option value="review">Review Session</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="scheduledAt" className="text-right">
                    Scheduled At
                  </Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => handleInputChange('scheduledAt', e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="duration" className="text-right">
                    Duration (min)
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                    className="col-span-3"
                    min="1"
                  />
                </div>
              </>
            )}

            {showAddForm === 'announcement' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="content" className="text-right">
                  Content
                </Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  className="col-span-3"
                  placeholder="Enter announcement content..."
                  rows={4}
                />
              </div>
            )}

            {showAddForm === 'material' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="materialFile" className="text-right">
                  File
                </Label>
                <div className="col-span-3">
                  <Input
                    id="materialFile"
                    type="file"
                    accept="*/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFiles([file]);
                        console.log('Material file selected:', file);
                      }
                    }}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Select a file to upload. All file types are accepted.
                  </p>
                </div>
              </div>
            )}

            {showAddForm === 'lesson' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">
                    Module
                  </Label>
                  <div className="col-span-3 text-sm text-muted-foreground">
                    {course.modules?.find(m => m._id === selectedModuleId)?.title || 'Unknown Module'}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="order" className="text-right">
                    Order
                  </Label>
                  <Input
                    id="order"
                    type="number"
                    value={formData.order || 1}
                    onChange={(e) => handleInputChange('order', parseInt(e.target.value))}
                    className="col-span-3"
                    min="1"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">
                    Content Files
                  </Label>
                  <div className="col-span-3 text-sm text-muted-foreground">
                    Files can be uploaded after creating the lesson.
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button size="sm" variant="outline" onClick={() => {
              setShowAddForm(null);
              setSelectedModuleId(null);
            }}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleFormSubmit} disabled={isSubmitting || !formData.title.trim()}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Upload Modal */}
      <Dialog open={showFileUpload} onOpenChange={() => {
        setShowFileUpload(false);
        setSelectedLessonId(null);
        setSelectedModuleId(null);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {selectedLessonId ? 'Upload Files to Lesson' : 'Add Files to Module'}
            </DialogTitle>
            <DialogDescription>
              {selectedLessonId
                ? 'Upload files to add content to this lesson. All file types are accepted.'
                : 'Upload files to create a new lesson in this module. All file types are accepted.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                {selectedLessonId ? 'Lesson' : 'Module'}
              </Label>
              <div className="col-span-3 text-sm text-muted-foreground">
                {selectedLessonId
                  ? course.modules?.flatMap(m => m.lessons)?.find(l => l._id === selectedLessonId)?.title || 'Unknown Lesson'
                  : course.modules?.find(m => m._id === selectedModuleId)?.title || 'Unknown Module'
                }
              </div>
            </div>

            {!selectedLessonId && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lessonTitle" className="text-right">
                  Lesson Title
                </Label>
                <Input
                  id="lessonTitle"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="col-span-3"
                  placeholder="Enter lesson title..."
                />
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="files" className="text-right">
                Files
              </Label>
              <div className="col-span-3">
                <Input
                  id="files"
                  type="file"
                  multiple
                  accept="*/*"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      setSelectedFiles(files);
                      console.log('Files selected:', files);
                    }
                  }}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Select one or more files to upload. All file types are accepted.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button size="sm" variant="outline" onClick={() => {
              setShowFileUpload(false);
              setSelectedLessonId(null);
              setSelectedModuleId(null);
            }}>
              Cancel
            </Button>
            <Button size="sm" disabled={isSubmitting} onClick={async () => {
              if (!selectedLessonId && !formData.title.trim()) {
                toast({
                  title: "Error",
                  description: "Please enter a lesson title.",
                  variant: "destructive",
                });
                return;
              }

              if (!selectedFiles || selectedFiles.length === 0) {
                toast({
                  title: "Error",
                  description: "Please select at least one file to upload.",
                  variant: "destructive",
                });
                return;
              }

              try {
                setIsSubmitting(true);

                if (!selectedLessonId) {
                  // Create new lesson first
                  const service = isAdmin ? adminService : instructorService;
                  const lessonResponse = await service.createLesson(courseId!, selectedModuleId!, {
                    title: formData.title,
                    description: formData.description || '',
                    order: formData.order
                  });

                  const newLessonId = lessonResponse.data.lesson._id;

                  // Upload files to the new lesson
                  for (let i = 0; i < selectedFiles.length; i++) {
                    const file = selectedFiles[i];
                    const formData = new FormData();
                    formData.append('content', file);

                    await service.uploadLessonContent(courseId!, selectedModuleId!, newLessonId, formData);
                  }

                  toast({
                    title: "Success!",
                    description: `Lesson created and ${selectedFiles.length} file(s) uploaded successfully.`,
                  });
                } else {
                  // Upload files to existing lesson
                  const service = isAdmin ? adminService : instructorService;
                  for (let i = 0; i < selectedFiles.length; i++) {
                    const file = selectedFiles[i];
                    const formData = new FormData();
                    formData.append('content', file);

                    await service.uploadLessonContent(courseId!, selectedModuleId!, selectedLessonId, formData);
                  }

                  toast({
                    title: "Success!",
                    description: `${selectedFiles.length} file(s) uploaded successfully.`,
                  });
                }

                setShowFileUpload(false);
                setSelectedLessonId(null);
                setSelectedModuleId(null);
                setSelectedFiles(null);

                // Refresh course data
                let response;
                if (isAdmin) {
                  response = await adminService.getCourseById(courseId!);
                } else if (isInstructor) {
                  response = await instructorService.getCourseDetail(courseId!);
                } else {
                  response = await courseService.getCourseDetail(courseId!);
                }
                setCourse(response.data.course);
              } catch (error: any) {
                console.error('Error:', error);
                let errorMessage = "Failed to upload files. Please try again.";

                if (error.response?.status === 404) {
                  errorMessage = "Lesson or module not found. Please refresh the page and try again.";
                } else if (error.response?.status === 401) {
                  errorMessage = "Authentication error. Please try again.";
                } else if (error.response?.status === 403) {
                  errorMessage = "You don't have permission to upload files to this lesson.";
                } else if (error.response?.status === 500) {
                  errorMessage = "Server error during file upload. Please try again.";
                } else if (error.response?.data?.message) {
                  errorMessage = error.response.data.message;
                }

                toast({
                  title: "Error",
                  description: errorMessage,
                  variant: "destructive",
                });
              } finally {
                setIsSubmitting(false);
              }
            }}>
              {isSubmitting ? 'Uploading...' : (selectedLessonId ? 'Upload Files' : 'Create Lesson with Files')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Session Modal */}
      <ScheduleSessionModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        courseId={courseId}
        onSessionCreated={() => {
          // Refresh course data to show new session
          const fetchCourseDetail = async () => {
            try {
              let response;
              if (isAdmin) {
                response = await adminService.getCourseById(courseId!);
              } else if (isInstructor) {
                response = await instructorService.getCourseDetail(courseId!);
              } else {
                response = await courseService.getCourseDetail(courseId!);
              }
              setCourse(response.data.course);
            } catch (error) {
              console.error('Error refreshing course data:', error);
            }
          };
          fetchCourseDetail();
        }}
      />


    </div>
  );
};

export default UnifiedCourseDetail;
