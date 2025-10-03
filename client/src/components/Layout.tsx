import { ReactNode } from "react";
import Navbar from "./Navbar";

interface LayoutProps {
  children: ReactNode;
  className?: string;
}

const Layout = ({ children, className = "" }: LayoutProps) => {
  return (
    <div className={`min-h-screen bg-background`}>
      <Navbar />
      <main className={`px-8 lg:px-16 xl:px-20 py-8 ${className}`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
