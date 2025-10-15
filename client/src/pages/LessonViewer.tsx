import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  FileText,
  Download,
  CheckCircle,
  Clock,
  BookOpen,
  StickyNote,
  ZoomIn,
  ZoomOut,
  RotateCw
} from "lucide-react";
// import { Document, Page, pdfjs } from 'react-pdf';
import courseService from "@/services/courseService";
import instructorService from "@/services/instructorService";
import adminService from "@/services/adminService";

// Use a simple worker setup to avoid CORS issues
// pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface LessonFile {
  _id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

interface Lesson {
  _id: string;
  title: string;
  description: string;
  order: number;
  isPublished: boolean;
  files?: LessonFile[];
}

interface Module {
  _id: string;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
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
  modules?: Module[];
}

const LessonViewer = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'learning' | 'notes'>('learning');
  const [navHeight, setNavHeight] = useState(0);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [pdfError, setPdfError] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  const isInstructor = user?.role === 'instructor';
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const fetchCourseAndLesson = async () => {
      if (!courseId) return;
      
      try {
        setLoading(true);
        let response;
        
        // Try different services based on user role
        try {
          if (isAdmin) {
            response = await adminService.getCourseById(courseId);
          } else if (isInstructor) {
            response = await instructorService.getCourseDetail(courseId);
          } else {
            response = await courseService.getCourseDetail(courseId);
          }
        } catch (error: any) {
          // If the user is not enrolled, try to get basic course info
          if (error.response?.status === 403 && error.response?.data?.message?.includes('not enrolled')) {
            // For non-enrolled users, try to get public course info
            try {
              response = await courseService.getCourse(courseId);
            } catch (publicError) {
              console.error('Error fetching public course info:', publicError);
              throw error; // Re-throw the original error
            }
          } else {
            throw error;
          }
        }
        
        setCourse(response.data.course || response.data);
        
        // Find the current lesson
        const courseData = response.data.course || response.data;
        const lesson = courseData.modules
          ?.flatMap(m => m.lessons)
          ?.find(l => l._id === lessonId);
        
        if (lesson) {
          setCurrentLesson(lesson);
          resetPdfControls();
        } else {
          // If lesson not found, navigate to first lesson
          const firstLesson = courseData.modules?.[0]?.lessons?.[0];
          if (firstLesson) {
            navigate(`/courses/${courseId}/lessons/${firstLesson._id}`);
          }
        }
              } catch (error: any) {
          console.error('Error fetching course detail:', error);
          // Show error message to user
          if (error.response?.status === 403) {
            // Handle enrollment error
            setAccessError(error.response?.data?.message || 'You do not have access to this course');
          } else {
            setAccessError('Failed to load course. Please try again.');
          }
        } finally {
        setLoading(false);
      }
    };

    fetchCourseAndLesson();
  }, [courseId, lessonId, isInstructor, isAdmin, navigate]);

  // Load notes when lesson or user changes
  useEffect(() => {
    loadNotesFromStorage();
  }, [courseId, lessonId, user?.id]);

  // Handle PDF loading when file changes
  useEffect(() => {
    const currentFile = currentLesson?.files?.[currentFileIndex];
    if (currentFile?.type.startsWith('application/pdf')) {
      handlePdfLoad();
    }
  }, [currentFileIndex, currentLesson]);

  // Measure navbar height and disable body scroll on this page
  useEffect(() => {
    const measure = () => {
      const nav = document.querySelector('nav') as HTMLElement | null;
      setNavHeight(nav?.offsetHeight ?? 0);
    };
    measure();
    window.addEventListener('resize', measure);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('resize', measure);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const getCurrentLessonIndex = () => {
    if (!course?.modules || !currentLesson) return { moduleIndex: -1, lessonIndex: -1 };
    
    for (let moduleIndex = 0; moduleIndex < course.modules.length; moduleIndex++) {
      const module = course.modules[moduleIndex];
      const lessonIndex = module.lessons.findIndex(l => l._id === currentLesson._id);
      if (lessonIndex !== -1) {
        return { moduleIndex, lessonIndex };
      }
    }
    return { moduleIndex: -1, lessonIndex: -1 };
  };

  const getPreviousLesson = () => {
    const { moduleIndex, lessonIndex } = getCurrentLessonIndex();
    if (moduleIndex === -1 || lessonIndex === -1) return null;
    
    const currentModule = course?.modules?.[moduleIndex];
    if (lessonIndex > 0) {
      return currentModule?.lessons[lessonIndex - 1];
    } else if (moduleIndex > 0) {
      const prevModule = course?.modules?.[moduleIndex - 1];
      return prevModule?.lessons[prevModule.lessons.length - 1];
    }
    return null;
  };

  const getNextLesson = () => {
    const { moduleIndex, lessonIndex } = getCurrentLessonIndex();
    if (moduleIndex === -1 || lessonIndex === -1) return null;
    
    const currentModule = course?.modules?.[moduleIndex];
    if (lessonIndex < (currentModule?.lessons.length || 0) - 1) {
      return currentModule?.lessons[lessonIndex + 1];
    } else if (moduleIndex < (course?.modules?.length || 0) - 1) {
      const nextModule = course?.modules?.[moduleIndex + 1];
      return nextModule?.lessons[0];
    }
    return null;
  };

  const navigateToLesson = (lesson: Lesson) => {
    navigate(`/courses/${courseId}/lessons/${lesson._id}`);
  };

  // Reset PDF controls when switching files
  const resetPdfControls = () => {
    setPageNumber(1);
    setScale(1.0);
    setRotation(0);
    setNumPages(null);
    setPdfError(false);
    setPdfLoading(false);
  };

  // Handle PDF loading without automatic timeout
  const handlePdfLoad = () => {
    setPdfLoading(true);
    setPdfError(false);
  };

  const navigateToPrevious = () => {
    const prevLesson = getPreviousLesson();
    if (prevLesson) {
      navigateToLesson(prevLesson);
    }
  };

  const navigateToNext = () => {
    const nextLesson = getNextLesson();
    if (nextLesson) {
      navigateToLesson(nextLesson);
    }
  };

  // Auto-save notes to localStorage
  const saveNotesToStorage = (newNotes: string) => {
    if (courseId && lessonId && user?.id) {
      const key = `notes_${user.id}_${courseId}_${lessonId}`;
      localStorage.setItem(key, newNotes);
    }
  };

  // Load notes from localStorage
  const loadNotesFromStorage = () => {
    if (courseId && lessonId && user?.id) {
      const key = `notes_${user.id}_${courseId}_${lessonId}`;
      const savedNotes = localStorage.getItem(key);
      if (savedNotes) {
        setNotes(savedNotes);
      }
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('video/')) return <Play className="h-4 w-4" />;
    if (fileType.startsWith('image/')) return <FileText className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-6">{accessError}</p>
          <div className="space-y-2">
            <Button onClick={() => navigate('/courses')} className="w-full">
              Browse Courses
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!course || !currentLesson) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Lesson Not Found</h2>
          <p className="text-muted-foreground mb-4">The lesson you're looking for doesn't exist.</p>
          <Button onClick={() => navigate(`/courses/${courseId}`)}>
            Back to Course
          </Button>
        </div>
      </div>
    );
  }

  const currentFile = currentLesson.files?.[currentFileIndex];
  const progress = 25; // Mock progress - in real app, this would come from user progress

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex flex-col overflow-hidden" style={{ height: `calc(100vh - ${navHeight}px)` }}>
      {/* Main Content Area - No page scroll, only sidebar scrolls */}
      <div className="h-full grid grid-cols-1 lg:grid-cols-7 gap-0">
          {/* Main Content Column */}
          <div className="lg:col-span-5 order-1 lg:order-1 overflow-hidden">
            <div className="h-full">
              <Card className="h-full border-0 rounded-none">
                <CardContent className="p-4 lg:p-6 h-full flex flex-col">
                  {/* Header inside main content */}
                  <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur py-3 -mx-6 px-6 mb-6">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <div 
                            className="flex items-center gap-5 cursor-pointer" 
                            onClick={() => navigate(`/courses/${courseId}`)}
                          >
                            <ChevronLeft className="h-6 w-6 font-bold" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h1 className="text-lg font-semibold truncate">{course.title}</h1>
                            <p className="text-sm text-muted-foreground truncate">{currentLesson.title}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={navigateToPrevious}
                          disabled={!getPreviousLesson()}
                          className="flex items-center gap-2"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="hidden sm:inline">Previous</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={navigateToNext}
                          disabled={!getNextLesson()}
                          className="flex items-center gap-2"
                        >
                          <span className="hidden sm:inline">Next</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Lesson Content */}
                  <div className="flex-1 overflow-hidden space-y-6 pb-6">
                    {/* File Content */}
                    {currentLesson.files && currentLesson.files.length > 0 ? (
                      <div className="space-y-4">
                        {/* File Navigation */}
                        {currentLesson.files.length > 1 && (
                          <div className="flex flex-wrap items-center gap-2">
                            {currentLesson.files.map((file, index) => (
                              <Button
                                key={file._id}
                                variant={index === currentFileIndex ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  setCurrentFileIndex(index);
                                  resetPdfControls();
                                }}
                                className="flex items-center gap-2"
                              >
                                {getFileIcon(file.type)}
                                <span className="max-w-[120px] truncate">{file.name}</span>
                              </Button>
                            ))}
                          </div>
                        )}

                        {/* File Display */}
                        {currentFile && (
                          <div className="space-y-4">
                            {/* File Preview */}
                            <div className="rounded-lg border bg-muted/10 p-4">
                              {currentFile.type.startsWith('video/') ? (
                                <div className="relative">
                                  <video
                                    controls
                                    className="w-full h-auto max-h-[70vh] rounded-lg shadow-sm"
                                    preload="metadata"
                                    onError={(e) => {
                                      console.error('Video error:', e);
                                      const video = e.target as HTMLVideoElement;
                                      console.error('Video error details:', video.error);
                                      video.style.display = 'none';
                                      const fallback = document.getElementById('video-fallback');
                                      if (fallback) fallback.style.display = 'block';
                                    }}
                                  >
                                    <source src={`${import.meta.env.VITE_API_URL.replace('/api', '')}${currentFile.url}`} type={currentFile.type} />
                                    Your browser does not support the video tag.
                                  </video>
                                  <div className="hidden text-center py-8" id="video-fallback">
                                    <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">Video could not be loaded</p>
                                    <Button 
                                      variant="outline" 
                                      className="mt-2"
                                      onClick={() => window.open(`${import.meta.env.VITE_API_URL.replace('/api', '')}${currentFile.url}`, '_blank')}
                                    >
                                      Open Video
                                    </Button>
                                  </div>
                                </div>
                              ) : currentFile.type.startsWith('image/') ? (
                                <div className="text-center">
                                  <img
                                    src={`${import.meta.env.VITE_API_URL.replace('/api', '')}${currentFile.url}`}
                                    alt={currentFile.name}
                                    className="max-w-full h-auto max-h-[70vh] rounded mx-auto shadow-sm"
                                                                       onError={(e) => {
                                     const target = e.target as HTMLImageElement;
                                     target.style.display = 'none';
                                     const nextElement = target.nextElementSibling as HTMLElement;
                                     if (nextElement) nextElement.style.display = 'block';
                                   }}
                                  />
                                  <div className="hidden text-center py-8">
                                    <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">Image could not be loaded</p>
                                    <Button 
                                      variant="outline" 
                                      className="mt-2"
                                      onClick={() => window.open(`${import.meta.env.VITE_API_URL.replace('/api', '')}${currentFile.url}`, '_blank')}
                                    >
                                      Open Image
                                    </Button>
                                  </div>
                                </div>
                                                             ) : currentFile.type.startsWith('application/pdf') ? (
                                 <div className="space-y-4">
                                   {pdfError ? (
                                     // Fallback when PDF fails to load
                                     <div className="text-center py-12 bg-muted/10 rounded-lg border">
                                       <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                                       <p className="text-muted-foreground mb-2">PDF preview not available</p>
                                       <p className="text-xs text-muted-foreground mb-4">{currentFile.name}</p>
                                       <div className="flex gap-2 justify-center">
                                         <Button 
                                           variant="outline"
                                           onClick={() => window.open(`${import.meta.env.VITE_API_URL.replace('/api', '')}${currentFile.url}`, '_blank')}
                                         >
                                           <Download className="h-4 w-4 mr-2" />
                                           Open PDF
                                         </Button>
                                         <Button 
                                           variant="outline"
                                           onClick={() => {
                                             setPdfError(false);
                                             setNumPages(null);
                                           }}
                                         >
                                           Retry
                                         </Button>
                                       </div>
                                     </div>
                                   ) : (
                                     <>
                                       {/* PDF Controls */}
                                       <div className="flex items-center justify-between bg-muted/20  rounded-lg">
                                         <div className="flex items-center gap-2">
                                           <Button
                                             variant="outline"
                                             size="sm"
                                             onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                                             disabled={pageNumber <= 1}
                                           >
                                             Previous
                                           </Button>
                                           <span className="text-sm">
                                             Page {pageNumber} of {numPages || '?'}
                                           </span>
                                           <Button
                                             variant="outline"
                                             size="sm"
                                             onClick={() => setPageNumber(Math.min(numPages || 1, pageNumber + 1))}
                                             disabled={pageNumber >= (numPages || 1)}
                                           >
                                             Next
                                           </Button>
                                         </div>
                                         <div className="flex items-center gap-2">
                                           <Button
                                             variant="outline"
                                             size="sm"
                                             onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                                             disabled={scale <= 0.5}
                                           >
                                             <ZoomOut className="h-4 w-4" />
                                           </Button>
                                           <span className="text-sm min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
                                           <Button
                                             variant="outline"
                                             size="sm"
                                             onClick={() => setScale(Math.min(3, scale + 0.1))}
                                             disabled={scale >= 3}
                                           >
                                             <ZoomIn className="h-4 w-4" />
                                           </Button>
                                           <Button
                                             variant="outline"
                                             size="sm"
                                             onClick={() => setRotation((rotation + 90) % 360)}
                                           >
                                             <RotateCw className="h-4 w-4" />
                                           </Button>
                                         </div>
                                       </div>
                                       
                                                                                                                       {/* PDF Viewer - Embedded iframe */}
                                        <div className="flex justify-center bg-white rounded-lg border overflow-hidden max-h-[70vh]">
                                          {pdfError ? (
                                            <div className="flex flex-col items-center justify-center p-8 w-full">
                                              <div className="text-center mb-6">
                                                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                                                <h3 className="text-lg font-medium mb-2">PDF preview not available</h3>
                                                <p className="text-sm text-muted-foreground mb-4">{currentFile.name}</p>
                                              </div>
                                              
                                              <div className="flex gap-3">
                                                <Button 
                                                  onClick={() => window.open(`${import.meta.env.VITE_API_URL.replace('/api', '')}${currentFile.url}`, '_blank')}
                                                  className="flex items-center gap-2"
                                                >
                                                  <Download className="h-4 w-4" />
                                                  Open PDF
                                                </Button>
                                                
                                                <Button 
                                                  variant="outline"
                                                  onClick={() => {
                                                    setPdfError(false);
                                                    setPdfLoading(true);
                                                  }}
                                                  className="flex items-center gap-2"
                                                >
                                                  Retry
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <iframe
                                              src={`${import.meta.env.VITE_API_URL.replace('/api', '')}${currentFile.url}`}
                                              className="w-full h-[70vh] border-0"
                                              title={currentFile.name}
                                              onLoad={() => {
                                                setPdfLoading(false);
                                                setPdfError(false);
                                              }}
                                              onError={() => {
                                                setPdfError(true);
                                                setPdfLoading(false);
                                              }}
                                            />
                                          )}
                                        </div>
                                     </>
                                   )}
                                 </div>
                              ) : (
                                <div className="text-center py-12">
                                  <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                                  <p className="text-muted-foreground mb-2">Document preview not available</p>
                                  <p className="text-xs text-muted-foreground mb-4">{currentFile.name}</p>
                                  <Button 
                                    variant="outline"
                                    onClick={() => window.open(`${import.meta.env.VITE_API_URL.replace('/api', '')}${currentFile.url}`, '_blank')}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Open Document
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-16 border rounded-lg bg-muted/10">
                        <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No content files available</h3>
                        <p className="text-muted-foreground mb-4">This lesson doesn't have any files yet.</p>
                        {isInstructor && (
                          <Button onClick={() => navigate(`/courses/${courseId}`)}>
                            Add Content
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Learning/Notes Sidebar */}
          <div className="lg:col-span-2 order-2 lg:order-2 border-l overflow-hidden">
            <div className="h-full flex flex-col">
              <Card className="h-full border-0 rounded-none">
                <CardContent className="p-4 h-full flex flex-col overflow-hidden">
                  {/* Navigation Icons */}
                  <div className="flex-shrink-0 mb-4">
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={() => setActiveTab('learning')}
                        className={`flex-1 p-2 rounded-lg border transition-all duration-200 flex items-center justify-center ${
                          activeTab === 'learning'
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-border hover:bg-muted'
                        }`}
                        title="Progress"
                      >
                        <span className={`text-sm font-medium ${
                          activeTab === 'learning' ? 'text-primary' : 'text-muted-foreground'
                        }`}>
                          Learning
                        </span>
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('notes')}
                        className={`flex-1 p-2 rounded-lg border transition-all duration-200 flex items-center justify-center ${
                          activeTab === 'notes'
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-border hover:bg-muted'
                        }`}
                        title="My Notes"
                      >
                        <span className={`text-sm font-medium ${
                          activeTab === 'notes' ? 'text-primary' : 'text-muted-foreground'
                        }`}>
                          Notes
                        </span>
                      </button>
                    </div>
                  </div>

                  {activeTab === 'learning' ? (
                    <div className="flex flex-col flex-1 min-h-0">


                      {/* Progress */}
                      <div className="flex-shrink-0 mb-4 p-3 bg-muted/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium">Progress</span>
                          <span className="text-xs text-muted-foreground">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      {/* Course Modules and Lessons - Scrollable */}
                      <div className="flex-1 overflow-y-auto min-h-0 pr-2 -mr-2">
                        <div className="space-y-3">
                          {course.modules?.map((module) => (
                            <div key={module._id} className="space-y-2">
                              <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wide sticky top-0 bg-background py-1">
                                {module.title}
                              </h4>
                              <div className="space-y-1">
                                {module.lessons.map((lesson) => {
                                  const isCurrentLesson = lesson._id === currentLesson._id;
                                  const isCompleted = false; // Mock - in real app, this would come from user progress
                                  
                                  return (
                                    <button
                                      key={lesson._id}
                                      onClick={() => navigateToLesson(lesson)}
                                      className={`w-full text-left p-2 rounded-md border transition-all duration-200 ${
                                        isCurrentLesson
                                          ? 'border-green-500 bg-green-50 dark:bg-green-950 shadow-sm'
                                          : 'border-border hover:bg-muted hover:border-muted-foreground/20'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start gap-2 min-w-0 flex-1">
                                          <div className="flex-shrink-0 mt-0.5">
                                            {isCompleted ? (
                                              <CheckCircle className="h-3 w-3 text-green-600" />
                                            ) : (
                                              <Play className="h-3 w-3 text-muted-foreground" />
                                            )}
                                          </div>
                                          <span className={`text-xs leading-tight ${
                                            isCurrentLesson ? 'font-medium' : ''
                                          }`}>
                                            {lesson.title}
                                          </span>
                                        </div>
                                        {isCurrentLesson && (
                                          <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-1"></div>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col flex-1 min-h-0">

                      <div className="flex-1 flex flex-col min-h-0">
                        <Textarea
                          placeholder="Take notes while learning..."
                          value={notes}
                          onChange={(e) => {
                            const newNotes = e.target.value;
                            setNotes(newNotes);
                            saveNotesToStorage(newNotes);
                          }}
                          className="flex-1 min-h-0 text-xs resize-none border-muted-foreground focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-muted-foreground"
                        />
                        <div className="flex justify-between items-center mt-3 pt-3 border-t flex-shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {notes.length} characters • Auto-saved
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      </div>
    );
  };

export default LessonViewer;