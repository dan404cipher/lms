import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Moon, Globe, Shield, Palette, Settings as SettingsIcon, Database, Users, Mail, Server } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import userSettingsService from "@/services/userSettingsService";

const Settings = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // User settings state
  const [userSettings, setUserSettings] = useState({
    notifications: {
      email: true,
      push: true,
      inApp: true
    },
    language: 'en',
    timezone: 'UTC',
    compactMode: false,
    twoFactorAuth: false,
    profileVisibility: true
  });

  // Original settings for comparison
  const [originalUserSettings, setOriginalUserSettings] = useState(userSettings);
  
  // Admin system settings state
  const [systemSettings, setSystemSettings] = useState({
    siteName: 'LMS Platform',
    maintenanceMode: false,
    registrationEnabled: true,
    maxFileSize: 100,
    allowedFileTypes: ['pdf', 'doc', 'docx', 'mp4', 'jpg', 'png'],
    emailNotifications: true,
    maxUsers: 1000,
    maxCourses: 500,
    sessionTimeout: 30,
    backupFrequency: 'daily'
  });

  // Original system settings for comparison
  const [originalSystemSettings, setOriginalSystemSettings] = useState(systemSettings);
  
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        // Load user settings
        const userResponse = await userSettingsService.getUserSettings();
        if (userResponse.success) {
          const loadedUserSettings = userResponse.data.settings;
          setUserSettings(loadedUserSettings);
          setOriginalUserSettings(loadedUserSettings);
        }

        // Load system settings if admin
        if (isAdmin) {
          const systemResponse = await userSettingsService.getSystemSettings();
          if (systemResponse.success) {
            const loadedSystemSettings = systemResponse.data.settings;
            setSystemSettings(loadedSystemSettings);
            setOriginalSystemSettings(loadedSystemSettings);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast({
          title: "Error",
          description: "Failed to load settings",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [isAdmin, toast]);

  // Check for changes
  useEffect(() => {
    const userChanged = JSON.stringify(userSettings) !== JSON.stringify(originalUserSettings);
    const systemChanged = isAdmin && JSON.stringify(systemSettings) !== JSON.stringify(originalSystemSettings);
    setHasChanges(userChanged || systemChanged);
  }, [userSettings, systemSettings, originalUserSettings, originalSystemSettings, isAdmin]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Save user settings
      await userSettingsService.updateUserSettings(userSettings);
      setOriginalUserSettings(userSettings);

      // Save system settings if admin
      if (isAdmin) {
        await userSettingsService.updateSystemSettings(systemSettings);
        setOriginalSystemSettings(systemSettings);
      }

      setHasChanges(false);
      toast({
        title: "Success",
        description: "Settings updated successfully"
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelChanges = () => {
    setUserSettings(originalUserSettings);
    if (isAdmin) {
      setSystemSettings(originalSystemSettings);
    }
    setHasChanges(false);
  };

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          {hasChanges && (
            <div className="flex items-center space-x-2 text-amber-600">
              <div className="w-2 h-2 bg-amber-600 rounded-full"></div>
              <span className="text-sm font-medium">Unsaved changes</span>
            </div>
          )}
        </div>
        
        <div className="space-y-6">
          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notifications</span>
              </CardTitle>
              <CardDescription>Manage your notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch 
                  checked={userSettings.notifications.email}
                  onCheckedChange={(checked) => 
                    setUserSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, email: checked }
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications in browser
                  </p>
                </div>
                <Switch 
                  checked={userSettings.notifications.push}
                  onCheckedChange={(checked) => 
                    setUserSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, push: checked }
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>In-App Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show notifications within the app
                  </p>
                </div>
                <Switch 
                  checked={userSettings.notifications.inApp}
                  onCheckedChange={(checked) => 
                    setUserSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, inApp: checked }
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Language & Region */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Language & Region</span>
              </CardTitle>
              <CardDescription>Set your preferred language and timezone</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select 
                  value={userSettings.language}
                  onValueChange={(value) => setUserSettings(prev => ({ ...prev, language: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
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
                <Label htmlFor="timezone">Timezone</Label>
                <Select 
                  value={userSettings.timezone}
                  onValueChange={(value) => setUserSettings(prev => ({ ...prev, timezone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">GMT</SelectItem>
                    <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Japan (JST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Privacy & Security</span>
              </CardTitle>
              <CardDescription>Manage your privacy and security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Switch 
                  checked={userSettings.twoFactorAuth}
                  onCheckedChange={(checked) => setUserSettings(prev => ({ ...prev, twoFactorAuth: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Profile Visibility</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow other users to see your profile
                  </p>
                </div>
                <Switch 
                  checked={userSettings.profileVisibility}
                  onCheckedChange={(checked) => setUserSettings(prev => ({ ...prev, profileVisibility: checked }))}
                />
              </div>
              <Button variant="outline" className="w-full">
                Change Password
              </Button>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>Appearance</span>
              </CardTitle>
              <CardDescription>Customize the look and feel of the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select 
                  value={theme}
                  onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use a more compact layout
                  </p>
                </div>
                <Switch 
                  checked={userSettings.compactMode}
                  onCheckedChange={(checked) => setUserSettings(prev => ({ ...prev, compactMode: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Admin System Settings */}
          {isAdmin && (
            <>
              {/* System Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <SettingsIcon className="h-5 w-5" />
                    <span>System Configuration</span>
                  </CardTitle>
                  <CardDescription>Manage system-wide settings and configurations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      value={systemSettings.siteName}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, siteName: e.target.value }))}
                      placeholder="Enter site name"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Maintenance Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable maintenance mode to restrict access
                      </p>
                    </div>
                    <Switch 
                      checked={systemSettings.maintenanceMode}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, maintenanceMode: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Registration Enabled</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow new user registrations
                      </p>
                    </div>
                    <Switch 
                      checked={systemSettings.registrationEnabled}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, registrationEnabled: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable system-wide email notifications
                      </p>
                    </div>
                    <Switch 
                      checked={systemSettings.emailNotifications}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, emailNotifications: checked }))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* File & Storage Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <span>File & Storage</span>
                  </CardTitle>
                  <CardDescription>Configure file upload limits and allowed types</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxFileSize">Maximum File Size (MB)</Label>
                    <Input
                      id="maxFileSize"
                      type="number"
                      value={systemSettings.maxFileSize}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, maxFileSize: parseInt(e.target.value) || 100 }))}
                      placeholder="100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="allowedFileTypes">Allowed File Types</Label>
                    <Input
                      id="allowedFileTypes"
                      value={systemSettings.allowedFileTypes.join(', ')}
                      onChange={(e) => setSystemSettings(prev => ({ 
                        ...prev, 
                        allowedFileTypes: e.target.value.split(',').map(type => type.trim()) 
                      }))}
                      placeholder="pdf, doc, docx, mp4, jpg, png"
                    />
                    <p className="text-xs text-muted-foreground">
                      Separate file types with commas
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* User & Course Limits */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>User & Course Limits</span>
                  </CardTitle>
                  <CardDescription>Set maximum limits for users and courses</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxUsers">Maximum Users</Label>
                      <Input
                        id="maxUsers"
                        type="number"
                        value={systemSettings.maxUsers}
                        onChange={(e) => setSystemSettings(prev => ({ ...prev, maxUsers: parseInt(e.target.value) || 1000 }))}
                        placeholder="1000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxCourses">Maximum Courses</Label>
                      <Input
                        id="maxCourses"
                        type="number"
                        value={systemSettings.maxCourses}
                        onChange={(e) => setSystemSettings(prev => ({ ...prev, maxCourses: parseInt(e.target.value) || 500 }))}
                        placeholder="500"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={systemSettings.sessionTimeout}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) || 30 }))}
                      placeholder="30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="backupFrequency">Backup Frequency</Label>
                    <Select 
                      value={systemSettings.backupFrequency}
                      onValueChange={(value) => setSystemSettings(prev => ({ ...prev, backupFrequency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button 
              variant="outline" 
              onClick={handleCancelChanges}
              disabled={saving || loading || !hasChanges}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveSettings} 
              disabled={saving || loading || !hasChanges}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
