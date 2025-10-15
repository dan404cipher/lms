import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import sessionService, { Session, Recording } from "@/services/sessionService";
import ConfirmationModal from "@/components/ConfirmationModal";
import {
  Video,
  Calendar,
  Clock,
  Users,
  Play,
  Download,
  Eye,
  Edit,
  Trash2,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Upload,
  LogOut
} from "lucide-react";

interface SessionsAndRecordingsProps {
  courseId: string;
  isInstructor: boolean;
  isAdmin?: boolean;
  onSessionDeleted?: (sessionId: string) => void;
  onRecordingSelected?: (recording: any) => void;
}

const SessionsAndRecordings = ({ courseId, isInstructor, isAdmin = false, onSessionDeleted, onRecordingSelected }: SessionsAndRecordingsProps) => {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("sessions");
  const [showDeleteSessionModal, setShowDeleteSessionModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const [sessionsPerPage] = useState(10);

  useEffect(() => {
    // Reset pagination when course changes
    setCurrentPage(1);
    loadData();
  }, [courseId]);

  useEffect(() => {
    loadData();
  }, [currentPage]);

  const loadData = async () => {
    console.log('🎬 SessionsAndRecordings - loadData started:', {
      courseId,
      isInstructor,
      isAdmin,
      currentPage,
      sessionsPerPage
    });
    
    try {
      setLoading(true);
      
      // Load sessions with pagination
      console.log('🎬 Loading sessions for courseId:', courseId);
      const sessionsResponse = await sessionService.getSessions(courseId, currentPage, sessionsPerPage, 'scheduledAt', 'desc');
      console.log('🎬 Sessions response:', {
        success: sessionsResponse.success,
        sessionsCount: sessionsResponse.data?.sessions?.length || 0,
        pagination: sessionsResponse.data?.pagination,
        sessions: sessionsResponse.data?.sessions
      });
      
      if (sessionsResponse.success) {
        setSessions(sessionsResponse.data.sessions);
        if (sessionsResponse.data.pagination) {
          setTotalPages(sessionsResponse.data.pagination.pages);
          setTotalSessions(sessionsResponse.data.pagination.total);
        }
      }

      // Load recordings separately with error handling
      console.log('🎬 Loading recordings for courseId:', courseId);
      try {
        const recordingsResponse = await sessionService.getRecordings(courseId);
        console.log('🎬 Recordings response:', {
          success: recordingsResponse.success,
          recordingsCount: recordingsResponse.data?.recordings?.length || 0,
          recordings: recordingsResponse.data?.recordings
        });
        
        if (recordingsResponse.success) {
          setRecordings(recordingsResponse.data.recordings);
          console.log('🎬 Recordings state set:', recordingsResponse.data.recordings);
        }
      } catch (recordingError) {
        console.warn('🎬 Failed to load recordings:', recordingError);
        
        // Handle authentication errors gracefully
        if (recordingError.response?.status === 401) {
          console.log('User not authenticated for recordings');
        } else if (recordingError.response?.status === 500) {
          console.error('Server error loading recordings:', recordingError.response?.data);
        }
        
        // Don't show error toast for recordings, just log it
        setRecordings([]);
      }
      
    } catch (error: any) {
      console.error('Error loading sessions:', error);
      let errorMessage = "Failed to load sessions. Please try again.";
      
      if (error.response?.status === 404) {
        errorMessage = "Course not found. Please refresh the page and try again.";
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to view sessions for this course.";
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
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = async (sessionId: string) => {
    try {
      const response = await sessionService.joinSession(sessionId);
      if (response.success && response.data.joinUrl) {
        window.open(response.data.joinUrl, '_blank');
      }
    } catch (error: any) {
      console.error('Error joining session:', error);
      let errorMessage = "Failed to join session. Please try again.";
      
      if (error.response?.status === 404) {
        errorMessage = "Session not found. It may have been deleted or cancelled.";
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to join this session.";
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || "Session is not available for joining.";
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
        variant: "destructive"
      });
    }
  };

  const handleLeaveSession = async (sessionId: string) => {
    try {
      await sessionService.leaveSession(sessionId);
      toast({
        title: "Success",
        description: "Left session successfully."
      });
    } catch (error: any) {
      console.error('Error leaving session:', error);
      let errorMessage = "Failed to leave session. Please try again.";
      
      if (error.response?.status === 404) {
        errorMessage = "Session not found. It may have been deleted.";
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to leave this session.";
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || "Cannot leave session at this time.";
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
        variant: "destructive"
      });
    }
  };

  const handleStartSession = async (sessionId: string) => {
    try {
      const response = await sessionService.startSession(sessionId);
      if (response.success && response.data.joinUrl) {
        window.open(response.data.joinUrl, '_blank');
        await loadData(); // Refresh to update session status
      }
    } catch (error: any) {
      console.error('Error starting session:', error);
      let errorMessage = "Failed to start session. Please try again.";
      
      if (error.response?.status === 404) {
        errorMessage = "Session not found. It may have been deleted.";
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to start this session.";
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || "Session cannot be started at this time.";
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
        variant: "destructive"
      });
    }
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      await sessionService.endSession(sessionId);
      toast({
        title: "Success",
        description: "Session ended successfully. Recording will be processed automatically and available shortly."
      });
      
      // Force immediate refresh of session data
      setTimeout(async () => {
        await loadData(); // Refresh to update session status and load recordings
      }, 1000); // Wait 1 second for backend to process
      
    } catch (error: any) {
      console.error('Error ending session:', error);
      let errorMessage = "Failed to end session. Please try again.";
      
      if (error.response?.status === 404) {
        errorMessage = "Session not found. It may have already been ended or deleted.";
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to end this session.";
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || "Session cannot be ended at this time.";
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
        variant: "destructive"
      });
    }
  };

  const handleSyncRecordings = async () => {
    try {
      toast({
        title: "Syncing Recordings",
        description: "Fetching recordings from Zoom... This may take a moment."
      });

      const response = await sessionService.syncRecordings();
      
      if (response.success) {
        toast({
          title: "Success",
          description: `Found ${response.data.totalRecordings} recordings from ${response.data.successfulSessions} sessions.`
        });
        
        // Refresh the data to show new recordings
        await loadData();
      }
    } catch (error: any) {
      console.error('Error syncing recordings:', error);
      toast({
        title: "Error",
        description: "Failed to sync recordings. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadSessionRecording = async (sessionId: string) => {
    try {
      toast({
        title: "Downloading Recording",
        description: "Downloading recording from Zoom to server... This may take a moment."
      });

      const response = await sessionService.downloadRecordingManually(sessionId);
      
      if (response.success) {
        toast({
          title: "Success",
          description: `Downloaded ${response.data.recordings.length} recordings for this session.`
        });
        
        // Refresh the data to show new recordings
        await loadData();
      }
    } catch (error: any) {
      console.error('Error downloading recording:', error);
      toast({
        title: "Error",
        description: "Failed to download recording. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleUploadRecording = async (sessionId: string) => {
    try {
      // Create file input element
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'video/*';
      fileInput.style.display = 'none';
      
      fileInput.onchange = async (event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        
        if (!file) return;
        
        // Check file size (500MB limit)
        if (file.size > 500 * 1024 * 1024) {
          toast({
            title: "Error",
            description: "File size must be less than 500MB",
            variant: "destructive"
          });
          return;
        }
        
        try {
          setLoading(true);
          toast({
            title: "Uploading...",
            description: `Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`,
          });
          
          const response = await sessionService.uploadRecording(sessionId, file);
          
          if (response.success) {
            toast({
              title: "Success",
              description: "Recording uploaded successfully!"
            });
            // Reload data to show the new recording
            loadData();
          } else {
            toast({
              title: "Error",
              description: response.message || "Failed to upload recording",
              variant: "destructive"
            });
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to upload recording",
            variant: "destructive"
          });
        } finally {
          setLoading(false);
          document.body.removeChild(fileInput);
        }
      };
      
      document.body.appendChild(fileInput);
      fileInput.click();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open file selector",
        variant: "destructive"
      });
    }
  };

  const handleWatchRecording = async (sessionId: string) => {
    console.log('🎬 handleWatchRecording called for sessionId:', sessionId);
    console.log('🎬 Available recordings:', recordings.length);
    
    try {
      // Find recording from the already loaded recordings
      const sessionRecording = recordings.find(r => r.sessionId === sessionId);
      console.log('🎬 Found session recording:', sessionRecording);
      
      if (sessionRecording) {
        console.log('🎬 Setting selected recording and opening video player');
        
        // Notify parent component to open video player
        if (onRecordingSelected) {
          console.log('🎬 Notifying parent component of recording selection');
          onRecordingSelected(sessionRecording);
        }
      } else {
        // Fallback: try to fetch from API
        setLoading(true);
        const response = await sessionService.getSessionRecordings(sessionId);
        
        if (response.success && response.data.recordings.length > 0) {
          const recording = response.data.recordings[0];
          if (onRecordingSelected) {
            onRecordingSelected(recording);
          }
        } else {
          toast({
            title: "No Recordings",
            description: "No recordings found for this session",
            variant: "default"
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load recording",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessionToDelete(sessionId);
    setShowDeleteSessionModal(true);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;

    setIsDeletingSession(true);
    try {
      await sessionService.deleteSession(sessionToDelete);
      toast({
        title: "Success",
        description: "Session deleted successfully."
      });
      
      // Refresh sessions list first
      await loadData();
      
      // Call the parent callback if provided (after successful deletion)
      if (onSessionDeleted) {
        onSessionDeleted(sessionToDelete);
      }
    } catch (error: any) {
      console.error('Error deleting session:', error);
      let errorMessage = "Failed to delete session. Please try again.";
      
      if (error.response?.status === 404) {
        errorMessage = "Session not found. It may have already been deleted.";
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to delete this session.";
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
        variant: "destructive"
      });
    } finally {
      setIsDeletingSession(false);
      setShowDeleteSessionModal(false);
      setSessionToDelete(null);
    }
  };

  const handleDownloadRecording = async (recordingId: string, title: string) => {
    try {
      const blob = await sessionService.downloadRecording(recordingId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading recording:', error);
      let errorMessage = "Failed to download recording. Please try again.";
      
      if (error.response?.status === 404) {
        errorMessage = "Recording not found. It may have been deleted.";
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to download this recording.";
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || "Recording is not available for download.";
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
        variant: "destructive"
      });
    }
  };



  const getSessionStatus = (session: Session) => {
    // Check database status first
    if (session.status === 'completed') return 'ended';
    if (session.status === 'cancelled') return 'cancelled';
    if (session.status === 'live') return 'live';
    
    // Fallback to time-based status
    const now = new Date();
    const startTime = new Date(session.scheduledAt);
    const endTime = new Date(session.endTime);

    if (now < startTime) return 'upcoming';
    if (now >= startTime && now <= endTime) return 'live';
    return 'ended';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge className="bg-red-500">Live</Badge>;
      case 'upcoming':
        return <Badge variant="outline">Upcoming</Badge>;
      case 'ended':
        return <Badge variant="secondary">Ended</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-sm text-muted-foreground">Loading sessions...</p>
      </div>
    );
  }

  // Debug logging for recordings display
  console.log('🎬 Rendering component with recordings:', {
    recordingsCount: recordings.length,
    recordings: recordings,
    sessionsCount: sessions.length,
    sessions: sessions
  });
  
  // Log first few recordings to see their structure
  if (recordings.length > 0) {
    console.log('🎬 First recording structure:', {
      firstRecording: recordings[0],
      sessionId: recordings[0]?.sessionId,
      title: recordings[0]?.title,
      recordingUrl: recordings[0]?.recordingUrl
    });
  }

  return (
    <div className="space-y-6">
      {/* Header with Sync Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sessions & Recordings</h2>
          <p className="text-muted-foreground">Manage your live sessions and recordings</p>
          <p className="text-sm text-muted-foreground">Debug: {recordings.length} recordings, {sessions.length} sessions</p>
        </div>
        {(isInstructor || isAdmin) && (
          <Button 
            onClick={handleSyncRecordings}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Sync Recordings
          </Button>
        )}
      </div>

      {/* Sessions List */}
      <div>
        {sessions.length > 0 ? (
          <div className="space-y-4">
            {sessions.map((session) => {
              const status = getSessionStatus(session);
              const startTime = new Date(session.scheduledAt);
              
              // Debug session recording info
              console.log('🎬 Session recording info:', {
                sessionId: session._id,
                title: session.title,
                hasRecording: session.hasRecording,
                scheduledAt: session.scheduledAt
              });
              const endTime = new Date(session.endTime);

              return (
                <Card key={session._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Video className="h-5 w-5 text-blue-600" />
                          <h3 className="font-semibold">{session.title}</h3>
                          {getStatusBadge(status)}
                        </div>
                        
                        {session.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {session.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {startTime.toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {startTime.toLocaleTimeString()} - {endTime.toLocaleTimeString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {session.type}
                          </div>
                          {session.maxParticipants && (
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              Max: {session.maxParticipants}
                            </div>
                          )}
                        </div>

                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {status === 'live' && (
                          <Button
                            size="sm"
                            onClick={() => handleJoinSession(session._id)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Join Live
                          </Button>
                        )}

                        {status === 'upcoming' && (
                          <>
                            {(isInstructor || isAdmin) ? (
                              <Button
                                size="sm"
                                onClick={() => handleStartSession(session._id)}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Start
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleJoinSession(session._id)}
                                disabled={status !== 'live' && status !== 'upcoming'}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                {status === 'live' ? 'Join Live' : 'Join'}
                              </Button>
                            )}
                            
                            {/* Leave Session button for live sessions */}
                            {status === 'live' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleLeaveSession(session._id)}
                              >
                                <LogOut className="h-4 w-4 mr-2" />
                                Leave Session
                              </Button>
                            )}
                          </>
                        )}

                        {/* Show recording button for all users */}
                        {session.hasRecording && (
                          <Button   
                            size="sm"
                            variant="outline"
                            onClick={() => handleWatchRecording(session._id)}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Watch Recording
                          </Button>
                        )}

                        {(isInstructor || isAdmin) && (
                          <>
                            {status === 'live' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEndSession(session._id)}
                              >
                                End Session
                              </Button>
                            )}
                            
                            {status === 'ended' && !session.hasRecording && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadSessionRecording(session._id)}
                                disabled={loading}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download Recording
                              </Button>
                            )}
                            
                            {status === 'ended' && !session.hasRecording && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUploadRecording(session._id)}
                                disabled={loading}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Recording
                              </Button>
                            )}
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteSession(session._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No sessions scheduled</h3>
            <p className="text-muted-foreground">
              {(isInstructor || isAdmin)
                ? "Schedule your first live session to get started." 
                : "Your instructor hasn't scheduled any sessions yet."}
            </p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {sessions.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * sessionsPerPage) + 1} to {Math.min(currentPage * sessionsPerPage, totalSessions)} of {totalSessions} sessions
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            {/* Page Numbers */}
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
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </Button>
          </div>
        </div>
      )}

      {/* Delete Session Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteSessionModal}
        onClose={() => {
          setShowDeleteSessionModal(false);
          setSessionToDelete(null);
        }}
        onConfirm={confirmDeleteSession}
        title="Delete Session"
        description="Are you sure you want to delete this session? This action cannot be undone."
        confirmText="Delete Session"
        cancelText="Cancel"
        variant="destructive"
        isLoading={isDeletingSession}
      />
    </div>
  );
};

export default SessionsAndRecordings;
