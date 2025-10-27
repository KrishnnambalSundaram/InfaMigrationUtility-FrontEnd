import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState(false);

  useEffect(() => {
    setAuth(isAuthenticated);
    setLoading(false);
  }, [isAuthenticated]);

  if (loading) {
    // Optional: show a loader while checking auth
    return <div className='flex h-screen items-center justify-center'>
      <Loader2 className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 text-[#70CBCF] animate-spin" />
      </div>;
  }

  if (!auth && !!loading) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};


export default ProtectedRoute;