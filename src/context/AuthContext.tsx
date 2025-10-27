import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

interface User {
  email: string;
  name: string;
}

interface AuthContextType {
  token: string;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string, company: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>('');
  const [isAuthenticated,setIsAuthenticated] = useState<boolean>(false)
  useEffect(() => {
    // Check if user is logged in (from localStorage)
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token')
    token?setToken(token):setToken('')
    if (storedUser) {
      setIsAuthenticated(true)
      setUser(JSON.parse(storedUser));
    }
  }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
    if (!email || !password) return false;

    try {
        const response = await apiClient.post('/auth/login', { email, password });
        console.log(response);

        if (response.status === 200 || response.status === 201) {
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('token', response.data.token);
        return true;
        } else {
        return false;
        }
    } catch (error) {
        console.error('Login error:', error);
        return false;
    }
    };
  const signup = async (name: string, email: string, password: string, company: string): Promise<boolean> => {
    if (!name || !email || !password || !company) return false;
    try {
        const userData = { email, name, password, company };
        const response = await apiClient.post('/register/signup', userData);
        console.log(response);

        if (response.status === 200 || response.status === 201) {
        setUser(response.data.user || userData); // Use server response if available
        localStorage.setItem('user', JSON.stringify(response.data.user || userData));
        localStorage.setItem('token', response.data.token || "");
        return true;
        } else {
        return false;
        }
    } catch (error) {
        console.error('Signup error:', error);
        return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        signup,
        logout,
        isAuthenticated: isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};