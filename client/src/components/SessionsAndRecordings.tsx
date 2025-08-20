import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import sessionService, { Session, Recording } from "@/services/sessionService";
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
  Upload
} from "lucide-react";

interface SessionsAndRecordingsProps {
  courseId: string;
  isInstructor: boolean;
}

const SessionsAndRecordings = ({ courseId, isInstructor }: SessionsAndRecordingsProps) => {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("sessions");
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  useEffect(() => {
    loadData();
  }, [courseId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load sessions first
      const sessionsResponse = await sessionService.getSessions(courseId);
      if (sessionsResponse.success) {
        setSessions(sessionsResponse.data.sessions);
      }

      // Load recordings separately with error handling
      try {
        const recordingsResponse = await sessionService.getRecordings(courseId);
        if (recordingsResponse.success) {
          setRecordings(recordingsResponse.data.recordings);
        }
      } catch (recordingError) {
        console.warn('Failed to load recordings:', recordingError);
        
        // Handle authentication errors gracefully
        if (recordingError.response?.status === 401) {
          console.log('User not authenticated for recordings');
        } else if (recordingError.response?.status === 500) {
          console.error('Server error loading recordings:', recordingError.response?.data);
        }
        
        // Don't show error toast for recordings, just log it
        setRecordings([]);
      }
      
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load sessions.",
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
    } catch (error) {
      console.error('Error joining session:', error);
      toast({
        title: "Error",
        description: "Failed to join session. Please try again.",
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
    } catch (error) {
      console.error('Error starting session:', error);
      toast({
        title: "Error",
        description: "Failed to start session. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      await sessionService.endSession(sessionId);
      toast({
        title: "Success",
        description: "Session ended successfully."
      });
      
      // Force immediate refresh of session data
      setTimeout(async () => {
        await loadData(); // Refresh to update session status and load recordings
      }, 1000); // Wait 1 second for backend to process
      
    } catch (error) {
      console.error('Error ending session:', error);
      toast({
        title: "Error",
        description: "Failed to end session. Please try again.",
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
    try {
      // Find recording from the already loaded recordings
      const sessionRecording = recordings.find(r => r.sessionId === sessionId);
      
      if (sessionRecording) {
        setSelectedRecording(sessionRecording);
        setShowVideoPlayer(true);
      } else {
        // Fallback: try to fetch from API
        setLoading(true);
        const response = await sessionService.getSessionRecordings(sessionId);
        
        if (response.success && response.data.recordings.length > 0) {
          const recording = response.data.recordings[0];
          setSelectedRecording(recording);
          setShowVideoPlayer(true);
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

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this session?")) return;

    try {
      await sessionService.deleteSession(sessionId);
      toast({
        title: "Success",
        description: "Session deleted successfully."
      });
      await loadData(); // Refresh sessions list
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Error",
        description: "Failed to delete session. Please try again.",
        variant: "destructive"
      });
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
    } catch (error) {
      console.error('Error downloading recording:', error);
      toast({
        title: "Error",
        description: "Failed to download recording. Please try again.",
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

  return (
    <div className="space-y-6">
      {/* Sessions List */}
      <div>
        {sessions.length > 0 ? (
          <div className="space-y-4">
            {sessions.map((session) => {
              const status = getSessionStatus(session);
              const startTime = new Date(session.scheduledAt);
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
                            {isInstructor ? (
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
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Join
                              </Button>
                            )}
                          </>
                        )}

                        {isInstructor && (
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
                                onClick={() => handleUploadRecording(session._id)}
                                disabled={loading}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Recording
                              </Button>
                            )}
                            
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
              {isInstructor 
                ? "Schedule your first live session to get started." 
                : "Your instructor hasn't scheduled any sessions yet."}
            </p>
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      <Dialog open={showVideoPlayer} onOpenChange={setShowVideoPlayer}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>{selectedRecording?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedRecording && (
              <div className="relative">
                <video
                  controls
                  className="w-full h-auto max-h-[70vh] rounded-lg shadow-sm"
                  preload="metadata"
                  autoPlay
                  onError={(e) => {
                    console.error('Video error:', e);
                    toast({
                      title: "Video Error",
                      description: "Could not load the recording. Please try downloading it instead.",
                      variant: "destructive"
                    });
                  }}
                >
                  <source src={selectedRecording.recordingUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                
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
    </div>
  );
};

export default SessionsAndRecordings;
