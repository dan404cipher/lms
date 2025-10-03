import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDuration } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
  Paperclip,
} from "lucide-react";
import courseService from "@/services/courseService";
import instructorService from "@/services/instructorService";
import adminService, { Course } from "@/services/adminService";
import ScheduleSessionModal from "@/components/ScheduleSessionModal";
import SessionsAndRecordings from "@/components/SessionsAndRecordings";
import ConfirmationModal from "@/components/ConfirmationModal";

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
  sessionId?: string;
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
  hasRecording?: boolean;
  sessionId?: string;
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
  assessments?: any[];
  published?: boolean;
  createdAt?: string;
}

const UnifiedCourseDetail = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [course, setCourse] = useState<CourseDetail | null>(null);
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
  const [assessmentFiles, setAssessmentFiles] = useState<FileList | null>(null);
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
  const [deleteLessonId, setDeleteLessonId] = useState<string | null>(null);
  const [deleteMaterialId, setDeleteMaterialId] = useState<string | null>(null);
  const [showDeleteCourseModal, setShowDeleteCourseModal] = useState(false);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);

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
  
  // Filter states
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [enrollmentFilter, setEnrollmentFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<any>(null);

  // Assessment state
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showViewSubmissionModal, setShowViewSubmissionModal] = useState(false);
  const [submissionFiles, setSubmissionFiles] = useState<FileList | null>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false);
  const [assessmentSubmissions, setAssessmentSubmissions] = useState<any[]>([]);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [gradingScore, setGradingScore] = useState<number>(0);
  const [gradingFeedback, setGradingFeedback] = useState('');
  const [publishingAssessment, setPublishingAssessment] = useState<string | null>(null);

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

  // Helper function to filter and sort users
  const getFilteredAndSortedUsers = (users: any[], isEnrolled: boolean = false) => {
    let filtered = users.filter(user => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.status && user.status.toLowerCase().includes(searchTerm.toLowerCase()));

      // Role filter
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;

      // Status filter
      const matchesStatus = statusFilter === 'all' || 
        (user.status && user.status.toLowerCase() === statusFilter.toLowerCase()) ||
        (statusFilter === 'active' && (!user.status || user.status === 'active'));

      // Enrollment filter (only for enrolled users)
      const matchesEnrollment = !isEnrolled || enrollmentFilter === 'all' ||
        (user.enrollmentStatus && user.enrollmentStatus.toLowerCase() === enrollmentFilter.toLowerCase()) ||
        (enrollmentFilter === 'active' && (!user.enrollmentStatus || user.enrollmentStatus === 'active'));

      return matchesSearch && matchesRole && matchesStatus && matchesEnrollment;
    });

    // Sort users
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'role':
          aValue = a.role.toLowerCase();
          bValue = b.role.toLowerCase();
          break;
        case 'status':
          aValue = (a.status || 'active').toLowerCase();
          bValue = (b.status || 'active').toLowerCase();
          break;
        case 'enrollmentDate':
          aValue = new Date(a.enrolledAt || a.createdAt || 0).getTime();
          bValue = new Date(b.enrolledAt || b.createdAt || 0).getTime();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  };

  // Get filtered enrolled students
  const filteredEnrolledStudents = getFilteredAndSortedUsers(enrolledStudents, true);

  // Get filtered all users (excluding already enrolled)
  const filteredAllUsers = getFilteredAndSortedUsers(
    allUsers.filter(user => !enrolledStudents.some(enrolled => enrolled._id === user._id))
  );

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setStatusFilter('all');
    setEnrollmentFilter('all');
    setSortBy('name');
    setSortOrder('asc');
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
    if (!courseId || (!isAdmin && !isInstructor)) {
      console.log('fetchEnrolledStudents: Skipping - courseId:', courseId, 'isAdmin:', isAdmin, 'isInstructor:', isInstructor);
      return;
    }

    try {
      setBatchLoading(true);
      console.log('Fetching enrolled students for courseId:', courseId);
      let response;
      if (isAdmin) {
        response = await adminService.getEnrolledStudents(courseId);
      } else if (isInstructor) {
        response = await instructorService.getEnrolledStudents(courseId);
      }
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
    } catch (error: any) {
      console.error('Error adding users to course:', error);
      let errorMessage = "Failed to add users to course. Please try again.";
      
      if (error.response?.status === 404) {
        errorMessage = "Course not found. Please refresh the page and try again.";
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to add users to this course.";
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || "Invalid request. Please check the user selection.";
      } else if (error.response?.status === 500) {
        errorMessage = "Server error occurred. Please try again later.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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
    } catch (error: any) {
      console.error('Error removing student from course:', error);
      let errorMessage = "Failed to remove student from course. Please try again.";
      
      if (error.response?.status === 404) {
        errorMessage = "Student or course not found. Please refresh the page and try again.";
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to remove students from this course.";
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || "Invalid request. Please try again.";
      } else if (error.response?.status === 500) {
        errorMessage = "Server error occurred. Please try again later.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setBatchLoading(false);
    }
  };
  const fetchCourseDetail = async () => {
    if (!courseId || authLoading || !user) return; // Wait for auth to load and user to be available

    console.log('🎬 fetchCourseDetail - Starting to fetch course details', {
      courseId,
      isAdmin,
      isInstructor,
      userRole: user?.role
    });

    try {
      setLoading(true);
      let response;
      if (isAdmin) {
        console.log('🎬 Using adminService.getCourseById');
        response = await adminService.getCourseById(courseId);
      } else if (isInstructor) {
        console.log('🎬 Using instructorService.getCourseDetail');
        response = await instructorService.getCourseDetail(courseId);
      } else {
        console.log('🎬 Using courseService.getCourseDetail');
        response = await courseService.getCourseDetail(courseId);
      }

      console.log('🎬 Course response received:', {
        success: response.success,
        hasCourse: !!response.data?.course,
        courseRecordings: response.data?.course?.recordings?.length || 0,
        recordings: response.data?.course?.recordings
      });

      setCourse(response.data.course);
      
      // Log after setting course state
      console.log('🎬 Course state set:', {
        courseId: response.data.course?._id,
        courseTitle: response.data.course?.title,
        recordingsCount: response.data.course?.recordings?.length || 0,
        recordings: response.data.course?.recordings
      });
    } catch (error: any) {
      console.error('🎬 Error fetching course detail:', error);
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
  }, [courseId, isInstructor, isAdmin, authLoading, user, isScheduleModalOpen]);

  // Fetch users when batch tab is active
  useEffect(() => {
    if (activeTab === 'batch' && (isAdmin || isInstructor) && courseId) {
      if (isAdmin) {
        fetchAllUsers();
      }
      fetchEnrolledStudents();
    }
  }, [activeTab, isAdmin, isInstructor, courseId]);

  // Update enrolled students when course data changes
  useEffect(() => {
    if (course && (isAdmin || isInstructor) && courseId) {
      // Fetch enrolled students when course changes
      fetchEnrolledStudents();
    }
  }, [course, isAdmin, isInstructor, courseId]);

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

      let blob;
      if (isAdmin) {
        blob = await adminService.downloadMaterial(courseId, material._id);
      } else if (isInstructor) {
        blob = await instructorService.downloadCourseMaterial(courseId, material._id);
      } else {
        // For learners/students
        blob = await courseService.downloadMaterial(courseId, material._id);
      }

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

  const handleDownloadLessonContent = async (file: any, moduleId: string, lessonId: string) => {
    if (!courseId) return;

    try {
      setLoading(true);

      let blob;
      if (isAdmin) {
        blob = await adminService.downloadLessonContent(courseId, moduleId, lessonId, file._id);
      } else if (isInstructor) {
        blob = await instructorService.downloadLessonContent(courseId, moduleId, lessonId, file._id);
      } else {
        // For learners/students
        blob = await courseService.downloadLessonContent(courseId, moduleId, lessonId, file._id);
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `${file.name} downloaded successfully!`
      });
    } catch (error) {
      console.error('Error downloading lesson content:', error);
      toast({
        title: "Download Failed",
        description: `Failed to download ${file.name}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewVideo = (video: CourseVideo) => {
    console.log('Viewing video:', video);
  };

  const handleLessonClick = async (lessonId: string) => {
    if (!courseId) return;
    
    try {
      // Mark lesson as completed
      await courseService.markLessonComplete(courseId, lessonId);
      
      // Refresh course data to update progress
      await fetchCourseDetail();
      
      toast({
        title: "Success",
        description: "Lesson marked as completed!",
      });
    } catch (error) {
      console.error('Error marking lesson as complete:', error);
      // Don't show error toast for this, as it's not critical
    }
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
          const assessmentData = {
            title: formData.title,
            description: formData.description,
            type: formData.type,
            dueDate: formData.dueDate,
            totalPoints: formData.totalPoints
          };
          
          // Create the assessment first
          const assessmentResponse = await service.createAssessment(courseId, assessmentData);
          const assessmentId = assessmentResponse.data.assessment._id;
          
          // Upload files if any were selected
          if (assessmentFiles && assessmentFiles.length > 0) {
            for (const file of Array.from(assessmentFiles)) {
              if (isAdmin) {
                // Admin service doesn't have this method yet, skip for now
                console.warn('Assessment file upload not available for admin yet');
              } else {
                await (service as any).uploadCourseAssessmentAttachment(courseId, assessmentId, file);
              }
            }
          }
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
      setAssessmentFiles(null);
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
    const record = course?.recordings?.find(r => r.sessionId === recording._id);
    console.log('🎬 Opening video player for recording:', {
      recording: record,
      url: (record as any)?.recordingUrl,
      title: (record as any)?.title,
      duration: (record as any)?.duration
    });
    setSelectedRecording(record as any);
    setVideoError(null);
    setVideoLoading(false);
    setVideoReady(false);
    setShowVideoPlayer(true);
  };

  // Effect to handle video source when recording changes
  useEffect(() => {
    if (selectedRecording && showVideoPlayer) {
      console.log('🎬 Setting video source:', {
        recordingUrl: selectedRecording.recordingUrl,
        downloadUrl: selectedRecording.downloadUrl,
        playUrl: selectedRecording.playUrl,
        title: selectedRecording.title
      });
      const video = document.querySelector('video') as HTMLVideoElement;
      if (video) {
        video.src = selectedRecording.recordingUrl;
        video.load(); // Force reload with new source
        console.log('🎬 Video element updated with src:', video.src);
      }
    }
  }, [selectedRecording, showVideoPlayer]);


  const handleDeleteLesson = (lessonId: string) => {
    setDeleteLessonId(lessonId);
  };

  const confirmDeleteLesson = async () => {
    if (!courseId || !deleteLessonId) {
      toast({
        title: "Error",
        description: "Course ID or Lesson ID not found",
        variant: "destructive",
      });
      return;
    }

    // Find the module that contains this lesson
    const module = course?.modules?.find(m => 
      m.lessons.some(l => l._id === deleteLessonId)
    );

    if (!module) {
      toast({
        title: "Error",
        description: "Module not found for this lesson",
        variant: "destructive",
      });
      return;
    }

    try {
      const service = isAdmin ? adminService : instructorService;
      await service.deleteLesson(courseId, module._id, deleteLessonId);
      
      // Update the local state to remove the lesson
      setCourse(prevCourse => {
        if (!prevCourse) return null;
        return {
          ...prevCourse,
          modules: prevCourse.modules?.map(m => 
            m._id === module._id 
              ? { ...m, lessons: m.lessons.filter(l => l._id !== deleteLessonId) }
              : m
          )
        };
      });

      toast({
        title: "Success",
        description: "Lesson deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting lesson:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete lesson",
        variant: "destructive",
      });
    } finally {
      setDeleteLessonId(null);
    }
  };

  const handleDeleteMaterial = (materialId: string) => {
    setDeleteMaterialId(materialId);
  };

  const confirmDeleteMaterial = async () => {
    if (!courseId || !deleteMaterialId) {
      toast({
        title: "Error",
        description: "Course ID or Material ID not found",
        variant: "destructive",
      });
      return;
    }

    try {
      const service = isAdmin ? adminService : instructorService;
      await service.deleteMaterial(courseId, deleteMaterialId);
      
      // Update the local state to remove the material
      setCourse(prevCourse => {
        if (!prevCourse) return null;
        return {
          ...prevCourse,
          materials: prevCourse.materials?.filter(m => m._id !== deleteMaterialId)
        };
      });

      toast({
        title: "Success",
        description: "Material deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting material:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete material",
        variant: "destructive",
      });
    } finally {
      setDeleteMaterialId(null);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    console.log('Session deleted:', sessionId);
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
      console.error('Error refreshing course data after session deletion:', error);
    }
  };


  const handleDeleteCourse = () => {
    setShowDeleteCourseModal(true);
  };

  const confirmDeleteCourse = async () => {
    if (!courseId) return;

    setIsDeletingCourse(true);
    try {
      await adminService.deleteCourse(courseId);
      toast({
        title: "Success",
        description: "Course deleted successfully.",
      });
      navigate('/courses');
    } catch (error: any) {
      console.error('Error deleting course:', error);
      let errorMessage = "Failed to delete course. Please try again.";
      
      if (error.response?.status === 404) {
        errorMessage = "Course not found. It may have already been deleted.";
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to delete this course.";
      } else if (error.response?.status === 500) {
        errorMessage = "Server error occurred. Please try again later.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDeletingCourse(false);
      setShowDeleteCourseModal(false);
    }
  };

  // Assessment functions
  const handlePublishAssessment = async (assessmentId: string, isPublished: boolean) => {
    if (!courseId) return;

    try {
      setPublishingAssessment(assessmentId);
      
      const service = isAdmin ? adminService : instructorService;
      await service.publishAssessment(courseId, assessmentId, isPublished);

      toast({
        title: "Success",
        description: `Assessment ${isPublished ? 'published' : 'unpublished'} successfully.`,
      });

      // Refresh course data to show updated assessment status
      await fetchCourseDetail();
    } catch (error: any) {
      console.error('Error publishing assessment:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update assessment status.",
        variant: "destructive",
      });
    } finally {
      setPublishingAssessment(null);
    }
  };

  const handleViewAssessment = async (assessmentId: string) => {
    if (!courseId) return;

    try {
      const response = await courseService.getAssessmentDetails(courseId, assessmentId);
      setSelectedAssessment(response.data.assessment);
      setShowAssessmentModal(true);

      // If user is instructor/admin, also fetch submissions
      if (isInstructor || isAdmin) {
        const submissionsResponse = await courseService.getAssessmentSubmissions(courseId, assessmentId);
        setAssessmentSubmissions(submissionsResponse.data.submissions || []);
      }
    } catch (error) {
      console.error('Error fetching assessment details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch assessment details",
        variant: "destructive",
      });
    }
  };

  const handleSubmitAssessment = async () => {
    if (!courseId || !selectedAssessment) return;

    if (!submissionFiles && !submissionContent.trim()) {
      toast({
        title: "Error",
        description: "Please provide either files or text content for your submission",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmittingAssessment(true);

      const formData = new FormData();
      formData.append('submissionType', submissionFiles ? 'file' : 'text');
      formData.append('content', submissionContent);

      if (submissionFiles) {
        Array.from(submissionFiles).forEach((file) => {
          formData.append('files', file);
        });
      }

      await courseService.submitAssessment(courseId, selectedAssessment._id, formData);

      toast({
        title: "Success",
        description: "Assessment submitted successfully!",
      });

      setShowSubmissionModal(false);
      setSubmissionFiles(null);
      setSubmissionContent('');
      setSelectedAssessment(null);

      // Refresh course data to show updated submission status
      await fetchCourseDetail();
    } catch (error: any) {
      console.error('Error submitting assessment:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to submit assessment",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingAssessment(false);
    }
  };

  const handleDownloadAttachment = async (attachment: any) => {
    if (!courseId || !selectedAssessment) return;

    try {
      const blob = await courseService.downloadAssessmentAttachment(courseId, selectedAssessment._id, attachment.filename);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Error downloading attachment:', error);
      toast({
        title: "Error",
        description: "Failed to download attachment",
        variant: "destructive",
      });
    }
  };

  const handleGradeSubmission = async () => {
    if (!courseId || !selectedAssessment || !selectedSubmission) return;

    try {
      await courseService.gradeAssessmentSubmission(
        courseId,
        selectedAssessment._id,
        selectedSubmission._id,
        {
          score: gradingScore,
          feedback: gradingFeedback
        }
      );

      toast({
        title: "Success",
        description: "Assessment graded successfully!",
      });

      setShowGradingModal(false);
      setSelectedSubmission(null);
      setGradingScore(0);
      setGradingFeedback('');

      // Refresh submissions
      const submissionsResponse = await courseService.getAssessmentSubmissions(courseId, selectedAssessment._id);
      setAssessmentSubmissions(submissionsResponse.data.submissions || []);
    } catch (error: any) {
      console.error('Error grading assessment:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to grade assessment",
        variant: "destructive",
      });
    }
  };

  const openSubmissionModal = (assessment: any) => {
    setSelectedAssessment(assessment);
    setShowSubmissionModal(true);
  };

  const openViewSubmissionModal = async (assessment: any) => {
    if (!courseId) return;

    try {
      // Fetch detailed assessment data including attachments
      const response = await courseService.getAssessmentDetails(courseId, assessment._id);
      setSelectedAssessment(response.data.assessment);
      setSelectedSubmission(response.data.submission);
      setShowViewSubmissionModal(true);
    } catch (error) {
      console.error('Error fetching assessment details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch assessment details",
        variant: "destructive",
      });
    }
  };

  const openGradingModal = (submission: any) => {
    setSelectedSubmission(submission);
    setGradingScore(submission.score || 0);
    setGradingFeedback(submission.feedback || '');
    setShowGradingModal(true);
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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          {(isAdmin || isInstructor) && <TabsTrigger value="batch">Batch</TabsTrigger>}
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
                      <span className="font-medium">{formatDuration(course.duration)}</span>
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
                              onClick={() => {
                                // For learners, mark lesson as complete when clicked
                                if (!isInstructor && !isAdmin) {
                                  handleLessonClick(lesson._id);
                                } else {
                                  // For instructors/admins, navigate to lesson detail
                                  navigate(`/courses/${courseId}/lessons/${lesson._id}`);
                                }
                              }}
                            >
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-green-600" />
                                <span className="text-sm">{lesson.title}</span>
                                {lesson.files && lesson.files.length > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {lesson.files.length} file{lesson.files.length !== 1 ? 's' : ''}
                                  </Badge>
                                )}
                                {lesson.files && lesson.files.length > 0 && (
                                  <div className="flex items-center space-x-1">
                                    {lesson.files.map((file: any, index: number) => (
                                      <Button
                                        key={file._id}
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownloadLessonContent(file, module._id, lesson._id);
                                        }}
                                        title={`Download ${file.name}`}
                                        className="h-6 w-6 p-0"
                                      >
                                        <Download className="h-3 w-3" />
                                      </Button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {(isInstructor || isAdmin) && (
                                <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                  <Badge variant={lesson.isPublished ? "default" : "secondary"}>
                                    {lesson.isPublished ? 'Published' : 'Draft'}
                                  </Badge>
                                  {lesson.files && lesson.files.length > 0 && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Download all files in the lesson
                                        lesson.files.forEach((file: any) => {
                                          handleDownloadLessonContent(file, module._id, lesson._id);
                                        });
                                      }}
                                      title="Download all files"
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedLessonId(lesson._id);
                                      setSelectedModuleId(module._id);
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
                                  {(isInstructor || isAdmin) && (
                                    <div 
                                      className="bg-red-400 text-white p-1 rounded-lg cursor-pointer hover:bg-red-500 transition-colors" 
                                      onClick={() => handleDeleteLesson(lesson._id)}
                                      title="Delete lesson"
                                    >
                                      <Trash className="h-4 w-4" />
                                    </div>
                                  )}
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
                                  setSelectedLessonId(null); // Clear lesson ID when adding to module
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
                        {(isAdmin || isInstructor) && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleDeleteMaterial(material._id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
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

        {/* Assessments Tab */}
        <TabsContent value="assessments" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Course Assessments</span>
                </CardTitle>
                {(isInstructor || isAdmin) && (
                  <Button size="sm" onClick={() => setShowAddForm('assessment')}>
                    <Plus className="h-3 w-3 mr-1" />
                    Create Assessment
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {course.assessments && course.assessments.length > 0 ? (
                <div className="space-y-3">
                  {course.assessments.map((assessment) => (
                    <div key={assessment._id} className="p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <div>
                            <h4 className="font-medium">{assessment.title}</h4>
                            <p className="text-sm text-muted-foreground">{assessment.description}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline" className="text-xs">{assessment.type}</Badge>
                              <span className="text-xs text-muted-foreground">
                                Due: {new Date(assessment.dueDate).toLocaleDateString()}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {assessment.totalPoints} points
                              </span>
                              {assessment.attachments && assessment.attachments.length > 0 && (
                                <div className="flex items-center space-x-1">
                                  <Paperclip className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {assessment.attachments.length} file{assessment.attachments.length > 1 ? 's' : ''}
                                  </span>
                                </div>
                              )}
                              {assessment.submission && (
                                <Badge 
                                  variant={assessment.submission.status === 'graded' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {assessment.submission.status === 'graded' ? 'Graded' : 'Submitted'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      <div className="flex items-center space-x-2">
                        {/* Instructor/Admin controls */}
                        {(isInstructor || isAdmin) && (
                          <>
                            <Button
                              size="sm"
                              variant={assessment.isPublished ? "outline" : "default"}
                              onClick={() => handlePublishAssessment(assessment._id, !assessment.isPublished)}
                              disabled={publishingAssessment === assessment._id}
                            >
                              {publishingAssessment === assessment._id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              ) : (
                                assessment.isPublished ? 'Unpublish' : 'Publish'
                              )}
                            </Button>
                            <Badge variant={assessment.isPublished ? "default" : "secondary"} className="text-xs">
                              {assessment.isPublished ? 'Published' : 'Draft'}
                            </Badge>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleViewAssessment(assessment._id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        
                        {/* Learner controls */}
                        {!isInstructor && !isAdmin && !assessment.isPublished && (
                          <Badge variant="secondary" className="text-xs">
                            Not Published
                          </Badge>
                        )}
                        
                        {/* Submit button - only if not submitted, published, and before due date */}
                        {!isInstructor && !isAdmin && !assessment.submission && assessment.isPublished && new Date(assessment.dueDate) > new Date() && (
                          <Button 
                            size="sm" 
                            onClick={() => openSubmissionModal(assessment)}
                          >
                            Submit
                          </Button>
                        )}
                        
                        {/* Past due - no submission */}
                        {!isInstructor && !isAdmin && assessment.isPublished && new Date(assessment.dueDate) <= new Date() && !assessment.submission && (
                          <Badge variant="destructive" className="text-xs">
                            Past Due
                          </Badge>
                        )}
                        
                        {/* Submitted assessments - unified view */}
                        {!isInstructor && !isAdmin && assessment.submission && (
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={assessment.submission.status === 'graded' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {assessment.submission.status === 'graded' 
                                ? `Score: ${assessment.submission.score}/${assessment.totalPoints}`
                                : 'Submitted'
                              }
                            </Badge>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openViewSubmissionModal(assessment)}
                            >
                              View
                            </Button>
                            {/* Resubmit button - only if not graded and before due date */}
                            {assessment.submission.status !== 'graded' && new Date(assessment.dueDate) > new Date() && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openSubmissionModal(assessment)}
                              >
                                Resubmit
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
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

        {/* Sessions Tab - All Users */}
        <TabsContent value="sessions" className="space-y-6">
          {/* Show SessionsAndRecordings for all users */}
          {(() => {
            console.log('🎬 Rendering SessionsAndRecordings component:', {
              courseId,
              isInstructor,
              isAdmin,
              courseRecordings: course?.recordings?.length || 0
            });
            return null;
          })()}
          <SessionsAndRecordings 
            courseId={courseId!} 
            isInstructor={isInstructor} 
            isAdmin={isAdmin}
            onSessionDeleted={handleDeleteSession}
            onRecordingSelected={(recording) => {
              console.log('🎬 Recording selected from SessionsAndRecordings:', recording);
              setSelectedRecording(recording);
              setVideoError(null);
              setVideoLoading(false);
              setVideoReady(false);
              setShowVideoPlayer(true);
            }}
          />
        </TabsContent>

        {selectedRecording && (
                <Dialog open={showVideoPlayer} onOpenChange={setShowVideoPlayer}>
                <DialogContent className="max-w-4xl w-full">
                  <DialogHeader>
                    <DialogTitle>{selectedRecording?.title}</DialogTitle>
                    <DialogDescription>
                      Watch the recording of this session
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {selectedRecording && (
                      <div className="relative">
                        {videoLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg z-10">
                            <div className="flex items-center space-x-2 text-white">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                              <span className="text-sm">Loading video...</span>
                            </div>
                          </div>
                        )}
                        
                        {videoError ? (
                          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground mb-4">{videoError}</p>
                              <div className="space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setVideoError(null);
                                    setVideoLoading(true);
                                    setVideoReady(false);
                                  }}
                                >
                                  Retry
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(selectedRecording.recordingUrl, '_blank')}
                                >
                                  Open in New Tab
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Debug info */}
                            <div className="p-2 bg-yellow-100 rounded text-xs">
                              <p><strong>Video URL:</strong> {selectedRecording.recordingUrl}</p>
                              <p><strong>Title:</strong> {selectedRecording.title}</p>
                              <p><strong>Duration:</strong> {selectedRecording.duration}s</p>
                              <div className="mt-2 space-x-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const video = document.querySelector('video') as HTMLVideoElement;
                                    if (video) {
                                      console.log('🎬 Manual play attempt:', {
                                        src: video.src,
                                        readyState: video.readyState,
                                        networkState: video.networkState
                                      });
                                      video.play().then(() => {
                                        console.log('🎬 Video play successful');
                                      }).catch((error) => {
                                        console.error('🎬 Video play failed:', error);
                                      });
                                    }
                                  }}
                                >
                                  Force Play
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(selectedRecording.recordingUrl, '_blank')}
                                >
                                  Open in New Tab
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const video = document.querySelector('video') as HTMLVideoElement;
                                    if (video) {
                                      console.log('🎬 Video debug info:', {
                                        src: video.src,
                                        currentSrc: video.currentSrc,
                                        readyState: video.readyState,
                                        networkState: video.networkState,
                                        paused: video.paused,
                                        duration: video.duration,
                                        currentTime: video.currentTime,
                                        buffered: video.buffered.length > 0 ? video.buffered.end(0) : 0,
                                        videoWidth: video.videoWidth,
                                        videoHeight: video.videoHeight
                                      });
                                    }
                                  }}
                                >
                                  Debug Video
                                </Button>
                              </div>
                            </div>
                          <div className="relative">
                            {!videoReady && !videoLoading && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg z-10">
                                <Button
                                  onClick={() => {
                                    const video = document.querySelector('video') as HTMLVideoElement;
                                    if (video) {
                                      video.play().catch(console.error);
                                    }
                                  }}
                                  className="flex items-center space-x-2"
                                >
                                  <Play className="h-4 w-4" />
                                  <span>Play Video</span>
                                </Button>
                              </div>
                            )}
                          <video
                          key={selectedRecording._id}
                          controls
                          className="w-full h-auto max-h-[70vh] rounded-lg shadow-sm cursor-pointer"
                          preload="metadata"
                          autoPlay={false}
                          playsInline
                          muted={false}
                          onLoadStart={() => {
                            const cleanPath = selectedRecording.localFilePath?.replace(/^\/recordings\//, '');
                            const apiBaseUrl = import.meta.env.VITE_API_URL.replace('/api', '');
                            const actualSrc = selectedRecording.localFilePath && cleanPath
                              ? `${apiBaseUrl}/recordings/${cleanPath}`
                              : (selectedRecording.playUrl || selectedRecording.recordingUrl);
                            console.log('🎬 Video loading started:', {
                              actualSrc,
                              url: selectedRecording.recordingUrl,
                              localFilePath: selectedRecording.localFilePath,
                              title: selectedRecording.title,
                              duration: selectedRecording.duration
                            });
                            setVideoLoading(true);
                            setVideoError(null);
                            setVideoReady(false);
                          }}
                          onLoadedData={() => {
                            console.log('🎬 Video element loadedData triggered');
                          }}
                          onCanPlay={(e) => {
                            const video = e.target as HTMLVideoElement;
                            console.log('🎬 Video can play:', {
                              url: selectedRecording.recordingUrl,
                              readyState: video.readyState,
                              networkState: video.networkState
                            });
                            setVideoLoading(false);
                            setVideoReady(true);
                            
                            // Try to play immediately when ready
                            video.play().then(() => {
                              console.log('🎬 Video started playing successfully');
                            }).catch((error) => {
                              console.log('🎬 Video play failed:', error);
                            });
                          }}
                          onClick={(e) => {
                            const video = e.target as HTMLVideoElement;
                            console.log('🎬 Video clicked, current state:', {
                              paused: video.paused,
                              readyState: video.readyState,
                              networkState: video.networkState,
                              src: video.src
                            });
                            if (video.paused) {
                              video.play().catch(console.error);
                            } else {
                              video.pause();
                            }
                          }}
                          onLoadedMetadata={(e) => {
                            const video = e.target as HTMLVideoElement;
                            console.log('🎬 Video metadata loaded:', {
                              duration: video.duration,
                              videoWidth: video.videoWidth,
                              videoHeight: video.videoHeight,
                              readyState: video.readyState,
                              networkState: video.networkState,
                              src: video.src,
                              currentSrc: video.currentSrc,
                              localFilePath: selectedRecording.localFilePath
                            });
                            
                            // Check if the video loaded successfully
                            if (video.duration > 0 && video.videoWidth > 0 && video.videoHeight > 0) {
                              setVideoLoading(false);
                              setVideoReady(true);
                            } else {
                              setVideoError("Video file appears to be invalid or corrupted.");
                              setVideoLoading(false);
                              setVideoReady(false);
                              toast({
                                title: "Video Error",
                                description: "Video file appears to be invalid or corrupted. Please try downloading it instead.",
                                variant: "destructive"
                              });
                            }
                          }}
                          onCanPlayThrough={() => {
                            console.log('Video can play through:', selectedRecording.recordingUrl);
                            setVideoLoading(false);
                            setVideoReady(true);
                          }}
                          onWaiting={() => {
                            console.log('🎬 Video waiting for data - trying to play');
                            setVideoLoading(true);
                            // Try to play the video when it's waiting
                            const video = document.querySelector('video') as HTMLVideoElement;
                            if (video && video.readyState >= 2) {
                              video.play().catch(console.error);
                            }
                          }}
                          onStalled={() => {
                            console.log('Video stalled');
                            setVideoLoading(true);
                          }}
                          onError={(e) => {
                            console.error('Video error:', e);
                            const target = e.target as HTMLVideoElement | HTMLSourceElement;
                            
                            // Get video element and source
                            const video = target.tagName === 'VIDEO' ? target as HTMLVideoElement : (target.parentElement as HTMLVideoElement);
                            const source = target.tagName === 'SOURCE' ? target as HTMLSourceElement : video.querySelector('source');
                            
                            console.error('Video error details:', {
                              videoError: video?.error,
                              videoSrc: video?.src,
                              videoCurrentSrc: video?.currentSrc,
                              sourceSrc: source?.src,
                              targetTag: target.tagName,
                              networkState: video?.networkState,
                              readyState: video?.readyState
                            });
                            
                            // Hide video and show fallback
                            if (video) video.style.display = 'none';
                            const fallback = document.getElementById('video-fallback');
                            if (fallback) fallback.style.display = 'block';
                            
                            setVideoLoading(false);
                            setVideoReady(false);
                          }}
                        >
                          {(() => {
                            // Use local file if available
                            let videoSrc = selectedRecording.recordingUrl;
                            
                            if (selectedRecording.localFilePath) {
                              const cleanPath = selectedRecording.localFilePath?.replace(/^\/recordings\//, '');
                              // Use the API base URL (without /api suffix) for recordings
                              const apiBaseUrl = import.meta.env.VITE_API_URL.replace('/api', '');
                              videoSrc = cleanPath ? `${apiBaseUrl}/recordings/${cleanPath}` : selectedRecording.recordingUrl;
                            }
                            
                            console.log('🎥 Video source:', videoSrc);
                            return <source src={videoSrc} type="video/mp4" />;
                          })()}
                          Your browser does not support the video tag.
                        </video>
                        
                        {/* Fallback message */}
                        <div className="text-center mt-4" style={{ display: 'none' }} id="video-fallback">
                          <p className="text-muted-foreground p-4 mb-2">
                            Your browser does not support the video tag or the video format is not supported.
                          </p>
                          <div className="space-x-2">
                            <a 
                              href={(() => {
                                if (selectedRecording.localFilePath) {
                                  const cleanPath = selectedRecording.localFilePath.replace(/^\/recordings\//, '');
                                  const apiBaseUrl = import.meta.env.VITE_API_URL.replace('/api', '');
                                  return `${apiBaseUrl}/recordings/${cleanPath}`;
                                }
                                return selectedRecording.recordingUrl;
                              })()} 
                              download 
                              className="text-primary hover:underline"
                            >
                              Download the video instead
                            </a>
                            <span>|</span>
                            <a 
                              href={(() => {
                                if (selectedRecording.localFilePath) {
                                  const cleanPath = selectedRecording.localFilePath.replace(/^\/recordings\//, '');
                                  const apiBaseUrl = import.meta.env.VITE_API_URL.replace('/api', '');
                                  return `${apiBaseUrl}/recordings/${cleanPath}`;
                                }
                                return selectedRecording.recordingUrl;
                              })()} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              Open in new tab
                            </a>
                          </div>
                        </div>
                          </div>
                          </div>
                        )}
                        
                        {/* Recording Info */}
                        <div className="mt-4 p-3 bg-muted/20 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">{selectedRecording.title}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Duration: {Math.floor(selectedRecording.duration / 60)}:{(selectedRecording.duration % 60).toString().padStart(2, '0')}</span>
                                <span>Views: {selectedRecording.viewCount}</span>
                                <span>Recorded: {new Date(selectedRecording.recordedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = selectedRecording.recordingUrl;
                                link.download = `${selectedRecording.title}.mp4`;
                                link.click();
                              }}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
        )}



        {/* Batch Tab - Admin and Instructor */}
        {(isAdmin || isInstructor) && (
          <TabsContent value="batch" className="space-y-6">
            <Card>
              <CardHeader>
                {isAdmin && (
                  <CardTitle className="flex items-center justify-between">
                    <span>Course User Management</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {enrolledStudents.length} enrolled
                      </Badge>
                      <Badge variant="secondary">
                        {allUsers.length} total users
                      </Badge>
                    </div>
                  </CardTitle>
                )}
                <CardDescription>
                  {isAdmin 
                    ? 'Manage course enrollments, search and filter users by role, status, and other criteria.'
                    : ''
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Global Search and Filters - Admin Only */}
                {isAdmin && (
                  <div className="space-y-4 mb-6 p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Search & Filters</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={clearAllFilters}
                        className="text-xs"
                      >
                        Clear All
                      </Button>
                    </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="space-y-2">
                      <Label htmlFor="search" className="text-xs">Search</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="search"
                          placeholder="Search users..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 text-sm"
                        />
                      </div>
                    </div>

                    {/* Role Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="roleFilter" className="text-xs">Role</Label>
                      <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="All Roles" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Roles</SelectItem>
                          <SelectItem value="learner">Learner</SelectItem>
                          <SelectItem value="instructor">Instructor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="statusFilter" className="text-xs">Status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Sort By */}
                    <div className="space-y-2">
                      <Label htmlFor="sortBy" className="text-xs">Sort By</Label>
                      <div className="flex gap-1">
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger className="text-sm flex-1">
                            <SelectValue placeholder="Sort by" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="name">Name</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="role">Role</SelectItem>
                            <SelectItem value="status">Status</SelectItem>
                            <SelectItem value="enrollmentDate">Enrollment Date</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                          className="px-2"
                        >
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                )}

                <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-2' : ''} gap-6`}>
                  {/* Left Column - Users in Course */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{isAdmin ? 'Enrolled Users' : 'Course Learners'}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {isAdmin ? `${filteredEnrolledStudents.length} of ${enrolledStudents.length}` : `${enrolledStudents.length} learners`}
                        </Badge>
                        {isAdmin && enrolledStudents.length > 0 && (
                          <div className="space-y-1">
                            <Label htmlFor="enrollmentFilter" className="text-xs">Enrollment Status</Label>
                            <Select value={enrollmentFilter} onValueChange={setEnrollmentFilter}>
                              <SelectTrigger className="text-xs h-8 w-32">
                                <SelectValue placeholder="All" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="dropped">Dropped</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>

                    {batchLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-sm text-muted-foreground">Loading course users...</p>
                      </div>
                    ) : (isAdmin ? filteredEnrolledStudents : enrolledStudents).length > 0 ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {(isAdmin ? filteredEnrolledStudents : enrolledStudents).map((user) => (
                          <div key={user._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium truncate">{user.name}</p>
                                  <Badge 
                                    variant={user.status === 'active' ? 'default' : 'secondary'} 
                                    className="text-xs"
                                  >
                                    {user.status || 'active'}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {user.role}
                                  </Badge>
                                  {user.enrollmentStatus && (
                                    <Badge 
                                      variant={
                                        user.enrollmentStatus === 'active' ? 'default' : 
                                        user.enrollmentStatus === 'completed' ? 'secondary' : 
                                        'destructive'
                                      } 
                                      className="text-xs"
                                    >
                                      {user.enrollmentStatus}
                                    </Badge>
                                  )}
                                  {user.enrolledAt && (
                                    <span className="text-xs text-muted-foreground">
                                      Enrolled: {new Date(user.enrolledAt).toLocaleDateString()}
                                    </span>
                                  )}
                                  {/* Show progress for instructors */}
                                  {isInstructor && user.progress && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">
                                        Progress: {user.progress.completionPercentage || 0}%
                                      </span>
                                      <Progress 
                                        value={user.progress.completionPercentage || 0} 
                                        className="w-16 h-2"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isAdmin && (
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeStudentFromCourse(user._id)}
                                  title="Remove from course"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
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

                  {/* Right Column - All Users in Database - Admin Only */}
                  {isAdmin && (
                    <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Available Users</h3>
                      <Badge variant="outline">
                        {filteredAllUsers.length} available
                      </Badge>
                    </div>

                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {filteredAllUsers.map((user) => (
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
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium truncate">{user.name}</p>
                                  <Badge 
                                    variant={user.status === 'active' ? 'default' : 'secondary'} 
                                    className="text-xs"
                                  >
                                    {user.status || 'active'}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {user.role}
                                  </Badge>
                                  {user.createdAt && (
                                    <span className="text-xs text-muted-foreground">
                                      Joined: {new Date(user.createdAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
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
                                title="Add to course"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>

                    {filteredAllUsers.length === 0 && (
                        <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            {allUsers.filter(user => !enrolledStudents.some(enrolled => enrolled._id === user._id)).length === 0 
                              ? "No users available" 
                              : "No users match the current filters"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {allUsers.filter(user => !enrolledStudents.some(enrolled => enrolled._id === user._id)).length === 0
                              ? "All users are already in this course."
                              : "Try adjusting your search or filter criteria."}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Filter Summary - Admin Only */}
                {isAdmin && (searchTerm || roleFilter !== 'all' || statusFilter !== 'all' || enrollmentFilter !== 'all') && (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Active filters:</span>
                      {searchTerm && (
                        <Badge variant="secondary" className="text-xs">
                          Search: "{searchTerm}"
                        </Badge>
                      )}
                      {roleFilter !== 'all' && (
                        <Badge variant="secondary" className="text-xs">
                          Role: {roleFilter}
                        </Badge>
                      )}
                      {statusFilter !== 'all' && (
                        <Badge variant="secondary" className="text-xs">
                          Status: {statusFilter}
                        </Badge>
                      )}
                      {enrollmentFilter !== 'all' && (
                        <Badge variant="secondary" className="text-xs">
                          Enrollment: {enrollmentFilter}
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearAllFilters}
                      className="text-xs"
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}

                {/* Bulk Actions - Admin Only */}
                {isAdmin && selectedUsers.length > 0 && (
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
                          {course?.published ? 'Published' : 'Draft'} - {course?.published ? 'Course is visible to students' : 'Course is in draft mode'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={course?.published ? "outline" : "default"}
                        onClick={async () => {
                          try {
                            const newStatus = course?.published ? 'inactive' : 'active';
                            const actionText = course?.published ? 'unpublished' : 'published';
                            
                            await adminService.updateCourseStatus(courseId!, newStatus);
                            
                            // Update local state immediately for better UX
                            setCourse(prevCourse => {
                              if (!prevCourse) return null;
                              return {
                                ...prevCourse,
                                published: !prevCourse.published
                              };
                            });
                            
                            toast({
                              title: "Success",
                              description: `Course ${actionText} successfully.`,
                            });
                            
                            // Refresh course data in background to ensure consistency
                            try {
                              const response = await adminService.getCourseById(courseId!);
                              // Convert Course to CourseDetail format
                              const courseData = response.data as any;
                              setCourse({
                                ...courseData,
                                instructor: courseData.instructorId ? {
                                  name: courseData.instructorId.name,
                                  email: courseData.instructorId.email
                                } : { name: 'Unknown Instructor' },
                                category: courseData.categoryId ? {
                                  name: courseData.categoryId.name
                                } : { name: 'Uncategorized' }
                              } as CourseDetail);
                            } catch (refreshError) {
                              console.error('Error refreshing course data:', refreshError);
                              // Don't show error to user since the main action succeeded
                            }
                          } catch (error: any) {
                            console.error('Error updating course status:', error);
                            let errorMessage = "Failed to update course status. Please try again.";
                            
                            if (error.response?.status === 404) {
                              errorMessage = "Course not found. Please refresh the page and try again.";
                            } else if (error.response?.status === 403) {
                              errorMessage = "You don't have permission to update this course status.";
                            } else if (error.response?.status === 400) {
                              errorMessage = error.response.data?.message || "Invalid request. Please try again.";
                            } else if (error.response?.status === 500) {
                              errorMessage = "Server error occurred. Please try again later.";
                            } else if (error.response?.data?.message) {
                              errorMessage = error.response.data.message;
                            } else if (error.message) {
                              errorMessage = error.message;
                            }
                            
                            toast({
                              title: "Error",
                              description: errorMessage,
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        {course?.published ? 'Unpublish' : 'Publish'} Course
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
                          onClick={handleDeleteCourse}
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
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="assessmentFiles" className="text-right">
                    Attachments
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="assessmentFiles"
                      type="file"
                      multiple
                      accept="*/*"
                      onChange={(e) => setAssessmentFiles(e.target.files)}
                      className="mb-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload files for this assessment (any size, any format)
                    </p>
                    {assessmentFiles && assessmentFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {Array.from(assessmentFiles).map((file, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <Paperclip className="h-3 w-3 text-muted-foreground" />
                            <span>{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        setSelectedFiles(files);
                        console.log('Material file selected:', files[0]);
                      }
                    }}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                      Select a file to upload. image,video,documents and SCROM packages file types are accepted.
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
                  Select one or more files to upload. image, video, documents and SCROM packages file types are accepted.
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

              if (!selectedModuleId) {
                toast({
                  title: "Error",
                  description: "Module ID is missing. Please try again.",
                  variant: "destructive",
                });
                return;
              }

              try {
                setIsSubmitting(true);

                console.log('File upload debug info:', {
                  courseId,
                  selectedModuleId,
                  selectedLessonId,
                  isAdmin,
                  isInstructor
                });

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

                    console.log('Uploading to new lesson:', {
                      courseId,
                      moduleId: selectedModuleId,
                      lessonId: newLessonId,
                      fileName: file.name
                    });

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

                    console.log('Uploading to existing lesson:', {
                      courseId,
                      moduleId: selectedModuleId,
                      lessonId: selectedLessonId,
                      fileName: file.name
                    });

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

      {/* Delete Lesson Confirmation Dialog */}
      <AlertDialog open={!!deleteLessonId} onOpenChange={(open) => !open && setDeleteLessonId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lesson? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteLesson} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Material Confirmation Dialog */}
      <AlertDialog open={!!deleteMaterialId} onOpenChange={(open) => !open && setDeleteMaterialId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Material</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this material? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMaterial} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Delete Course Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteCourseModal}
        onClose={() => setShowDeleteCourseModal(false)}
        onConfirm={confirmDeleteCourse}
        title="Delete Course"
        description="Are you sure you want to delete this course? This action cannot be undone and will permanently remove all course content, materials, sessions, and student data."
        confirmText="Delete Course"
        cancelText="Cancel"
        variant="destructive"
        isLoading={isDeletingCourse}
      />

      {/* Assessment Details Modal */}
      <Dialog open={showAssessmentModal} onOpenChange={setShowAssessmentModal}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>{selectedAssessment?.title}</DialogTitle>
            <DialogDescription>
              {selectedAssessment?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAssessment && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <p className="text-sm text-muted-foreground capitalize">{selectedAssessment.type}</p>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedAssessment.dueDate).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label>Total Points</Label>
                  <p className="text-sm text-muted-foreground">{selectedAssessment.totalPoints}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedAssessment.isPublished ? 'Published' : 'Draft'}
                  </p>
                </div>
              </div>
            )}
            
            {selectedAssessment?.instructions && (
              <div>
                <Label>Instructions</Label>
                <p className="text-sm text-muted-foreground mt-1">{selectedAssessment.instructions}</p>
              </div>
            )}

            {/* Assessment Attachments */}
            {selectedAssessment?.attachments && selectedAssessment.attachments.length > 0 && (
              <div>
                <Label>Attachments ({selectedAssessment.attachments.length})</Label>
                <div className="space-y-2 mt-2">
                  {selectedAssessment.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{attachment.originalName}</p>
                          <p className="text-xs text-muted-foreground">
                            {(attachment.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadAttachment(attachment)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show submissions for instructors/admins */}
            {(isInstructor || isAdmin) && assessmentSubmissions.length > 0 && (
              <div>
                <Label>Submissions ({assessmentSubmissions.length})</Label>
                <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                  {assessmentSubmissions.map((submission) => (
                    <div key={submission._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{submission.student.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Submitted: {new Date(submission.submittedAt).toLocaleString()}
                        </p>
                        {submission.isLate && (
                          <Badge variant="destructive" className="text-xs">Late</Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {submission.status === 'graded' ? (
                          <Badge variant="default">
                            {submission.score}/{submission.maxScore}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openGradingModal(submission)}
                        >
                          {submission.status === 'graded' ? 'Regrade' : 'Grade'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assessment Submission Modal */}
      <Dialog open={showSubmissionModal} onOpenChange={setShowSubmissionModal}>
        <DialogContent className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle>
              {selectedAssessment?.submission ? 'Resubmit Assessment' : 'Submit Assessment'}: {selectedAssessment?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedAssessment?.submission 
                ? 'Update your submission by uploading new files or providing new content. This will replace your previous submission.'
                : 'Upload your files or provide text content for this assessment. You can download instructor attachments below.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Assessment Attachments */}
            {selectedAssessment?.attachments && selectedAssessment.attachments.length > 0 && (
              <div>
                <Label>Assessment Attachments</Label>
                <div className="space-y-2 mt-2">
                  {selectedAssessment.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <div className="flex items-center space-x-2">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{attachment.originalName}</p>
                          <p className="text-xs text-muted-foreground">
                            {(attachment.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadAttachment(attachment)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="submissionFiles">Upload Your Files (Any size, any format)</Label>
              <Input
                id="submissionFiles"
                type="file"
                multiple
                accept="*/*"
                onChange={(e) => setSubmissionFiles(e.target.files)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                You can upload multiple files of any size and format. No restrictions on file type or size.
              </p>
            </div>
            
            <div>
              <Label htmlFor="submissionContent">Text Content (Optional)</Label>
              <Textarea
                id="submissionContent"
                value={submissionContent}
                onChange={(e) => setSubmissionContent(e.target.value)}
                placeholder="Enter your response or additional notes here..."
                rows={6}
                className="mt-1"
              />
            </div>

            {selectedAssessment && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm">
                  <strong>Due Date:</strong> {new Date(selectedAssessment.dueDate).toLocaleString()}
                </p>
                <p className="text-sm">
                  <strong>Total Points:</strong> {selectedAssessment.totalPoints}
                </p>
                {selectedAssessment.instructions && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">Instructions:</p>
                    <p className="text-sm text-muted-foreground">{selectedAssessment.instructions}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowSubmissionModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitAssessment}
              disabled={isSubmittingAssessment || (!submissionFiles && !submissionContent.trim())}
            >
              {isSubmittingAssessment 
                ? (selectedAssessment?.submission ? 'Resubmitting...' : 'Submitting...') 
                : (selectedAssessment?.submission ? 'Resubmit Assessment' : 'Submit Assessment')
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assessment Grading Modal */}
      <Dialog open={showGradingModal} onOpenChange={setShowGradingModal}>
        <DialogContent className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle>Grade Assessment Submission</DialogTitle>
            <DialogDescription>
              Grade the submission for {selectedSubmission?.student?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedSubmission && (
              <>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm">
                    <strong>Student:</strong> {selectedSubmission.student?.name || 'Unknown Student'}
                  </p>
                  <p className="text-sm">
                    <strong>Submitted:</strong> {new Date(selectedSubmission.submittedAt).toLocaleString()}
                  </p>
                  {selectedSubmission.isLate && (
                    <Badge variant="destructive" className="text-xs">Late Submission</Badge>
                  )}
                </div>

                {selectedSubmission.files && selectedSubmission.files.length > 0 && (
                  <div>
                    <Label>Submitted Files</Label>
                    <div className="space-y-2 mt-1">
                      {selectedSubmission.files.map((file: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm">{file.originalName}</span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              try {
                                // Create download link
                                const link = document.createElement('a');
                                link.href = file.url;
                                link.download = file.originalName;
                                link.target = '_blank';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                
                                toast({
                                  title: "Download Started",
                                  description: `Downloading ${file.originalName}`,
                                });
                              } catch (error) {
                                console.error('Error downloading file:', error);
                                toast({
                                  title: "Download Failed",
                                  description: `Failed to download ${file.originalName}`,
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSubmission.content && (
                  <div>
                    <Label>Text Content</Label>
                    <div className="p-3 border rounded-lg mt-1">
                      <p className="text-sm whitespace-pre-wrap">{selectedSubmission.content}</p>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="gradingScore">Score (out of {selectedAssessment?.totalPoints || 100})</Label>
                  <Input
                    id="gradingScore"
                    type="number"
                    min="0"
                    max={selectedAssessment?.totalPoints || 100}
                    value={gradingScore}
                    onChange={(e) => setGradingScore(parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="gradingFeedback">Feedback (Optional)</Label>
                  <Textarea
                    id="gradingFeedback"
                    value={gradingFeedback}
                    onChange={(e) => setGradingFeedback(e.target.value)}
                    placeholder="Provide feedback for the student..."
                    rows={4}
                    className="mt-1"
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowGradingModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleGradeSubmission}>
              Submit Grade
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Submission Modal */}
      <Dialog open={showViewSubmissionModal} onOpenChange={setShowViewSubmissionModal}>
        <DialogContent className="max-w-6xl w-full h-[80vh]">
          <DialogHeader>
            <DialogTitle>Assessment: {selectedAssessment?.title}</DialogTitle>
            <DialogDescription>
              View assessment details and your submission side by side.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-6 h-full overflow-hidden">
            {/* Left Column - Assessment Details */}
            <div className="flex-1 space-y-4 overflow-y-auto">
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Assessment Details
                </h3>
              </div>
              
              {/* Assessment Info */}
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="text-sm mt-1">{selectedAssessment?.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                      <p className="text-sm mt-1">
                        {selectedAssessment?.dueDate ? new Date(selectedAssessment.dueDate).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Points</p>
                      <p className="text-sm mt-1">{selectedAssessment?.totalPoints || 0}</p>
                    </div>
                  </div>
                  
                  {selectedAssessment?.instructions && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Instructions</p>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{selectedAssessment.instructions}</p>
                    </div>
                  )}
                </div>

                {/* Instructor Attachments */}
                {selectedAssessment?.attachments && selectedAssessment.attachments.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold mb-3 flex items-center">
                      <Paperclip className="h-4 w-4 mr-2" />
                      Instructor Attachments ({selectedAssessment.attachments.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedAssessment.attachments.map((attachment: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{attachment.originalName}</p>
                              <p className="text-xs text-muted-foreground">
                                {(attachment.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadAttachment(attachment)}
                            className="flex-shrink-0"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Learner Submission */}
            <div className="flex-1 space-y-4 overflow-y-auto border-l pl-6">
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  My Submission
                </h3>
              </div>
              
              {selectedSubmission ? (
                <div className="space-y-4">
                  {/* Submission Status */}
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium">Submission Status</p>
                        <p className="text-sm text-muted-foreground">
                          Submitted on {new Date(selectedSubmission.submittedAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge 
                        variant={selectedSubmission.status === 'graded' ? 'default' : 'secondary'}
                      >
                        {selectedSubmission.status === 'graded' ? 'Graded' : 'Pending Review'}
                      </Badge>
                    </div>
                    
                    {selectedSubmission.status === 'graded' && (
                      <div className="p-3 bg-background rounded border">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">Score</p>
                          <p className="text-sm font-bold">
                            {selectedSubmission.score}/{selectedAssessment.totalPoints}
                          </p>
                        </div>
                        {selectedSubmission.feedback && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Instructor Feedback</p>
                            <p className="text-sm whitespace-pre-wrap">{selectedSubmission.feedback}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Submitted Files */}
                  {selectedSubmission.files && selectedSubmission.files.length > 0 && (
                    <div>
                      <h4 className="text-md font-semibold mb-3 flex items-center">
                        <Paperclip className="h-4 w-4 mr-2" />
                        Submitted Files ({selectedSubmission.files.length})
                      </h4>
                      <div className="space-y-2">
                        {selectedSubmission.files.map((file: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{file.originalName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/courses/${courseId}/assessments/${selectedAssessment._id}/submissions/${selectedSubmission._id}/files/${file.filename}`, {
                                    headers: {
                                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                                    }
                                  });
                                  
                                  if (!response.ok) {
                                    throw new Error('Failed to download file');
                                  }
                                  
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = file.originalName;
                                  document.body.appendChild(link);
                                  link.click();
                                  window.URL.revokeObjectURL(url);
                                  document.body.removeChild(link);
                                } catch (error) {
                                  console.error('Error downloading file:', error);
                                  toast({
                                    title: "Error",
                                    description: "Failed to download file",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              className="flex-shrink-0"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submitted Content */}
                  {selectedSubmission.content && (
                    <div>
                      <h4 className="text-md font-semibold mb-3 flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Text Content
                      </h4>
                      <div className="p-3 border rounded-lg bg-muted/30">
                        <p className="text-sm whitespace-pre-wrap">{selectedSubmission.content}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No submission found</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowViewSubmissionModal(false)}>
              Close
            </Button>
            {/* Show resubmit button only if not graded and before due date */}
            {selectedSubmission && 
             selectedSubmission.status !== 'graded' && 
             new Date(selectedAssessment.dueDate) > new Date() && (
              <Button onClick={() => {
                setShowViewSubmissionModal(false);
                openSubmissionModal(selectedAssessment);
              }}>
                Resubmit
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default UnifiedCourseDetail;
