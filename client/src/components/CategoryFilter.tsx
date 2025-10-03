import { Badge } from "@/components/ui/badge";

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const CategoryFilter = ({ categories, selectedCategory, onCategoryChange }: CategoryFilterProps) => {
  return (
    <div className="flex flex-wrap gap-3 mb-8">
      <Badge
        variant={selectedCategory === "All" ? "default" : "secondary"}
        className={`cursor-pointer px-4 py-2 ${
          selectedCategory === "All" 
            ? "bg-primary text-primary-foreground" 
            : "hover:bg-primary/10 hover:text-primary"
        } transition-colors`}
        onClick={() => onCategoryChange("All")}
      >
        All Courses
      </Badge>
      {categories.map((category) => (
        <Badge
          key={category}
          variant={selectedCategory === category ? "default" : "secondary"}
          className={`cursor-pointer px-4 py-2 ${
            selectedCategory === category 
              ? "bg-primary text-primary-foreground" 
              : "hover:bg-primary/10 hover:text-primary"
          } transition-colors`}
          onClick={() => onCategoryChange(category)}
        >
          {category}
        </Badge>
      ))}
    </div>
  );
};

export default CategoryFilter;