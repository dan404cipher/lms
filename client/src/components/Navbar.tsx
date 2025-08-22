import { useState, memo } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Menu, X, Search, LogOut, LayoutDashboard, GraduationCap, Activity, Users, Settings } from "lucide-react";
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
            <span className="text-xl font-semibold text-primary">
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
                    to={
                      user.role === 'instructor' ? "/instructor/dashboard" : 
                      user.role === 'admin' || user.role === 'super_admin' ? "/admin/dashboard" : 
                      "/dashboard"
                    } 
                    className={`text-foreground hover:text-primary transition-all duration-200 font-medium flex items-center space-x-2 ${
                      location.pathname === (
                        user.role === 'instructor' ? "/instructor/dashboard" : 
                        user.role === 'admin' || user.role === 'super_admin' ? "/admin/dashboard" : 
                        "/dashboard"
                      ) 
                        ? 'text-primary' 
                        : ''
                    }`}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>{
                      user.role === 'instructor' ? 'Instructor Dashboard' : 
                      user.role === 'admin' || user.role === 'super_admin' ? 'Admin Dashboard' : 
                      'Dashboard'
                    }</span>
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
                {(user.role === 'admin' || user.role === 'super_admin') && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link 
                      to="/admin/users" 
                      className={`text-foreground hover:text-primary transition-all duration-200 font-medium flex items-center space-x-2 ${
                        location.pathname === '/admin/users' ? 'text-primary' : ''
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      <span>Users</span>
                    </Link>
                  </motion.div>
                )}
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
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profile?.avatar} alt={user.name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                        <p className="text-xs leading-none text-muted-foreground capitalize">
                          {user.role.replace('_', ' ')}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/settings")}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => { 
                        logout(); 
                        setTimeout(() => navigate("/"), 100); 
                      }}
                      className="text-red-600 focus:text-red-600"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
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
            {user && (
              <div className="px-3 py-2 border-b border-border">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.profile?.avatar} alt={user.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user.role.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              </div>
            )}
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
                  {(user.role === 'admin' || user.role === 'super_admin') && (
                    <Link to="/admin/users" className="block px-3 py-2 text-foreground hover:text-primary transition-colors">
                      Users
                    </Link>
                  )}
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
                  <Button variant="ghost" className="justify-start" onClick={() => navigate("/profile")}>
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Button>
                  <Button variant="ghost" className="justify-start" onClick={() => navigate("/settings")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                  <Button variant="ghost" className="justify-start text-red-600 hover:text-red-700" onClick={() => { logout(); navigate("/"); }}>
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