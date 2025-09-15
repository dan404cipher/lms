import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, MapPin, Globe, Phone, Loader2 } from "lucide-react";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import authService from "@/services/authService";

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [localUser, setLocalUser] = useState(user);
  const [formData, setFormData] = useState({
    bio: user?.profile?.bio || '',
    location: user?.profile?.location || '',
    phone: user?.profile?.phone || '',
    website: user?.profile?.website || ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update local user state when user prop changes
  React.useEffect(() => {
    setLocalUser(user);
    setFormData({
      bio: user?.profile?.bio || '',
      location: user?.profile?.location || '',
      phone: user?.profile?.phone || '',
      website: user?.profile?.website || ''
    });
  }, [user]);

  // Validation functions
  const validateBio = (bio: string): string => {
    if (bio.length > 500) return 'Bio must be less than 500 characters';
    return '';
  };

  const validateLocation = (location: string): string => {
    if (location.length > 100) return 'Location must be less than 100 characters';
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

  const validateWebsite = (website: string): string => {
    if (!website) return ''; // Website is optional
    
    // If website is provided, it must be a valid URL
    const urlRegex = /^https?:\/\/.+/;
    if (!urlRegex.test(website)) {
      return 'Please enter a valid URL (must start with http:// or https://)';
    }
    
    return '';
  };

  const formatPhoneInput = (value: string): string => {
    // Only allow numbers, +, -, (, ), and spaces
    return value.replace(/[^0-9+\-() ]/g, '');
  };

  const handleInputChange = (field: string, value: string) => {
    let processedValue = value;
    
    if (field === 'phone') {
      processedValue = formatPhoneInput(value);
    }
    
    setFormData(prev => ({ ...prev, [field]: processedValue }));
    
    // Validate the field
    let error = '';
    switch (field) {
      case 'bio':
        error = validateBio(processedValue);
        break;
      case 'location':
        error = validateLocation(processedValue);
        break;
      case 'phone':
        error = validatePhone(processedValue);
        break;
      case 'website':
        error = validateWebsite(processedValue);
        break;
    }
    
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    newErrors.bio = validateBio(formData.bio);
    newErrors.location = validateLocation(formData.location);
    newErrors.phone = validatePhone(formData.phone);
    newErrors.website = validateWebsite(formData.website);
    
    setErrors(newErrors);
    
    return Object.values(newErrors).every(error => error === '');
  };

  const handleUpdateProfile = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form before submitting.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUpdating(true);
      
      const response = await (authService as any).updateProfile(formData);
      
      if (response.success) {
        // Update the local user state with new profile data
        setLocalUser({
          ...localUser,
          profile: {
            ...localUser?.profile,
            ...formData
          }
        });
        
        toast({
          title: "Success",
          description: "Profile updated successfully!"
        });
        
        setIsEditProfileModalOpen(false);
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      
      let errorMessage = "Failed to update profile. Please try again.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditProfileClick = () => {
    // Reset form data to current user data
    setFormData({
      bio: user?.profile?.bio || '',
      location: user?.profile?.location || '',
      phone: user?.profile?.phone || '',
      website: user?.profile?.website || ''
    });
    setErrors({});
    setIsEditProfileModalOpen(true);
  };

  if (!localUser) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Profile</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="md:col-span-1">
            <CardHeader className="text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage src={localUser.profile?.avatar} alt={localUser.name} />
                <AvatarFallback className="text-2xl">
                  {localUser.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <CardTitle>{localUser.name}</CardTitle>
              <CardDescription className="capitalize">{localUser.role}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{localUser.email}</span>
              </div>
              {localUser.profile?.location && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{localUser.profile.location}</span>
                </div>
              )}
              {localUser.profile?.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{localUser.profile.phone}</span>
                </div>
              )}
              {localUser.profile?.website && (
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={localUser.profile.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {localUser.profile.website}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile Details */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Manage your account settings and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Bio</h3>
                <p className="text-muted-foreground">
                  {localUser.profile?.bio || "No bio added yet."}
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Account Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Credits</label>
                    <p className="text-2xl font-bold text-primary">{localUser.credits}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <p className="text-sm capitalize">{localUser.status}</p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <Button onClick={handleEditProfileClick}>
                  <User className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setIsChangePasswordModalOpen(true)}
                >
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Edit Profile Modal */}
      <Dialog open={isEditProfileModalOpen} onOpenChange={setIsEditProfileModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={4}
                className={errors.bio ? 'border-red-500 focus:border-red-500' : ''}
              />
              {errors.bio && (
                <p className="text-sm text-red-500">{errors.bio}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.bio.length}/500 characters
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="City, Country"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className={errors.location ? 'border-red-500 focus:border-red-500' : ''}
                />
                {errors.location && (
                  <p className="text-sm text-red-500">{errors.location}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={errors.phone ? 'border-red-500 focus:border-red-500' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://example.com"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                className={errors.website ? 'border-red-500 focus:border-red-500' : ''}
              />
              {errors.website && (
                <p className="text-sm text-red-500">{errors.website}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditProfileModalOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateProfile} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Profile'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />
    </div>
  );
};

export default Profile;

