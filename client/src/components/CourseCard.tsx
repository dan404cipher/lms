import { Clock, Users, Star, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface CourseCardProps {
  title: string;
  instructor: string;
  description: string;
  duration: string;
  students: number;
  rating: number;
  price: number;
  category: string;
  thumbnail: string;
}

const CourseCard = ({
  title,
  instructor,
  description,
  duration,
  students,
  rating,
  price,
  category,
  thumbnail,
}: CourseCardProps) => {
  const navigate=useNavigate();
  return (
    <div className="group bg-card rounded-xl overflow-hidden shadow-medium hover:shadow-large transition-all duration-200 hover:-translate-y-1 animate-scale-in" onClick={()=>navigate('/courses')}>
      <div className="relative overflow-hidden">
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-4 left-4">
          <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
            {category}
          </Badge>
        </div>
        <div className="absolute top-4 right-4">
          <Badge variant="outline" className="bg-background/90 backdrop-blur-sm font-semibold">
            ${price}
          </Badge>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center space-x-2 mb-3">
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
            <span className="text-sm font-medium ml-1">{rating}</span>
          </div>
          <span className="text-muted-foreground">•</span>
          <div className="flex items-center text-muted-foreground">
            <Users className="h-4 w-4 mr-1" />
            <span className="text-sm">{students.toLocaleString()} students</span>
          </div>
        </div>

        <h3 className="text-lg font-bold text-card-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
        
        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
          {description}
        </p>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">by {instructor}</p>
          <div className="flex items-center text-muted-foreground">
            <Clock className="h-4 w-4 mr-1" />
            <span className="text-sm">{duration}</span>
          </div>
        </div>

        {/* <Button className="w-full" variant="hero">
          <BookOpen className="h-4 w-4 mr-2" />
          View Course
        </Button> */}
      </div>
    </div>
  );
};

export default CourseCard;