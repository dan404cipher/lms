import { useState } from "react";

import Hero from "@/components/Hero";
import Features from "@/components/Features";
import CourseCard from "@/components/CourseCard";
import CategoryFilter from "@/components/CategoryFilter";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

// Import course images
import course1 from "@/assets/course1.jpg";
import course2 from "@/assets/course2.jpg";
import course3 from "@/assets/course3.jpg";
import course4 from "@/assets/course4.jpg";

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const courses = [
    {
      title: "Complete Web Development Bootcamp",
      instructor: "Sarah Johnson",
      description: "Master modern web development with React, Node.js, and TypeScript. Build real-world projects.",
      duration: "40 hours",
      students: 12543,
      rating: 4.8,
      price: 99,
      category: "Development",
      thumbnail: course1,
    },
    {
      title: "Data Science with Python",
      instructor: "Dr. Michael Chen",
      description: "Learn data analysis, machine learning, and visualization with Python and popular libraries.",
      duration: "35 hours",
      students: 8921,
      rating: 4.9,
      price: 129,
      category: "Data Science",
      thumbnail: course2,
    },
    {
      title: "Digital Marketing Mastery",
      instructor: "Emma Rodriguez",
      description: "Complete guide to digital marketing including SEO, social media, and conversion optimization.",
      duration: "25 hours",
      students: 15677,
      rating: 4.7,
      price: 79,
      category: "Marketing",
      thumbnail: course3,
    },
    {
      title: "UI/UX Design Fundamentals",
      instructor: "Alex Thompson",
      description: "Learn design principles, user research, prototyping, and create stunning user interfaces.",
      duration: "30 hours",
      students: 9834,
      rating: 4.8,
      price: 89,
      category: "Design",
      thumbnail: course4,
    },
    {
      title: "Advanced React Development",
      instructor: "David Park",
      description: "Deep dive into React hooks, context, testing, and performance optimization techniques.",
      duration: "28 hours",
      students: 6542,
      rating: 4.9,
      price: 109,
      category: "Development",
      thumbnail: course1,
    },
    {
      title: "Machine Learning Essentials",
      instructor: "Dr. Lisa Wang",
      description: "Introduction to ML algorithms, supervised learning, and practical applications with Python.",
      duration: "45 hours",
      students: 7821,
      rating: 4.8,
      price: 149,
      category: "Data Science",
      thumbnail: course2,
    },
  ];

  const categories = [...new Set(courses.map(course => course.category))];

  const filteredCourses = selectedCategory === "All" 
    ? courses 
    : courses.filter(course => course.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <Features />
      
      {/* Course Catalog Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Popular Courses
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Discover courses taught by industry experts and advance your career with practical skills.
            </p>
          </div>

          <CategoryFilter 
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {filteredCourses.slice(0, 6).map((course, index) => (
              <CourseCard
                key={`${course.title}-${index}`}
                {...course}
              />
            ))}
          </div>

          <div className="text-center">
            <Button variant="outline" size="lg">
              View All Courses
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/30 py-12">
        <div className="container mx-auto px-4">
                      <div className="grid md:grid-cols-4 gap-4">
            <div>
              <h3 className="font-bold text-foreground mb-4">Axess Upskill</h3>
              <p className="text-muted-foreground">
                Empowering learners worldwide with high-quality education and expert instruction.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Courses</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Development</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Data Science</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Design</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Marketing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Support</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 Axess Upskill. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
