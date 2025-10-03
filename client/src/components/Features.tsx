import { Video, Users, Award, Calendar, MessageSquare, Clock } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Video,
      title: "HD Video Content",
      description: "Stream high-quality video lessons with interactive transcripts and bookmarks."
    },
    {
      icon: Users,
      title: "Live Sessions",
      description: "Join real-time classes with instructors and fellow students via integrated Zoom."
    },
    {
      icon: Award,
      title: "Certificates",
      description: "Earn verified certificates upon course completion to showcase your achievements."
    },
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "Sync with your calendar and never miss a class or deadline."
    },
    {
      icon: MessageSquare,
      title: "Discussion Forums",
      description: "Engage with instructors and peers in course-specific chat rooms."
    },
    {
      icon: Clock,
      title: "Self-Paced Learning",
      description: "Learn at your own speed with lifetime access to course materials."
    }
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our comprehensive learning platform provides all the tools and support you need to achieve your goals.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className="bg-card rounded-xl p-6 shadow-medium hover:shadow-large transition-all duration-200 hover:-translate-y-1 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-card-foreground">
                  {feature.title}
                </h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;