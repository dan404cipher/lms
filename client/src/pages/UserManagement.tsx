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
import { Plus, Edit, Trash2, Search, Filter, Loader2, Eye, EyeOff, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import adminService, { User } from "@/services/adminService";

const UserManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showPassword, setShowPassword] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [usersPerPage, setUsersPerPage] = useState(10);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'learner' as 'learner' | 'instructor' | 'admin' | 'super_admin',
    status: 'active' as 'active' | 'inactive' | 'suspended',
    credits: 0,
    bio: '',
    location: '',
    phone: '',
    website: ''
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isValidating, setIsValidating] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (user && !['admin', 'super_admin'].includes(user.role)) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate('/dashboard');
    }
  }, [user, navigate, toast]);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      fetchUsers(1); // Reset to first page when filters change
    }
  }, [user?.role, roleFilter, statusFilter, usersPerPage]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (user?.role === 'admin' || user?.role === 'super_admin') {
        fetchUsers(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchUsers = async (page = currentPage) => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: usersPerPage.toString()
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await adminService.getAllUsers(params);
      setUsers(response.data.users || []);
      setTotalPages(response.data.pagination.pages);
      setTotalUsers(response.data.pagination.total);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('Creating user with data:', formData);
      const response = await adminService.createUser(formData);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "User created successfully!"
        });
        setShowCreateModal(false);
        resetForm();
        fetchUsers(1); // Reset to first page after creating user
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create user.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(true)) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const updateData = { ...formData };
      
      // Remove password if empty
      if (!updateData.password) {
        delete updateData.password;
      }
      
      // Remove empty optional fields to avoid validation issues
      if (!updateData.bio || updateData.bio.trim() === '') {
        delete updateData.bio;
      }
      if (!updateData.location || updateData.location.trim() === '') {
        delete updateData.location;
      }
      if (!updateData.phone || updateData.phone.trim() === '') {
        delete updateData.phone;
      }
      if (!updateData.website || updateData.website.trim() === '') {
        delete updateData.website;
      }
      
      // Sanitize phone number to match backend validation (max 20 chars)
      if (updateData.phone && updateData.phone.length > 20) {
        updateData.phone = updateData.phone.substring(0, 20);
      }
      
      // Ensure all string fields are properly trimmed
      if (updateData.name) updateData.name = updateData.name.trim();
      if (updateData.email) updateData.email = updateData.email.trim();
      if (updateData.bio) updateData.bio = updateData.bio.trim();
      if (updateData.location) updateData.location = updateData.location.trim();
      if (updateData.phone) updateData.phone = updateData.phone.trim();
      if (updateData.website) {
        updateData.website = updateData.website.trim();
        // Only add https:// if the website doesn't already have a protocol and is not empty
        if (updateData.website && !updateData.website.startsWith('http://') && !updateData.website.startsWith('https://')) {
          updateData.website = 'https://' + updateData.website;
        }
      }
      
      // Ensure credits is a valid non-negative number
      if (updateData.credits !== undefined) {
        const credits = parseInt(updateData.credits.toString()) || 0;
        if (credits < 0) {
          toast({
            title: "Validation Error",
            description: "Credits cannot be negative.",
            variant: "destructive"
          });
          return;
        }
        updateData.credits = credits;
      }
      
      console.log('Updating user with data:', updateData);
      console.log('User ID:', selectedUser._id);
      console.log('Data types:', {
        name: typeof updateData.name,
        email: typeof updateData.email,
        role: typeof updateData.role,
        status: typeof updateData.status,
        credits: typeof updateData.credits,
        bio: typeof updateData.bio,
        location: typeof updateData.location,
        phone: typeof updateData.phone,
        website: typeof updateData.website
      });
      
      const response = await adminService.updateUser(selectedUser._id, updateData);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "User updated successfully!"
        });
        setShowEditModal(false);
        resetForm();
        fetchUsers(currentPage); // Stay on current page after updating user
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Full error object:', JSON.stringify(error.response?.data, null, 2));
      // Show detailed validation errors if available
      let errorMessage = "Failed to update user.";
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const validationErrors = error.response.data.errors.map((err: any) => err.msg).join(', ');
        errorMessage = `Validation errors: ${validationErrors}`;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setIsSubmitting(true);
      const response = await adminService.deleteUser(selectedUser._id);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "User deleted successfully!"
        });
        setShowDeleteModal(false);
        setSelectedUser(null);
        fetchUsers(currentPage); // Stay on current page after deleting user
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete user.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validation functions
  const validateEmail = (email: string, excludeUserId?: string): string => {
    if (!email) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    
    // Check for duplicate email, excluding the current user if updating
    const existingUser = users.find(user => 
      user.email.toLowerCase() === email.toLowerCase() && 
      user._id !== excludeUserId
    );
    if (existingUser) return 'This email is already registered';
    
    return '';
  };

  const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    if (!password) return { score: 0, label: '', color: '' };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (/(?=.*[a-z])/.test(password)) score++;
    if (/(?=.*[A-Z])/.test(password)) score++;
    if (/(?=.*\d)/.test(password)) score++;
    if (/(?=.*[!@#$%^&*])/.test(password)) score++;
    
    if (score <= 1) return { score, label: 'Very Weak', color: 'bg-red-500' };
    if (score === 2) return { score, label: 'Weak', color: 'bg-orange-500' };
    if (score === 3) return { score, label: 'Fair', color: 'bg-yellow-500' };
    if (score === 4) return { score, label: 'Good', color: 'bg-blue-500' };
    return { score, label: 'Strong', color: 'bg-green-500' };
  };

  const validatePassword = (password: string, isUpdate: boolean = false): string => {
    if (!password) {
      return isUpdate ? '' : 'Password is required';
    }
    if (password.length < 8) return 'Password must be at least 8 characters long';
    if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
    return '';
  };

  const validateName = (name: string): string => {
    if (!name) return 'Name is required';
    if (name.length < 2) return 'Name must be at least 2 characters long';
    if (name.length > 50) return 'Name must be less than 50 characters';
    if (!/^[a-zA-Z\s]+$/.test(name)) return 'Name can only contain letters and spaces';
    return '';
  };

  const validatePhone = (phone: string): string => {
    if (!phone) return ''; // Phone is optional
    // Remove all non-digit characters for validation
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length < 10) return 'Phone number must have at least 10 digits';
    if (cleanPhone.length > 15) return 'Phone number must not exceed 15 digits';
    
    // Check for valid phone number patterns
    const phoneRegex = /^[\+]?[1-9][\d]{0,14}$/;
    if (!phoneRegex.test(cleanPhone)) return 'Please enter a valid phone number';
    
    return '';
  };

  const formatPhoneInput = (value: string): string => {
    // Only allow numbers, +, -, (, ), and spaces
    return value.replace(/[^0-9+\-() ]/g, '');
  };

  const validateWebsite = (website: string): string => {
    if (!website) return '';
    
    // If website is provided, it must be a valid URL
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(website)) {
      return 'Please enter a valid website URL (must start with http:// or https://)';
    }
    
    return '';
  };

  const validateCredits = (credits: number): string => {
    if (credits < 0) return 'Credits cannot be negative';
    if (!Number.isInteger(credits)) return 'Credits must be a whole number';
    return '';
  };

  const validateForm = (isUpdate: boolean = false): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    newErrors.name = validateName(formData.name);
    newErrors.email = validateEmail(formData.email, isUpdate ? selectedUser?._id : undefined);
    
    // Only validate password if it's not an update OR if password is provided in update
    if (!isUpdate || formData.password) {
      newErrors.password = validatePassword(formData.password, isUpdate);
    } else {
      newErrors.password = ''; // No error for empty password in update mode
    }
    
    newErrors.phone = validatePhone(formData.phone);
    newErrors.website = validateWebsite(formData.website);
    newErrors.credits = validateCredits(formData.credits);
    
    setErrors(newErrors);
    
    return !Object.values(newErrors).some(error => error !== '');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'learner',
      status: 'active',
      credits: 0,
      bio: '',
      location: '',
      phone: '',
      website: ''
    });
    setErrors({});
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      status: user.status,
      credits: user.credits,
      bio: user.profile?.bio || '',
      location: user.profile?.location || '',
      phone: user.profile?.phone || '',
      website: user.profile?.website || ''
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-500';
      case 'admin': return 'bg-purple-500';
      case 'instructor': return 'bg-blue-500';
      case 'learner': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-yellow-500';
      case 'suspended': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage system users and their permissions</p>
        </div>
        <Button onClick={() => {
          setShowCreateModal(true);
          resetForm();
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="role-filter">Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue />
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
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({totalUsers})</CardTitle>
          <CardDescription>
            Showing {users.length} of {totalUsers} users (Page {currentPage} of {totalPages})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">{user.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{user.email}</p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>Credits: {user.credits}</span>
                      {/* <span>Email: {user.emailVerified ? '✓ Verified' : '✗ Not Verified'}</span> */}
                      {user.lastLogin && (
                        <span>Last Login: {new Date(user.lastLogin).toLocaleDateString()}</span>
                      )}
                      <span>Created: {new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                    {user.profile?.bio && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {user.profile.bio}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <div className="flex flex-col space-y-1 mr-2">
                    <Badge className={getRoleColor(user.role)}>
                      {user.role.replace('_', ' ')}
                    </Badge>
                    <Badge className={getStatusColor(user.status)}>
                      {user.status}
                    </Badge>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(user)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Edit user</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {user.role !== 'super_admin' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteModal(user)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete user</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination Controls */}
          {totalUsers > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">
                  {totalPages === 1 
                    ? `Showing all ${totalUsers} users`
                    : `Showing ${((currentPage - 1) * usersPerPage) + 1} to ${Math.min(currentPage * usersPerPage, totalUsers)} of ${totalUsers} users (Page ${currentPage} of ${totalPages})`
                  }
                </p>
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchUsers(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchUsers(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => fetchUsers(pageNum)}
                          className="w-8 h-8"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchUsers(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchUsers(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <Label htmlFor="users-per-page" className="text-sm">Users per page:</Label>
                <Select value={usersPerPage.toString()} onValueChange={(value) => setUsersPerPage(parseInt(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {users.length === 0 && !loading && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No users found matching your criteria.</p>
          </CardContent>
        </Card>
      )}

      {/* Create User Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new user account with the specified role and permissions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setFormData({ ...formData, name: newName });
                    if (newName) {
                      setErrors(prev => ({ ...prev, name: validateName(newName) }));
                    } else {
                      setErrors(prev => ({ ...prev, name: '' }));
                    }
                  }}
                  onBlur={(e) => {
                    setErrors(prev => ({ ...prev, name: validateName(e.target.value) }));
                  }}
                  className={errors.name ? 'border-red-500 focus:border-red-500' : ''}
                  required
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    const newEmail = e.target.value;
                    setFormData({ ...formData, email: newEmail });
                    if (newEmail) {
                      setErrors(prev => ({ ...prev, email: validateEmail(newEmail) }));
                    } else {
                      setErrors(prev => ({ ...prev, email: '' }));
                    }
                  }}
                  onBlur={(e) => {
                    setErrors(prev => ({ ...prev, email: validateEmail(e.target.value) }));
                  }}
                  className={errors.email ? 'border-red-500 focus:border-red-500' : ''}
                  required
                />
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={!showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => {
                      const newPassword = e.target.value;
                      setFormData({ ...formData, password: newPassword });
                      if (newPassword) {
                        setErrors(prev => ({ ...prev, password: validatePassword(newPassword) }));
                      } else {
                        setErrors(prev => ({ ...prev, password: '' }));
                      }
                    }}
                    onBlur={(e) => {
                      setErrors(prev => ({ ...prev, password: validatePassword(e.target.value) }));
                    }}
                    className={errors.password ? 'border-red-500 focus:border-red-500' : ''}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Password Strength:</span>
                      <span className={getPasswordStrength(formData.password).color.replace('bg-', 'text-')}>
                        {getPasswordStrength(formData.password).label}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded ${
                            level <= getPasswordStrength(formData.password).score
                              ? getPasswordStrength(formData.password).color
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {(errors.password || formData.password) && (
                  <p className={`text-sm mt-1 ${errors.password ? 'text-red-500' : formData.password.length < 8 || !/(?=.*[a-z])/.test(formData.password) || !/(?=.*[A-Z])/.test(formData.password) || !/(?=.*\d)/.test(formData.password) ? 'text-red-500' : !/(?=.*[!@#$%^&*])/.test(formData.password) ? 'text-orange-500' : 'text-green-600'}`}>
                    {errors.password ? (
                      errors.password
                    ) : formData.password.length < 8 ? (
                      '✗ At least 8 characters'
                    ) : !/(?=.*[a-z])/.test(formData.password) ? (
                      '✗ At least one lowercase letter'
                    ) : !/(?=.*[A-Z])/.test(formData.password) ? (
                      '✗ At least one uppercase letter'
                    ) : !/(?=.*\d)/.test(formData.password) ? (
                      '✗ At least one number'
                    ) : !/(?=.*[!@#$%^&*])/.test(formData.password) ? (
                      '! Special characters (!@#$%^&*) for stronger passwords'
                    ) : (
                      '✓ Password meets all requirements'
                    )}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="credits">Credits</Label>
                <Input
                  id="credits"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.credits}
                  onChange={(e) => {
                    const newCredits = parseInt(e.target.value) || 0;
                    setFormData({ ...formData, credits: newCredits });
                    if (newCredits !== 0) {
                      setErrors(prev => ({ ...prev, credits: validateCredits(newCredits) }));
                    } else {
                      setErrors(prev => ({ ...prev, credits: '' }));
                    }
                  }}
                  onBlur={(e) => {
                    const credits = parseInt(e.target.value) || 0;
                    setErrors(prev => ({ ...prev, credits: validateCredits(credits) }));
                  }}
                  className={errors.credits ? 'border-red-500 focus:border-red-500' : ''}
                />
                {errors.credits && (
                  <p className="text-sm text-red-500 mt-1">{errors.credits}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the number of credits for this user (minimum 0)
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role">Role *</Label>
                <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="learner">Learner</SelectItem>
                    <SelectItem value="instructor">Instructor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {user?.role === 'super_admin' && (
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status *</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="User bio..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => {
                    const formattedPhone = formatPhoneInput(e.target.value);
                    setFormData({ ...formData, phone: formattedPhone });
                    if (formattedPhone) {
                      setErrors(prev => ({ ...prev, phone: validatePhone(formattedPhone) }));
                    } else {
                      setErrors(prev => ({ ...prev, phone: '' }));
                    }
                  }}
                  onBlur={(e) => {
                    setErrors(prev => ({ ...prev, phone: validatePhone(e.target.value) }));
                  }}
                  className={errors.phone ? 'border-red-500 focus:border-red-500' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Optional. Enter a valid phone number (e.g., +1 (555) 123-4567)
                </p>
              </div>
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://example.com"
                value={formData.website}
                onChange={(e) => {
                  const newWebsite = e.target.value;
                  setFormData({ ...formData, website: newWebsite });
                  if (newWebsite) {
                    setErrors(prev => ({ ...prev, website: validateWebsite(newWebsite) }));
                  } else {
                    setErrors(prev => ({ ...prev, website: '' }));
                  }
                }}
                onBlur={(e) => {
                  setErrors(prev => ({ ...prev, website: validateWebsite(e.target.value) }));
                }}
                className={errors.website ? 'border-red-500 focus:border-red-500' : ''}
              />
              {errors.website && (
                <p className="text-sm text-red-500 mt-1">{errors.website}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Optional. Enter a valid website URL (must start with http:// or https://)
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || Object.values(errors).some(error => error !== '')}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create User
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={(open) => {
        setShowEditModal(open);
        if (!open && selectedUser) {
          // Reset form to original user data when modal is closed
          setFormData({
            name: selectedUser.name,
            email: selectedUser.email,
            password: '',
            role: selectedUser.role,
            status: selectedUser.status,
            credits: selectedUser.credits,
            bio: selectedUser.profile?.bio || '',
            location: selectedUser.profile?.location || '',
            phone: selectedUser.profile?.phone || '',
            website: selectedUser.profile?.website || ''
          });
          setErrors({});
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setFormData({ ...formData, name: newName });
                    if (newName) {
                      setErrors(prev => ({ ...prev, name: validateName(newName) }));
                    } else {
                      setErrors(prev => ({ ...prev, name: '' }));
                    }
                  }}
                  onBlur={(e) => {
                    setErrors(prev => ({ ...prev, name: validateName(e.target.value) }));
                  }}
                  className={errors.name ? 'border-red-500 focus:border-red-500' : ''}
                  required
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                )}
              </div>
              <div>
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    const newEmail = e.target.value;
                    setFormData({ ...formData, email: newEmail });
                    if (newEmail) {
                      setErrors(prev => ({ ...prev, email: validateEmail(newEmail, selectedUser?._id) }));
                    } else {
                      setErrors(prev => ({ ...prev, email: '' }));
                    }
                  }}
                  onBlur={(e) => {
                    setErrors(prev => ({ ...prev, email: validateEmail(e.target.value, selectedUser?._id) }));
                  }}
                  className={errors.email ? 'border-red-500 focus:border-red-500' : ''}
                  required
                />
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-password">Password (leave blank to keep current)</Label>
                <div className="relative">
                  <Input
                    id="edit-password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => {
                      const newPassword = e.target.value;
                      setFormData({ ...formData, password: newPassword });
                      if (newPassword) {
                        setErrors(prev => ({ ...prev, password: validatePassword(newPassword, true) }));
                      } else {
                        setErrors(prev => ({ ...prev, password: '' }));
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value) {
                        setErrors(prev => ({ ...prev, password: validatePassword(e.target.value, true) }));
                      }
                    }}
                    className={errors.password ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formData.password && (
                  <div className="mt-2 text-xs">
                    {formData.password.length < 8 ? (
                      <div className="flex items-center text-red-500">
                        <span className="mr-1">✗</span>
                        At least 8 characters
                      </div>
                    ) : !/(?=.*[a-z])/.test(formData.password) ? (
                      <div className="flex items-center text-red-500">
                        <span className="mr-1">✗</span>
                        At least one lowercase letter
                      </div>
                    ) : !/(?=.*[A-Z])/.test(formData.password) ? (
                      <div className="flex items-center text-red-500">
                        <span className="mr-1">✗</span>
                        At least one uppercase letter
                      </div>
                    ) : !/(?=.*\d)/.test(formData.password) ? (
                      <div className="flex items-center text-red-500">
                        <span className="mr-1">✗</span>
                        At least one number
                      </div>
                    ) : !/(?=.*[!@#$%^&*])/.test(formData.password) ? (
                      <div className="flex items-center text-orange-500">
                        <span className="mr-1">!</span>
                        Special characters (!@#$%^&*) for stronger passwords
                      </div>
                    ) : (
                      <div className="flex items-center text-green-600">
                        <span className="mr-1">✓</span>
                        Password meets all requirements
                      </div>
                    )}
                  </div>
                )}
                {errors.password && (
                  <p className="text-sm text-red-500 mt-1">{errors.password}</p>
                )}
              </div>
              <div>
                <Label htmlFor="edit-credits">Credits</Label>
                <Input
                  id="edit-credits"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.credits}
                  onChange={(e) => {
                    const newCredits = parseInt(e.target.value) || 0;
                    setFormData({ ...formData, credits: newCredits });
                    if (newCredits !== 0) {
                      setErrors(prev => ({ ...prev, credits: validateCredits(newCredits) }));
                    } else {
                      setErrors(prev => ({ ...prev, credits: '' }));
                    }
                  }}
                  onBlur={(e) => {
                    const credits = parseInt(e.target.value) || 0;
                    setErrors(prev => ({ ...prev, credits: validateCredits(credits) }));
                  }}
                  className={errors.credits ? 'border-red-500 focus:border-red-500' : ''}
                />
                {errors.credits && (
                  <p className="text-sm text-red-500 mt-1">{errors.credits}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the number of credits for this user (minimum 0)
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-role">Role *</Label>
                <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="learner">Learner</SelectItem>
                    <SelectItem value="instructor">Instructor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {user?.role === 'super_admin' && (
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-status">Status *</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-bio">Bio</Label>
              <Textarea
                id="edit-bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="User bio..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => {
                    const formattedPhone = formatPhoneInput(e.target.value);
                    setFormData({ ...formData, phone: formattedPhone });
                    if (formattedPhone) {
                      setErrors(prev => ({ ...prev, phone: validatePhone(formattedPhone) }));
                    } else {
                      setErrors(prev => ({ ...prev, phone: '' }));
                    }
                  }}
                  onBlur={(e) => {
                    setErrors(prev => ({ ...prev, phone: validatePhone(e.target.value) }));
                  }}
                  className={errors.phone ? 'border-red-500 focus:border-red-500' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Optional. Enter a valid phone number (e.g., +1 (555) 123-4567)
                </p>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-website">Website</Label>
              <Input
                id="edit-website"
                type="url"
                placeholder="https://example.com"
                value={formData.website}
                onChange={(e) => {
                  const newWebsite = e.target.value;
                  setFormData({ ...formData, website: newWebsite });
                  if (newWebsite) {
                    setErrors(prev => ({ ...prev, website: validateWebsite(newWebsite) }));
                  } else {
                    setErrors(prev => ({ ...prev, website: '' }));
                  }
                }}
                onBlur={(e) => {
                  setErrors(prev => ({ ...prev, website: validateWebsite(e.target.value) }));
                }}
                className={errors.website ? 'border-red-500 focus:border-red-500' : ''}
              />
              {errors.website && (
                <p className="text-sm text-red-500 mt-1">{errors.website}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Optional. Enter a valid website URL (must start with http:// or https://)
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => {
                setShowEditModal(false);
                // Reset form to original user data
                if (selectedUser) {
                  setFormData({
                    name: selectedUser.name,
                    email: selectedUser.email,
                    password: '',
                    role: selectedUser.role,
                    status: selectedUser.status,
                    credits: selectedUser.credits,
                    bio: selectedUser.profile?.bio || '',
                    location: selectedUser.profile?.location || '',
                    phone: selectedUser.profile?.phone || '',
                    website: selectedUser.profile?.website || ''
                  });
                }
                setErrors({});
              }}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || Object.values(errors).some(error => error !== '')}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update User
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
