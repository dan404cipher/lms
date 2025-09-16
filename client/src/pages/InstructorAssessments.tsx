import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import ConfirmationModal from "@/components/ConfirmationModal";
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  FileText, 
  Calendar,
  Users,
  BarChart3,
  Clock,
  CheckCircle,
  X
} from "lucide-react";
import instructorService from "@/services/instructorService";

interface Assessment {
  _id: string;
  title: string;
  description: string;
  type: 'quiz' | 'assignment' | 'exam';
  courseId: string;
  courseTitle: string;
  dueDate: string;
  maxScore: number;
  submissions: number;
  averageScore?: number;
  status: 'draft' | 'published' | 'closed';
  createdAt: string;
  questions?: number;
}

interface Course {
  _id: string;
  title: string;
  courseCode: string;
}

const InstructorAssessments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "quiz" as 'quiz' | 'assignment' | 'exam',
    courseId: "",
    dueDate: "",
    maxScore: 100,
    questions: 10
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAssessments();
    fetchCourses();
  }, []);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const response = await instructorService.getAssessments();
      setAssessments(response.data.assessments || []);
    } catch (error) {
      console.error('Error fetching assessments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch assessments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await instructorService.getMyCourses();
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (!formData.courseId) {
      newErrors.courseId = "Course is required";
    }

    if (!formData.dueDate) {
      newErrors.dueDate = "Due date is required";
    } else {
      const dueDate = new Date(formData.dueDate);
      const now = new Date();
      if (dueDate <= now) {
        newErrors.dueDate = "Due date must be in the future";
      }
    }

    if (formData.maxScore <= 0) {
      newErrors.maxScore = "Max score must be greater than 0";
    }

    if (formData.questions <= 0) {
      newErrors.questions = "Number of questions must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateAssessment = async () => {
    if (!validateForm()) return;

    try {
      setIsCreating(true);
      await instructorService.createAssessment(formData);
      toast({
        title: "Success",
        description: "Assessment created successfully",
      });
      setIsCreateModalOpen(false);
      resetForm();
      fetchAssessments();
    } catch (error: any) {
      console.error('Error creating assessment:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create assessment",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      type: "quiz",
      courseId: "",
      dueDate: "",
      maxScore: 100,
      questions: 10
    });
    setErrors({});
  };

  const handleViewAssessment = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setIsViewModalOpen(true);
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    if (!confirm("Are you sure you want to delete this assessment?")) return;

    try {
      await instructorService.deleteAssessment(assessmentId);
      toast({
        title: "Success",
        description: "Assessment deleted successfully",
      });
      fetchAssessments();
    } catch (error: any) {
      console.error('Error deleting assessment:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete assessment",
        variant: "destructive",
      });
    }
  };

  const getTypeIcon = (type: Assessment['type']) => {
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

  const getStatusBadge = (status: Assessment['status']) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'published':
        return <Badge variant="default" className="bg-green-100 text-green-800">Published</Badge>;
      case 'closed':
        return <Badge variant="outline" className="text-gray-600">Closed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredAssessments = assessments.filter(assessment => {
    const matchesSearch = assessment.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assessment.courseTitle?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || assessment.type === filterType;
    const matchesStatus = filterStatus === "all" || assessment.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assessments</h1>
          <p className="text-muted-foreground">Manage your quizzes, assignments, and exams</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Assessment
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search assessments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="quiz">Quiz</SelectItem>
            <SelectItem value="assignment">Assignment</SelectItem>
            <SelectItem value="exam">Exam</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Assessments List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading assessments...</p>
        </div>
      ) : filteredAssessments.length > 0 ? (
        <div className="grid gap-4">
          {filteredAssessments.map((assessment) => (
            <Card key={assessment._id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getTypeIcon(assessment.type)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{assessment.title}</h3>
                      <p className="text-muted-foreground text-sm mb-2">{assessment.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Due: {formatDate(assessment.dueDate)}
                        </span>
                        <span className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {assessment.submissions} submissions
                        </span>
                        <span className="flex items-center">
                          <BarChart3 className="h-4 w-4 mr-1" />
                          Max Score: {assessment.maxScore}
                        </span>
                        {assessment.averageScore && (
                          <span className="flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Avg: {assessment.averageScore.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(assessment.status)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewAssessment(assessment)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteAssessment(assessment._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No assessments found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || filterType !== "all" || filterStatus !== "all"
              ? "Try adjusting your search or filters"
              : "Create your first assessment to get started"
            }
          </p>
          {(!searchTerm && filterType === "all" && filterStatus === "all") && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Assessment
            </Button>
          )}
        </div>
      )}

      {/* Create Assessment Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Assessment</DialogTitle>
            <DialogDescription>
              Create a new quiz, assignment, or exam for your students
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter assessment title"
                className={errors.title ? "border-red-500" : ""}
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter assessment description"
                className={errors.description ? "border-red-500" : ""}
                rows={3}
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type *</Label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="assignment">Assignment</SelectItem>
                    <SelectItem value="exam">Exam</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="courseId">Course *</Label>
                <Select value={formData.courseId} onValueChange={(value) => handleInputChange('courseId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course._id} value={course._id}>
                        {course.title} ({course.courseCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.courseId && <p className="text-red-500 text-sm mt-1">{errors.courseId}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  className={errors.dueDate ? "border-red-500" : ""}
                />
                {errors.dueDate && <p className="text-red-500 text-sm mt-1">{errors.dueDate}</p>}
              </div>

              <div>
                <Label htmlFor="maxScore">Max Score *</Label>
                <Input
                  id="maxScore"
                  type="number"
                  value={formData.maxScore}
                  onChange={(e) => handleInputChange('maxScore', parseInt(e.target.value))}
                  className={errors.maxScore ? "border-red-500" : ""}
                />
                {errors.maxScore && <p className="text-red-500 text-sm mt-1">{errors.maxScore}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="questions">Number of Questions</Label>
              <Input
                id="questions"
                type="number"
                value={formData.questions}
                onChange={(e) => handleInputChange('questions', parseInt(e.target.value))}
                className={errors.questions ? "border-red-500" : ""}
              />
              {errors.questions && <p className="text-red-500 text-sm mt-1">{errors.questions}</p>}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAssessment} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Assessment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Assessment Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assessment Details</DialogTitle>
            <DialogDescription>
              View detailed information about this assessment
            </DialogDescription>
          </DialogHeader>
          {selectedAssessment && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedAssessment.title}</h3>
                <p className="text-muted-foreground">{selectedAssessment.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <p className="flex items-center">
                    {getTypeIcon(selectedAssessment.type)}
                    <span className="ml-2 capitalize">{selectedAssessment.type}</span>
                  </p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedAssessment.status)}</div>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <p className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDate(selectedAssessment.dueDate)}
                  </p>
                </div>
                <div>
                  <Label>Max Score</Label>
                  <p>{selectedAssessment.maxScore} points</p>
                </div>
                <div>
                  <Label>Submissions</Label>
                  <p className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {selectedAssessment.submissions}
                  </p>
                </div>
                {selectedAssessment.averageScore && (
                  <div>
                    <Label>Average Score</Label>
                    <p className="flex items-center">
                      <BarChart3 className="h-4 w-4 mr-1" />
                      {selectedAssessment.averageScore.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InstructorAssessments;