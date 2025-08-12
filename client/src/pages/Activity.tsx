import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

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
  CheckCircle
} from "lucide-react";

interface Activity {
  _id: string;
  type: 'live-class' | 'quiz' | 'assignment' | 'discussion' | 'residency';
  title: string;
  subtitle: string;
  instructor: string;
  date: string;
  time?: string;
  duration?: string;
  status: 'ongoing' | 'upcoming' | 'completed' | 'missed';
  courseCode?: string;
  hasRecording?: boolean;
}

const Activity = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    types: {
      'live-class': false,
      quiz: false,
      assignment: false,
      discussion: false,
      residency: false
    },
    status: {
      ongoing: false,
      upcoming: false,
      completed: false,
      missed: false
    }
  });

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const response = await activityService.getMyActivities();
        setActivities(response.data.activities);
      } catch (error) {
        console.error('Error fetching activities:', error);
        // Fallback to empty array if API fails
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'live-class':
        return <Video className="h-5 w-5 text-green-600" />;
      case 'quiz':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'assignment':
        return <FileText className="h-5 w-5 text-purple-600" />;
      case 'discussion':
        return <MessageSquare className="h-5 w-5 text-orange-600" />;
      case 'residency':
        return <Building className="h-5 w-5 text-indigo-600" />;
      default:
        return <Calendar className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: Activity['status']) => {
    const statusConfig = {
      ongoing: { color: "bg-green-100 text-green-800", text: "Ongoing" },
      upcoming: { color: "bg-blue-100 text-blue-800", text: "Upcoming" },
      completed: { color: "bg-gray-100 text-gray-800", text: "Completed" },
      missed: { color: "bg-red-100 text-red-800", text: "Missed" }
    };
    
    const config = statusConfig[status];
    return (
      <Badge className={`${config.color} text-xs`}>
        {config.text}
      </Badge>
    );
  };

  const filteredActivities = activities.filter(activity => {
    const typeFilter = Object.values(filters.types).every(v => !v) || filters.types[activity.type];
    const statusFilter = Object.values(filters.status).every(v => !v) || filters.status[activity.status];
    return typeFilter && statusFilter;
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
        <div className="mb-3">
          <h1 className="text-xl font-bold text-foreground">Activities</h1>
        </div>

              <div className="flex gap-4">
        {/* Filter Sidebar */}
        <div className="w-64 flex-shrink-0">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Filter by</h3>
              
              {/* Type Filters */}
              <div className="mb-6">
                <h4 className="font-medium text-sm text-foreground mb-3">TYPE:</h4>
                <div className="space-y-2">
                  {Object.entries(filters.types).map(([type, checked]) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={type}
                        checked={checked}
                        onCheckedChange={(checked) => 
                          setFilters(prev => ({
                            ...prev,
                            types: { ...prev.types, [type]: checked as boolean }
                          }))
                        }
                      />
                      <label htmlFor={type} className="text-sm text-foreground capitalize">
                        {type.replace('-', ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Filters */}
              <div>
                <h4 className="font-medium text-sm text-foreground mb-3">STATUS:</h4>
                <div className="space-y-2">
                  {Object.entries(filters.status).map(([status, checked]) => (
                    <div key={status} className="flex items-center space-x-2">
                      <Checkbox
                        id={status}
                        checked={checked}
                        onCheckedChange={(checked) => 
                          setFilters(prev => ({
                            ...prev,
                            status: { ...prev.status, [status]: checked as boolean }
                          }))
                        }
                      />
                      <label htmlFor={status} className="text-sm text-foreground capitalize">
                        {status}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activities List */}
        <div className="flex-1">
          <div className="space-y-6">
            {filteredActivities.map((activity) => (
              <Card key={activity._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {getActivityIcon(activity.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-sm text-muted-foreground">
                            {activity.subtitle}
                          </p>
                          {activity.status === 'completed' && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        
                        <h3 className="font-semibold text-foreground mb-2">
                          {activity.title}
                        </h3>
                        
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{activity.date}</span>
                          {activity.time && (
                            <>
                              <span>{activity.time}</span>
                              <Clock className="h-4 w-4" />
                            </>
                          )}
                          {activity.duration && (
                            <span>{activity.duration}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {getStatusBadge(activity.status)}
                      
                      {activity.hasRecording ? (
                        <Button size="sm" variant="default">
                          <Play className="h-4 w-4 mr-1" />
                          Watch Recording
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredActivities.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No activities found with the current filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Activity;
