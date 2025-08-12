import { useState, memo } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { BookOpen, User, Menu, X, Search, LogOut, LayoutDashboard, GraduationCap, Activity } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

const Navbar = memo(() => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    // Add a small delay for smoother transition
    setTimeout(() => {
      navigate(path);
    }, 100);
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div 
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => handleNavigation("/")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <BookOpen className="h-8 w-8 text-primary" />
            </motion.div>
            <span className="text-xl font-bold text-primary">
              Axess Upskill
            </span>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {user ? (
              <>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link 
                    to={user.role === 'instructor' ? "/instructor/dashboard" : "/dashboard"} 
                    className={`text-foreground hover:text-primary transition-all duration-200 font-medium flex items-center space-x-2 ${
                      location.pathname === (user.role === 'instructor' ? "/instructor/dashboard" : "/dashboard") 
                        ? 'text-primary' 
                        : ''
                    }`}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>{user.role === 'instructor' ? 'Instructor Dashboard' : 'Dashboard'}</span>
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link 
                    to="/courses" 
                    className={`text-foreground hover:text-primary transition-all duration-200 font-medium flex items-center space-x-2 ${
                      location.pathname.startsWith('/courses') ? 'text-primary' : ''
                    }`}
                  >
                    <GraduationCap className="h-4 w-4" />
                    <span>Courses</span>
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link 
                    to="/activity" 
                    className={`text-foreground hover:text-primary transition-all duration-200 font-medium flex items-center space-x-2 ${
                      location.pathname === '/activity' ? 'text-primary' : ''
                    }`}
                  >
                    <Activity className="h-4 w-4" />
                    <span>Activity</span>
                  </Link>
                </motion.div>
              </>
            ) : (
              <>
                <motion.a 
                  href="#" 
                  className="text-foreground hover:text-primary transition-colors duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Courses
                </motion.a>
                <motion.a 
                  href="#" 
                  className="text-foreground hover:text-primary transition-colors duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Categories
                </motion.a>
                <motion.a 
                  href="#" 
                  className="text-foreground hover:text-primary transition-colors duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  About
                </motion.a>
              </>
            )}
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex items-center space-x-4 flex-1 max-w-md mx-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                className="pl-10 bg-muted/50 border-muted-foreground/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    variant="ghost" 
                    onClick={() => { 
                      logout(); 
                      setTimeout(() => navigate("/"), 100); 
                    }}
                    className="transition-all duration-200"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </motion.div>
              </>
            ) : (
              <>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    variant="ghost" 
                    onClick={() => handleNavigation("/login")}
                    className="transition-all duration-200"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    variant="hero" 
                    onClick={() => handleNavigation("/register")}
                    className="transition-all duration-200"
                  >
                    Get Started
                  </Button>
                </motion.div>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 space-y-4 border-t border-border animate-fade-in">
            <div className="flex space-x-2">
              <Search className="h-4 w-4 text-muted-foreground mt-3 ml-3" />
              <Input
                placeholder="Search courses..."
                className="bg-muted/50 border-muted-foreground/20"
              />
            </div>
            <div className="space-y-2">
              {user ? (
                <>
                  <Link to={user.role === 'instructor' ? "/instructor/dashboard" : "/dashboard"} className="block px-3 py-2 text-foreground hover:text-primary transition-colors">
                    {user.role === 'instructor' ? 'Instructor Dashboard' : 'Dashboard'}
                  </Link>
                  <Link to="/courses" className="block px-3 py-2 text-foreground hover:text-primary transition-colors">
                    Courses
                  </Link>
                  <Link to="/activity" className="block px-3 py-2 text-foreground hover:text-primary transition-colors">
                    Activity
                  </Link>
                </>
              ) : (
                <>
                  <a href="#" className="block px-3 py-2 text-foreground hover:text-primary transition-colors">
                    Courses
                  </a>
                  <a href="#" className="block px-3 py-2 text-foreground hover:text-primary transition-colors">
                    Categories
                  </a>
                  <a href="#" className="block px-3 py-2 text-foreground hover:text-primary transition-colors">
                    About
                  </a>
                </>
              )}
            </div>
            <div className="flex flex-col space-y-2 px-3">
              {user ? (
                <>
                  <Button variant="ghost" className="justify-start" onClick={() => { logout(); navigate("/"); }}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" className="justify-start" onClick={() => navigate("/login")}>
                    <User className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                  <Button variant="hero" className="justify-start" onClick={() => navigate("/register")}>
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
});

Navbar.displayName = 'Navbar';

export default Navbar;