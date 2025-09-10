import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2 } from "lucide-react";

import courseService from "@/services/courseService";
import instructorService from "@/services/instructorService";
import adminService from "@/services/adminService";


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
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    shortDescription: '',
    categoryId: '',
    instructorId: '',
    courseCode: '',
    priceCredits: 0,
    difficulty: 'beginner',
    duration: 0,
    language: 'en',
    tags: [],
    requirements: [],
    learningOutcomes: [],
    thumbnail: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800' // Default thumbnail
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Validation functions
  const validateField = (field: string, value: any): string => {
    switch (field) {
      case 'title':
        if (!value || value.trim().length === 0) {
          return 'Course title is required';
        }
        if (value.trim().length < 3) {
          return 'Course title must be at least 3 characters long';
        }
        if (value.trim().length > 100) {
          return 'Course title must be less than 100 characters';
        }
        return '';

      case 'description':
        if (!value || value.trim().length === 0) {
          return 'Course description is required';
        }
        if (value.trim().length < 10) {
          return 'Course description must be at least 10 characters long';
        }
        if (value.trim().length > 2000) {
          return 'Course description must be less than 2000 characters';
        }
        return '';

      case 'shortDescription':
        if (!value || value.trim().length === 0) {
          return 'Short description is required';
        }
        if (value.trim().length < 10) {
          return 'Short description must be at least 10 characters long';
        }
        if (value.trim().length > 200) {
          return 'Short description must be less than 200 characters';
        }
        return '';

      case 'categoryId':
        if (!value || value.trim().length === 0) {
          return 'Please select a category';
        }
        return '';

      case 'instructorId':
        if (user?.role === 'admin' && (!value || value.trim().length === 0)) {
          return 'Please select an instructor';
        }
        return '';

      case 'courseCode':
        if (value && value.trim().length > 0) {
          if (value.trim().length < 2) {
            return 'Course code must be at least 2 characters long';
          }
          if (value.trim().length > 20) {
            return 'Course code must be less than 20 characters';
          }
          if (!/^[A-Za-z0-9\s-]+$/.test(value.trim())) {
            return 'Course code can only contain letters, numbers, spaces, and hyphens';
          }
        }
        return '';

      case 'duration':
        if (!value || value < 1) {
          return 'Duration must be at least 1 minute';
        }
        if (value > 10080) { // 7 days in minutes
          return 'Duration cannot exceed 7 days (10,080 minutes)';
        }
        return '';

      case 'priceCredits':
        if (value < 0) {
          return 'Price cannot be negative';
        }
        if (value > 10000) {
          return 'Price cannot exceed 10,000 credits';
        }
        return '';

      default:
        return '';
    }
  };

  const validateForm = (): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    
    // Validate all required fields
    const requiredFields = ['title', 'description', 'shortDescription', 'categoryId', 'duration'];
    if (user?.role === 'admin') {
      requiredFields.push('instructorId');
    }

    requiredFields.forEach(field => {
      const error = validateField(field, formData[field as keyof typeof formData]);
      if (error) {
        errors[field] = error;
      }
    });

    // Validate optional fields that have values
    const optionalFields = ['courseCode', 'priceCredits'];
    optionalFields.forEach(field => {
      const value = formData[field as keyof typeof formData];
      if (value !== '' && value !== 0) {
        const error = validateField(field, value);
        if (error) {
          errors[field] = error;
        }
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };

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
    
    // Different color schemes for different user roles
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

    const adminColors = [
      'bg-red-500',       // Red
      'bg-amber-500',     // Amber
      'bg-lime-500',      // Lime
      'bg-sky-500',       // Sky
      'bg-blue-600',      // Dark Blue
      'bg-green-600'      // Dark Green
    ];
    
    if (user?.role === 'admin') {
      return adminColors[colorIndex];
    } else if (user?.role === 'instructor') {
      return instructorColors[colorIndex];
    } else {
      return studentColors[colorIndex];
    }
  };



  useEffect(() => {
    fetchCourses();
  }, [user?.role, user?._id]);

  // Load categories and instructors for course creation
  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'instructor') {
      loadCategoriesAndInstructors();
    }
  }, [user?.role]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      console.log('fetchCourses - User role:', user?.role, 'User ID:', user?._id);
      let response;
      
      if (user?.role === 'admin') {
        // For admins, get all courses in the system
        response = await adminService.getAllCourses();
        console.log('Admin courses response:', response);
        setCourses(response.data.courses || []);
      } else if (user?.role === 'instructor') {
        // For instructors, get courses they are assigned to teach
        response = await instructorService.getMyCourses();
        console.log('Instructor courses response:', response);
        setCourses(response.data.courses || []);
      } else {
        // For learners, get courses they are enrolled in
        response = await courseService.getMyCourses();
        console.log('Learner courses response:', response);
        setCourses(response.data.courses || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      // Fallback to empty array if API fails
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategoriesAndInstructors = async () => {
    try {
      // Load categories and instructors for the create course form
      let categoriesResponse, instructorsResponse;
      
      if (user?.role === 'admin') {
        [categoriesResponse, instructorsResponse] = await Promise.all([
          adminService.getCategories(),
          adminService.getAllUsers()
        ]);
      } else if (user?.role === 'instructor') {
        categoriesResponse = await instructorService.getCategories();
        instructorsResponse = { data: { users: [] } }; // Instructors don't need to select other instructors
      }
      
      setCategories(categoriesResponse.data?.categories || []);
      setInstructors(instructorsResponse.data?.users?.filter((user: any) => user.role === 'instructor') || []);
    } catch (error) {
      console.error('Error loading categories and instructors:', error);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched to show validation errors
    const allFields = ['title', 'description', 'shortDescription', 'categoryId', 'duration', 'courseCode', 'priceCredits'];
    if (user?.role === 'admin') {
      allFields.push('instructorId');
    }
    
    allFields.forEach(field => {
      setTouchedFields(prev => new Set(prev).add(field));
    });

    // Validate the entire form
    const { isValid, errors } = validateForm();
    setValidationErrors(errors);

    if (!isValid) {
      const errorCount = Object.keys(errors).length;
      const errorFields = Object.keys(errors).join(', ');
      
      toast({
        title: "Validation Error",
        description: `Please fix ${errorCount} error${errorCount > 1 ? 's' : ''} in the form: ${errorFields}`,
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCreating(true);
      let response;
      
      if (user?.role === 'admin') {
        response = await adminService.createCourse(formData);
      } else if (user?.role === 'instructor') {
        // For instructors, remove instructorId as they are creating the course for themselves
        const { instructorId, ...courseData } = formData;
        response = await instructorService.createCourse(courseData);
      }
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Course created successfully!"
        });
        setShowCreateModal(false);
        resetForm();
        // Refresh courses list
        fetchCourses();
      }
    } catch (error: any) {
      console.error('Error creating course:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Form data sent:', formData);
      
      let errorMessage = "Failed to create course. Please try again.";
      if (error.response?.data?.errors) {
        errorMessage = error.response.data.errors.map((err: any) => err.msg).join(', ');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Mark field as touched
    setTouchedFields(prev => new Set(prev).add(field));
    
    // Validate field in real-time
    const error = validateField(field, value);
    setValidationErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => new Set(prev).add(field));
    const error = validateField(field, formData[field as keyof typeof formData]);
    setValidationErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const getFieldError = (field: string): string => {
    return touchedFields.has(field) ? validationErrors[field] || '' : '';
  };

  const isFieldInvalid = (field: string): boolean => {
    return touchedFields.has(field) && !!validationErrors[field];
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      shortDescription: '',
      categoryId: '',
      instructorId: '',
      courseCode: '',
      priceCredits: 0,
      difficulty: 'beginner',
      duration: 0,
      language: 'en',
      tags: [],
      requirements: [],
      learningOutcomes: [],
      thumbnail: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800'
    });
    setValidationErrors({});
    setTouchedFields(new Set());
  };

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
            {user?.role === 'admin' ? 'All Courses' : user?.role === 'instructor' ? 'My Teaching Courses' : 'Active Courses'}
          </h1>
          
          {(user?.role === 'admin' || user?.role === 'instructor') && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Button>
          )}
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="col-span-full text-center py-8">
          <div className="text-muted-foreground">
            <p className="text-lg font-medium">No courses found</p>
            <p className="text-sm mt-2">
              {user?.role === 'admin' 
                ? 'There are no courses in the system yet.' 
                : user?.role === 'instructor' 
                ? 'You are not assigned to any courses yet.' 
                : 'No courses are available for you yet.'}
            </p>
          </div>
        </div>
      ) : (
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
                  
                  {/* Progress Bar - Only show for non-admin users */}
                  {user?.role !== 'admin' && (
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
                  )}
                  
                  {/* Course Stats for Admin */}
                  {user?.role === 'admin' && course.stats && (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">
                        {course.stats.enrollments} enrollments • {course.stats.averageRating?.toFixed(1) || 'N/A'} rating
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Course Modal */}
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Course</DialogTitle>
                <DialogDescription>
                  Fill in the details below to create a new course.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateCourse} className="space-y-4" noValidate>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Course Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      onBlur={() => handleFieldBlur('title')}
                      placeholder="Enter course title"
                      className={isFieldInvalid('title') ? 'border-red-500 focus:border-red-500' : ''}
                      required
                    />
                    {getFieldError('title') && (
                      <p className="text-sm text-red-600">{getFieldError('title')}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="courseCode">Course Code</Label>
                    <Input
                      id="courseCode"
                      value={formData.courseCode}
                      onChange={(e) => handleInputChange('courseCode', e.target.value)}
                      onBlur={() => handleFieldBlur('courseCode')}
                      placeholder="e.g., CS101"
                      className={isFieldInvalid('courseCode') ? 'border-red-500 focus:border-red-500' : ''}
                    />
                    {getFieldError('courseCode') && (
                      <p className="text-sm text-red-600">{getFieldError('courseCode')}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="description">Description *</Label>
                    <span className="text-xs text-muted-foreground">
                      {formData.description.length}/2000
                    </span>
                  </div>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    onBlur={() => handleFieldBlur('description')}
                    placeholder="Enter course description"
                    rows={3}
                    className={isFieldInvalid('description') ? 'border-red-500 focus:border-red-500' : ''}
                    required
                  />
                  {getFieldError('description') && (
                    <p className="text-sm text-red-600">{getFieldError('description')}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="shortDescription">Short Description *</Label>
                    <span className="text-xs text-muted-foreground">
                      {formData.shortDescription.length}/200
                    </span>
                  </div>
                  <Input
                    id="shortDescription"
                    value={formData.shortDescription}
                    onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                    onBlur={() => handleFieldBlur('shortDescription')}
                    placeholder="Brief course overview (10-200 characters)"
                    className={isFieldInvalid('shortDescription') ? 'border-red-500 focus:border-red-500' : ''}
                    required
                  />
                  {getFieldError('shortDescription') && (
                    <p className="text-sm text-red-600">{getFieldError('shortDescription')}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.categoryId} onValueChange={(value) => handleInputChange('categoryId', value)}>
                      <SelectTrigger className={isFieldInvalid('categoryId') ? 'border-red-500 focus:border-red-500' : ''}>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category._id} value={category._id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {getFieldError('categoryId') && (
                      <p className="text-sm text-red-600">{getFieldError('categoryId')}</p>
                    )}
                  </div>
                  
                  {user?.role === 'admin' && (
                    <div className="space-y-2">
                      <Label htmlFor="instructor">Instructor *</Label>
                      <Select value={formData.instructorId} onValueChange={(value) => handleInputChange('instructorId', value)}>
                        <SelectTrigger className={isFieldInvalid('instructorId') ? 'border-red-500 focus:border-red-500' : ''}>
                          <SelectValue placeholder="Select instructor" />
                        </SelectTrigger>
                        <SelectContent>
                          {instructors.map((instructor) => (
                            <SelectItem key={instructor._id} value={instructor._id}>
                              {instructor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {getFieldError('instructorId') && (
                        <p className="text-sm text-red-600">{getFieldError('instructorId')}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select value={formData.difficulty} onValueChange={(value) => handleInputChange('difficulty', value)}>
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
                    <Label htmlFor="duration">Duration (minutes) *</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration}
                      onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
                      onBlur={() => handleFieldBlur('duration')}
                      placeholder="0"
                      min="1"
                      className={isFieldInvalid('duration') ? 'border-red-500 focus:border-red-500' : ''}
                      required
                    />
                    {getFieldError('duration') && (
                      <p className="text-sm text-red-600">{getFieldError('duration')}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="priceCredits">Price (Credits)</Label>
                    <Input
                      id="priceCredits"
                      type="number"
                      value={formData.priceCredits}
                      onChange={(e) => handleInputChange('priceCredits', parseInt(e.target.value) || 0)}
                      onBlur={() => handleFieldBlur('priceCredits')}
                      placeholder="0"
                      min="0"
                      className={isFieldInvalid('priceCredits') ? 'border-red-500 focus:border-red-500' : ''}
                    />
                    {getFieldError('priceCredits') && (
                      <p className="text-sm text-red-600">{getFieldError('priceCredits')}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Course'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      );
    };

export default Courses;
