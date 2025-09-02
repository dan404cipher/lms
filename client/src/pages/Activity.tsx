import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

import activityService from "@/services/activityService";
import {
  Video,
  FileText,
  MessageSquare,
  Building,
  Calendar,
  Clock,
  Play,
  ArrowRight,
  CheckCircle,
  Download,
  Eye,
  User,
  LogIn,
  LogOut,
  BookOpen,
  Award,
  CreditCard,
  Shield,
  UserCheck,
  Filter,
  Search,
  Download as DownloadIcon,
  Trash2,
  RefreshCw
} from "lucide-react";

interface Activity {
  _id: string;
  type: string;
  title: string;
  description: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  course?: {
    id: string;
    title: string;
    courseCode: string;
  };
  targetUser?: {
    id: string;
    name: string;
    email: string;
  };
  metadata: any;
  ipAddress?: string;
  userAgent?: string;
  formattedDate: string;
  formattedTime: string;
  timeAgo: string;
  createdAt: string;
}

interface ActivityType {
  value: string;
  label: string;
  icon: string;
}

const Activity = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([
    { value: 'login', label: 'Login', icon: 'log-in' },
    { value: 'logout', label: 'Logout', icon: 'log-out' },
    { value: 'course_enrollment', label: 'Course Enrollment', icon: 'book-open' },
    { value: 'course_completion', label: 'Course Completion', icon: 'check-circle' },
    { value: 'session_join', label: 'Session Join', icon: 'video' },
    { value: 'session_leave', label: 'Session Leave', icon: 'video-off' },
    { value: 'assignment_submit', label: 'Assignment Submit', icon: 'file-text' },
    { value: 'quiz_attempt', label: 'Quiz Attempt', icon: 'help-circle' },
    { value: 'quiz_completion', label: 'Quiz Completion', icon: 'check-square' },
    { value: 'material_download', label: 'Material Download', icon: 'download' },
    { value: 'profile_update', label: 'Profile Update', icon: 'user' },
    { value: 'password_reset', label: 'Password Reset', icon: 'key' },
    { value: 'course_view', label: 'Course View', icon: 'eye' },
    { value: 'lesson_view', label: 'Lesson View', icon: 'book' },
    { value: 'discussion_post', label: 'Discussion Post', icon: 'message-square' },
    { value: 'discussion_reply', label: 'Discussion Reply', icon: 'message-circle' },
    { value: 'certificate_earned', label: 'Certificate Earned', icon: 'award' },
    { value: 'payment_made', label: 'Payment Made', icon: 'credit-card' },
    { value: 'admin_action', label: 'Admin Action', icon: 'shield' },
    { value: 'instructor_action', label: 'Instructor Action', icon: 'user-check' }
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalActivities, setTotalActivities] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isFiltering, setIsFiltering] = useState(false);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== "") {
        setCurrentPage(1);
        fetchActivities();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Main fetch effect for filters and pagination
  // useEffect(() => {
  //   fetchActivities();
  // }, [currentPage, selectedType, selectedCourse, startDate, endDate]);

  useEffect(() => {
    fetchActivities();
  }, [currentPage]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build filter parameters
      const filterParams: any = {
        page: currentPage,
        limit: 20,
      };

      // Only add filters if they have values
      if (selectedType && selectedType !== "all") {
        filterParams.type = selectedType;
      }

      if (selectedCourse && selectedCourse !== "") {
        filterParams.courseId = selectedCourse;
      }

      if (startDate && startDate !== "") {
        filterParams.startDate = startDate;
      }

      if (endDate && endDate !== "") {
        filterParams.endDate = endDate;
      }

      if (searchTerm && searchTerm.trim() !== "") {
        filterParams.search = searchTerm.trim();
      }

      console.log('Fetching activities with params:', filterParams);

      // Fetch activities and types in parallel
      const [activitiesResponse, typesResponse] = await Promise.all([
        activityService.getMyActivities(filterParams),
        activityService.getActivityTypes()
      ]);

      console.log('Activities response:', activitiesResponse);

      if (activitiesResponse?.data) {
        setActivities(activitiesResponse.data.activities || []);
        setTotalPages(activitiesResponse.data.pagination?.pages || 1);
        setTotalActivities(activitiesResponse.data.pagination?.total || 0);
      }

      if (typesResponse?.data?.types && typesResponse.data.types.length > 0) {
        setActivityTypes(typesResponse.data.types);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      setError('Failed to load activities. Please try again.');
      setActivities([]);
    } finally {
      setLoading(false);
      setIsFiltering(false);
    }
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    setIsFiltering(true);
    fetchActivities();
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedType("all");
    setSelectedCourse("");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
    // setIsFiltering(true);
    // Fetch activities will be triggered by useEffect
  };

  const handleExport = async () => {
    try {
      const exportParams: any = {};

      if (startDate && startDate !== "") {
        exportParams.startDate = startDate;
      }

      if (endDate && endDate !== "") {
        exportParams.endDate = endDate;
      }

      if (selectedType && selectedType !== "all") {
        exportParams.type = selectedType;
      }

      if (selectedCourse && selectedCourse !== "") {
        exportParams.courseId = selectedCourse;
      }

      if (searchTerm && searchTerm.trim() !== "") {
        exportParams.search = searchTerm.trim();
      }

      const response = await activityService.exportActivities(exportParams);

      // Create and download CSV
      const csvContent = convertToCSV(response.data.activities);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activities-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting activities:', error);
      setError('Failed to export activities. Please try again.');
    }
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'login':
        return <LogIn className="h-5 w-5 text-green-600" />;
      case 'logout':
        return <LogOut className="h-5 w-5 text-red-600" />;
      case 'course_enrollment':
        return <BookOpen className="h-5 w-5 text-blue-600" />;
      case 'course_completion':
        return <Award className="h-5 w-5 text-yellow-600" />;
      case 'session_join':
        return <Video className="h-5 w-5 text-green-600" />;
      case 'session_leave':
        return <Video className="h-5 w-5 text-red-600" />;
      case 'assignment_submit':
        return <FileText className="h-5 w-5 text-purple-600" />;
      case 'quiz_attempt':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'quiz_completion':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'material_download':
        return <Download className="h-5 w-5 text-indigo-600" />;
      case 'profile_update':
        return <User className="h-5 w-5 text-gray-600" />;
      case 'password_reset':
        return <User className="h-5 w-5 text-orange-600" />;
      case 'course_view':
        return <Eye className="h-5 w-5 text-blue-600" />;
      case 'lesson_view':
        return <BookOpen className="h-5 w-5 text-green-600" />;
      case 'discussion_post':
        return <MessageSquare className="h-5 w-5 text-orange-600" />;
      case 'discussion_reply':
        return <MessageSquare className="h-5 w-5 text-blue-600" />;
      case 'certificate_earned':
        return <Award className="h-5 w-5 text-yellow-600" />;
      case 'payment_made':
        return <CreditCard className="h-5 w-5 text-green-600" />;
      case 'admin_action':
        return <Shield className="h-5 w-5 text-red-600" />;
      case 'instructor_action':
        return <UserCheck className="h-5 w-5 text-purple-600" />;
      default:
        return <Calendar className="h-5 w-5 text-gray-600" />;
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading && !isFiltering) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading activities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <Alert className="max-w-md mx-auto">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
          <Button onClick={() => {
            setError(null);
            fetchActivities();
          }}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Activity Tracking</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Showing {activities.length} of {totalActivities} activities
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!['admin', 'super_admin'].includes(user?.role || '') || loading}
            >
              <DownloadIcon className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchActivities}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters</span>
              {isFiltering && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4  items-center justify-end">
              {/*  <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search activities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div> */}
              <div>
                <Label htmlFor="type">Activity Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {Array.isArray(activityTypes) && activityTypes.length > 0 ? (
                      activityTypes.map((type) => {
                        try {
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          );
                        } catch (err) {
                          console.error('Error rendering activity type:', type, err);
                          return null;
                        }
                      }).filter(Boolean)
                    ) : (
                      <SelectItem value="loading" disabled>
                        Loading types...
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate ||undefined}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  min={startDate||undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2 mt-4">
              <Button
                onClick={handleApplyFilters}
                size="sm"
                disabled={isFiltering}
              >
                {isFiltering ? 'Applying...' : 'Apply Filters'}
              </Button>
              <Button
                onClick={handleClearFilters}
                variant="outline"
                size="sm"
                disabled={isFiltering}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Activities List */}
        <div className="space-y-4">
          {activities.length > 0 ? (
            activities.map((activity) => (
              <Card key={activity._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {getActivityIcon(activity.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {activity.user.role}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {activity.user.name}
                          </span>
                          {activity.course && (
                            <Badge variant="secondary" className="text-xs">
                              {activity.course.courseCode}
                            </Badge>
                          )}
                        </div>

                        <h3 className="font-semibold text-foreground mb-2">
                          {activity.title}
                        </h3>

                        <p className="text-sm text-muted-foreground mb-2">
                          {activity.description}
                        </p>

                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{activity.formattedDate}</span>
                          <span>{activity.formattedTime}</span>
                          <span>{activity.timeAgo}</span>
                          {activity.course && (
                            <span>Course: {activity.course.title}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {activity.type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || selectedType !== "all" || selectedCourse || startDate || endDate
                  ? "No activities found with the current filters."
                  : "No activities found."
                }
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
};

export default Activity;