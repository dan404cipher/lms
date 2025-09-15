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
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Download, 
  Upload,
  FileText, 
  Video,
  Link,
  Calendar,
  Users,
  BarChart3,
  Clock,
  CheckCircle,
  X,
  ArrowRight
} from "lucide-react";
import instructorService from "@/services/instructorService";

interface Material {
  _id: string;
  title: string;
  description: string;
  type: 'pdf' | 'video' | 'document' | 'link';
  courseId: string;
  courseTitle: string;
  fileUrl?: string;
  fileSize?: number;
  uploadDate: string;
  downloads: number;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
}

interface Course {
  _id: string;
  title: string;
  courseCode: string;
}

const InstructorMaterials = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "pdf" as 'pdf' | 'video' | 'document' | 'link',
    courseId: "",
    fileUrl: "",
    file: null as File | null
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchMaterials();
    fetchCourses();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await instructorService.getMaterials();
      setMaterials(response.data.materials || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast({
        title: "Error",
        description: "Failed to fetch materials",
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

    if (formData.type === 'link') {
      if (!formData.fileUrl.trim()) {
        newErrors.fileUrl = "URL is required for link materials";
      } else if (!isValidUrl(formData.fileUrl)) {
        newErrors.fileUrl = "Please enter a valid URL";
      }
    }
    // Note: File upload validation removed for now since we're not implementing file storage yet

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleCreateMaterial = async () => {
    if (!validateForm()) return;

    try {
      setIsCreating(true);
      
      const materialData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        courseId: formData.courseId,
        fileUrl: formData.type === 'link' ? formData.fileUrl : undefined
      };

      // For now, we'll use the general createMaterial endpoint for all types
      // File uploads will be handled by the backend when we implement file storage
      await instructorService.createMaterial(materialData);

      toast({
        title: "Success",
        description: "Material created successfully",
      });
      setIsCreateModalOpen(false);
      resetForm();
      fetchMaterials();
    } catch (error: any) {
      console.error('Error creating material:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create material",
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, file }));
    if (errors.file) {
      setErrors(prev => ({ ...prev, file: "" }));
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      type: "pdf",
      courseId: "",
      fileUrl: "",
      file: null
    });
    setErrors({});
  };

  const handleViewMaterial = (material: Material) => {
    setSelectedMaterial(material);
    setIsViewModalOpen(true);
  };

  const handleDownloadMaterial = async (materialId: string) => {
    try {
      const response = await instructorService.downloadMaterial(materialId);
      // Handle download logic here
      toast({
        title: "Success",
        description: "Download started",
      });
    } catch (error: any) {
      console.error('Error downloading material:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to download material",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm("Are you sure you want to delete this material?")) return;

    try {
      await instructorService.deleteMaterial(materialId);
      toast({
        title: "Success",
        description: "Material deleted successfully",
      });
      fetchMaterials();
    } catch (error: any) {
      console.error('Error deleting material:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete material",
        variant: "destructive",
      });
    }
  };

  const getTypeIcon = (type: Material['type']) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-600" />;
      case 'video':
        return <Video className="h-4 w-4 text-blue-600" />;
      case 'document':
        return <FileText className="h-4 w-4 text-green-600" />;
      case 'link':
        return <Link className="h-4 w-4 text-purple-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: Material['status']) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'published':
        return <Badge variant="default" className="bg-green-100 text-green-800">Published</Badge>;
      case 'archived':
        return <Badge variant="outline" className="text-gray-600">Archived</Badge>;
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.courseTitle?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || material.type === filterType;
    const matchesStatus = filterStatus === "all" || material.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Course Materials</h1>
          <p className="text-muted-foreground">Manage your course materials and resources</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Upload Material
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search materials..."
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
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="document">Document</SelectItem>
            <SelectItem value="link">Link</SelectItem>
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
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Materials List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading materials...</p>
        </div>
      ) : filteredMaterials.length > 0 ? (
        <div className="grid gap-4">
          {filteredMaterials.map((material) => (
            <Card key={material._id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getTypeIcon(material.type)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{material.title}</h3>
                      <p className="text-muted-foreground text-sm mb-2">{material.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(material.uploadDate)}
                        </span>
                        <span className="flex items-center">
                          <Download className="h-4 w-4 mr-1" />
                          {material.downloads} downloads
                        </span>
                        {material.fileSize && (
                          <span className="flex items-center">
                            <FileText className="h-4 w-4 mr-1" />
                            {formatFileSize(material.fileSize)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(material.status)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewMaterial(material)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadMaterial(material._id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteMaterial(material._id)}
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
          <Upload className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No materials found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || filterType !== "all" || filterStatus !== "all"
              ? "Try adjusting your search or filters"
              : "Upload your first material to get started"
            }
          </p>
          {(!searchTerm && filterType === "all" && filterStatus === "all") && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Material
            </Button>
          )}
        </div>
      )}

      {/* Create Material Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload New Material</DialogTitle>
            <DialogDescription>
              Upload a file or add a link to share with your students
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter material title"
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
                placeholder="Enter material description"
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
                    <SelectItem value="pdf">PDF Document</SelectItem>
                    <SelectItem value="video">Video File</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="link">External Link</SelectItem>
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

            {formData.type === 'link' ? (
              <div>
                <Label htmlFor="fileUrl">URL *</Label>
                <Input
                  id="fileUrl"
                  type="url"
                  value={formData.fileUrl}
                  onChange={(e) => handleInputChange('fileUrl', e.target.value)}
                  placeholder="https://example.com"
                  className={errors.fileUrl ? "border-red-500" : ""}
                />
                {errors.fileUrl && <p className="text-red-500 text-sm mt-1">{errors.fileUrl}</p>}
              </div>
            ) : (
              <div>
                <Label>File Upload</Label>
                <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    File upload functionality will be implemented soon. 
                    For now, you can create link materials or use the course-specific material upload.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateMaterial} disabled={isCreating}>
                {isCreating ? "Uploading..." : "Upload Material"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Material Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Material Details</DialogTitle>
            <DialogDescription>
              View detailed information about this material
            </DialogDescription>
          </DialogHeader>
          {selectedMaterial && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedMaterial.title}</h3>
                <p className="text-muted-foreground">{selectedMaterial.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <p className="flex items-center">
                    {getTypeIcon(selectedMaterial.type)}
                    <span className="ml-2 capitalize">{selectedMaterial.type}</span>
                  </p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedMaterial.status)}</div>
                </div>
                <div>
                  <Label>Upload Date</Label>
                  <p className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDate(selectedMaterial.uploadDate)}
                  </p>
                </div>
                <div>
                  <Label>Downloads</Label>
                  <p className="flex items-center">
                    <Download className="h-4 w-4 mr-1" />
                    {selectedMaterial.downloads}
                  </p>
                </div>
                {selectedMaterial.fileSize && (
                  <div>
                    <Label>File Size</Label>
                    <p className="flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      {formatFileSize(selectedMaterial.fileSize)}
                    </p>
                  </div>
                )}
                {selectedMaterial.fileUrl && (
                  <div>
                    <Label>URL</Label>
                    <p className="flex items-center">
                      <Link className="h-4 w-4 mr-1" />
                      <a href={selectedMaterial.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {selectedMaterial.fileUrl}
                      </a>
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

export default InstructorMaterials;
