import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(localStorage.getItem('remember') === "true" ||false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect based on user role after successful login
  useEffect(() => {
    if(localStorage.getItem('remember') === "true"){
      setEmail(localStorage.getItem('email') || "");
      setPassword(localStorage.getItem('password') || "");
    }
  }, []);

  useEffect(() => {
    if (user) {
      if (user.role === 'instructor') {
        navigate("/instructor/dashboard");
      } else if (user.role === 'admin' || user.role === 'super_admin') {
        navigate("/admin/dashboard"); // Admin uses dedicated admin dashboard
      } else {
        navigate("/dashboard");
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e?: React.FormEvent) => {
    console.log('=== handleSubmit function called ===');
    console.log('Email:', email);
    console.log('Password:', password);
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      if(remember){
        localStorage.setItem('remember', "true");
        localStorage.setItem('email', email);
        localStorage.setItem('password', password);
      }
      else{
        localStorage.removeItem('remember');
        localStorage.removeItem('email');
        localStorage.removeItem('password');
      }
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      // Navigation will be handled by useEffect when user state updates
    } catch (err: any) {
      console.log('Login error caught:', err);
      console.log('Error response:', err.response);
      console.log('Error message:', err.response?.data?.message);
      
      const errorMessage = err.response?.data?.message || "Failed to login. Please try again.";
      setError(errorMessage);
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Ensure we stay on the login page and don't redirect
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <BookOpen className="h-10 w-10 text-primary" />
            <span className="text-2xl font-bold text-primary">Axess Upskill</span>
          </div>
          <p className="text-muted-foreground">Welcome back to your learning journey</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Sign in</CardTitle>
            <CardDescription className="text-center">
              Enter your email and password to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    // Prevent spaces in email
                    const newEmail = e.target.value.replace(/\s/g, '');
                    setEmail(newEmail);
                  }}
                  onKeyDown={(e) => {
                    // Prevent space key from being typed
                    if (e.key === ' ') {
                      e.preventDefault();
                    }
                    // Handle Enter key for login
                    if (e.key === 'Enter' && !isLoading) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      // Prevent spaces in password
                      const newPassword = e.target.value.replace(/\s/g, '');
                      setPassword(newPassword);
                    }}
                    onKeyDown={(e) => {
                      // Prevent space key from being typed
                      if (e.key === ' ') {
                        e.preventDefault();
                      }
                      // Handle Enter key for login
                      if (e.key === 'Enter' && !isLoading) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {!showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="flex items-center space-x-2 rounded-md p-2">
                <Checkbox checked={remember} onClick={() => setRemember(!remember)} />
                <span className="text-sm">Remember me</span>
              </div>
              </div>
             

              <Button
                type="button"
                className="w-full"
                disabled={isLoading}
                onClick={(e) => {
                  console.log('Login button clicked');
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Button event prevented');
                  
                  // Test if we can prevent the default behavior
                  setTimeout(() => {
                    console.log('Timeout executed - no page refresh');
                  }, 100);
                  
                  handleSubmit();
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>

              <div className="text-center text-sm">
                <Link
                  to="/forgot-password"
                  className="text-primary hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Accounts */}
        <div className="mt-8 p-4 bg-white rounded-lg shadow-sm border">
          <h3 className="font-semibold text-sm mb-3 text-center">Demo Accounts</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Admin:</span>
              <span className="font-mono">admin@axessupskill.com / admin123</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Instructor:</span>
              <span className="font-mono">ai.specialist@example.com / password123</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Learner:</span>
              <span className="font-mono">john@example.com / password123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
