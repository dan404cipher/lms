import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import sessionService, { SessionData } from "@/services/sessionService";
import { 
  ArrowLeft, 
  Video, 
  MapPin, 
  Plus, 
  Trash2, 
  Calendar,
  Clock,
  User,
  Loader2
} from "lucide-react";

interface ScheduleSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId?: string;
  onSessionCreated?: () => void;
}

const ScheduleSessionModal = ({ isOpen, onClose, courseId, onSessionCreated }: ScheduleSessionModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [sessionName, setSessionName] = useState("");
  const [description, setDescription] = useState("");
  const [sessionType, setSessionType] = useState<"live-class" | "office-hours" | "review">("live-class");
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState<"live" | "in-person">("live");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [maxParticipants, setMaxParticipants] = useState<number | undefined>(undefined);
  
  // Calendar state
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [sessions, setSessions] = useState<any[]>([]);

  // Initialize form with current date/time
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0); // Default to 10 AM tomorrow
      
      setSelectedDate(tomorrow.toISOString().split('T')[0]);
      setSelectedTime(tomorrow.toTimeString().slice(0, 5));
      setSessionName("");
      setDescription("");
      setSessionType("live-class");
      setDuration(60);
      setLocation("live");
      setMaxParticipants(undefined);
    }
  }, [isOpen]);

  // Load existing sessions for calendar display
  useEffect(() => {
    if (isOpen && courseId) {
      loadSessions();
    }
  }, [isOpen, courseId]);

  const loadSessions = async () => {
    try {
      const response = await sessionService.getSessions(courseId);
      if (response.success) {
        setSessions(response.data.sessions);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!courseId || !sessionName.trim() || !selectedDate || !selectedTime) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Combine date and time
      const scheduledAt = new Date(`${selectedDate}T${selectedTime}`).toISOString();
      
      const sessionData: SessionData = {
        courseId,
        title: sessionName,
        description,
        scheduledAt,
        duration,
        type: sessionType,
        maxParticipants
      };

      const response = await sessionService.createSession(sessionData);
      
      if (response.success) {
        toast({
          title: "Success!",
          description: "Session scheduled successfully with Zoom integration.",
        });
        
        onSessionCreated?.();
        onClose();
      }
    } catch (error: any) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to schedule session. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate week dates
  const getWeekDates = () => {
    const week = [];
    const startOfWeek = new Date(currentWeek);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      week.push(date);
    }
    
    return week;
  };

  const weekDates = getWeekDates();
  const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  
  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30"
  ];

  const formatTimeForDisplay = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getTimeCategory = (time: string) => {
    const [hours] = time.split(':');
    const hour = parseInt(hours);
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-semibold">Schedule sessions</h1>
          </div>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSubmitting ? 'Creating...' : 'Create Session'}
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column - Session Details Form */}
          <div className="w-1/2 p-6 border-r overflow-y-auto">
            <div className="space-y-6">
              {/* Session Name */}
              <div className="space-y-2">
                <Label htmlFor="session-name">Session name *</Label>
                <Input
                  id="session-name"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="Enter session name"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter session description (optional)"
                  rows={3}
                />
              </div>

              {/* Session Type */}
              <div className="space-y-2">
                <Label htmlFor="session-type">Session Type</Label>
                <Select value={sessionType} onValueChange={(value: "live-class" | "office-hours" | "review") => setSessionType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live-class">Live Class</SelectItem>
                    <SelectItem value="office-hours">Office Hours</SelectItem>
                    <SelectItem value="review">Review Session</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label>Location</Label>
                <div className="flex gap-2">
                  <Button
                    variant={location === "live" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLocation("live")}
                    className="flex items-center gap-2"
                  >
                    <Video className="h-4 w-4" />
                    Live
                  </Button>
                  <Button
                    variant={location === "in-person" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLocation("in-person")}
                    className="flex items-center gap-2"
                  >
                    <MapPin className="h-4 w-4" />
                    In-Person
                  </Button>
                </div>
              </div>

              {/* Max Participants */}
              <div className="space-y-2">
                <Label htmlFor="max-participants">Max Participants (Optional)</Label>
                <Input
                  id="max-participants"
                  type="number"
                  value={maxParticipants || ""}
                  onChange={(e) => setMaxParticipants(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Leave empty for unlimited"
                  min="1"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for unlimited participants
                </p>
              </div>

              {/* Date & Time */}
              <div className="space-y-4">
                <Label>Date & Time *</Label>
                
                {/* Selected Date & Time Display */}
                {selectedDate && selectedTime && (
                  <div className="p-4 bg-muted/20 rounded-lg border">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="h-4 w-4" />
                      <span>Selected Schedule:</span>
                    </div>
                    <div className="font-medium">
                      {new Date(selectedDate).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatTimeForDisplay(selectedTime)} ({selectedTime})
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <div className="flex gap-2 items-center">
                      {/* Hour Selector */}
                      <Select 
                        value={selectedTime ? selectedTime.split(':')[0] : '10'} 
                        onValueChange={(hour) => {
                          const currentMinute = selectedTime ? selectedTime.split(':')[1] : '00';
                          setSelectedTime(`${hour.padStart(2, '0')}:${currentMinute}`);
                        }}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({length: 24}, (_, i) => (
                            <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                              {i === 0 ? '12' : i > 12 ? (i - 12).toString() : i.toString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <span className="text-lg font-medium">:</span>
                      
                      {/* Minute Selector */}
                      <Select 
                        value={selectedTime ? selectedTime.split(':')[1] : '00'} 
                        onValueChange={(minute) => {
                          const currentHour = selectedTime ? selectedTime.split(':')[0] : '10';
                          setSelectedTime(`${currentHour}:${minute.padStart(2, '0')}`);
                        }}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({length: 60}, (_, i) => (
                            <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                              {i.toString().padStart(2, '0')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {/* AM/PM Selector */}
                      <Select 
                        value={selectedTime ? (parseInt(selectedTime.split(':')[0]) >= 12 ? 'PM' : 'AM') : 'AM'} 
                        onValueChange={(ampm) => {
                          const [hour, minute] = selectedTime ? selectedTime.split(':') : ['10', '00'];
                          let newHour = parseInt(hour);
                          
                          if (ampm === 'PM' && newHour < 12) {
                            newHour += 12;
                          } else if (ampm === 'AM' && newHour >= 12) {
                            newHour -= 12;
                          }
                          
                          setSelectedTime(`${newHour.toString().padStart(2, '0')}:${minute}`);
                        }}
                      >
                        <SelectTrigger className="w-16">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AM">AM</SelectItem>
                          <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Display current selection */}
                    <div className="text-sm text-muted-foreground">
                      Selected: {selectedTime ? formatTimeForDisplay(selectedTime) : 'No time selected'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Timezone */}
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">Asia/Kolkata (GMT+5:30)</SelectItem>
                    <SelectItem value="America/New_York">America/New_York (GMT-5:00)</SelectItem>
                    <SelectItem value="Europe/London">Europe/London (GMT+0:00)</SelectItem>
                    <SelectItem value="America/Los_Angeles">America/Los_Angeles (GMT-8:00)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Asia/Tokyo (GMT+9:00)</SelectItem>
                    <SelectItem value="Australia/Sydney">Australia/Sydney (GMT+10:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Right Column - Calendar */}
          <div className="w-1/2 p-6 flex flex-col">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())}>
                  Today
                </Button>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      const prevWeek = new Date(currentWeek);
                      prevWeek.setDate(prevWeek.getDate() - 7);
                      setCurrentWeek(prevWeek);
                    }}
                  >
                    ‹
                  </Button>
                  <span className="text-sm font-medium">
                    {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      const nextWeek = new Date(currentWeek);
                      nextWeek.setDate(nextWeek.getDate() + 7);
                      setCurrentWeek(nextWeek);
                    }}
                  >
                    ›
                  </Button>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full flex flex-col">
                {/* Days Header */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {weekDays.map((day, index) => {
                    const date = weekDates[index];
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isSelected = selectedDate === date.toISOString().split('T')[0];
                    
                    return (
                      <div 
                        key={day} 
                        className="text-center p-2 cursor-pointer hover:bg-muted/50 rounded"
                        onClick={() => setSelectedDate(date.toISOString().split('T')[0])}
                      >
                        <div className="text-xs font-medium text-muted-foreground">{day}</div>
                        <div className={`text-sm font-medium mt-1 w-8 h-8 rounded-full flex items-center justify-center mx-auto ${
                          isSelected ? 'bg-primary text-primary-foreground' : 
                          isToday ? 'bg-muted text-foreground' : ''
                        }`}>
                          {date.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Time Selection */}
                <div className="mb-3">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Select Time</h3>
                </div>
                
                {/* Time Slots Grid */}
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-1">
                    {timeSlots.map((time) => {
                      const isSelected = selectedTime === time;
                      
                      return (
                        <div 
                          key={time} 
                          className={`p-3 rounded-lg cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-primary text-primary-foreground shadow-sm' 
                              : 'hover:bg-muted/50 border border-transparent hover:border-border'
                          }`}
                          onClick={() => setSelectedTime(time)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{formatTimeForDisplay(time)}</span>
                            {isSelected && (
                              <div className="text-xs bg-primary-foreground/20 px-2 py-1 rounded">
                                Selected
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleSessionModal;
