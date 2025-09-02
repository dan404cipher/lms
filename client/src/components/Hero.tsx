import { Button } from "@/components/ui/button";
import { Play, ArrowRight, BookOpen, Users, Award } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-[600px] flex items-center bg-primary overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:50px_50px]" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/10 to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center px-4 py-2 bg-background/20 backdrop-blur-sm rounded-full mb-6 animate-fade-in">
              <Award className="h-4 w-4 text-primary-foreground mr-2" />
              <span className="text-primary-foreground text-sm font-medium">
                #1 Learning Platform
              </span>
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-bold text-primary-foreground mb-6 animate-slide-up">
              Learn Without
              <span className="block text-primary-foreground/90">
                Limits
              </span>
            </h1>
            
            <p className="text-xl text-primary-foreground/90 mb-8 leading-relaxed animate-slide-up [animation-delay:0.2s]">
              Discover thousands of courses, connect with expert instructors, and advance your career with our comprehensive learning management system.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 animate-slide-up [animation-delay:0.4s]">
              <Button size="lg" variant="hero" className="bg-background text-primary hover:bg-background/90 shadow-medium">
                <BookOpen className="h-5 w-5 mr-2" />
                Explore Courses
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="border-white/20 text-blue-500 hover:bg-white/10">
                <Play className="h-5 w-5 mr-2" />
                Watch Demo
              </Button>
            </div>
            
            <div className="flex items-center justify-center lg:justify-start space-x-8 mt-12 animate-fade-in [animation-delay:0.6s]">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-foreground">50K+</div>
                <div className="text-primary-foreground/80 text-sm">Students</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-foreground">1.2K+</div>
                <div className="text-primary-foreground/80 text-sm">Courses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-foreground">98%</div>
                <div className="text-primary-foreground/80 text-sm">Success Rate</div>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:block animate-fade-in [animation-delay:0.3s]">
            <div className="relative">
              <div className="relative bg-background/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-large">
                <div className="space-y-6">
                  <div className="flex items-center space-x-4 p-4 bg-background/20 rounded-lg border border-white/10">
                    <Users className="h-8 w-8 text-primary-foreground" />
                    <div>
                      <div className="text-primary-foreground font-semibold">Live Sessions</div>
                      <div className="text-primary-foreground/80 text-sm">Interactive learning</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 p-4 bg-background/20 rounded-lg border border-white/10">
                    <BookOpen className="h-8 w-8 text-primary-foreground" />
                    <div>
                      <div className="text-primary-foreground font-semibold">Expert Content</div>
                      <div className="text-primary-foreground/80 text-sm">Industry professionals</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 p-4 bg-background/20 rounded-lg border border-white/10">
                    <Award className="h-8 w-8 text-primary-foreground" />
                    <div>
                      <div className="text-primary-foreground font-semibold">Certificates</div>
                      <div className="text-primary-foreground/80 text-sm">Recognized credentials</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;