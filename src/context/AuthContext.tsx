import React, { createContext, useContext, useEffect, useState } from "react";
import apiClient from "../api/apiClient";

interface User {
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  _id?: string;
  role?: string;
}

interface AuthContextType {
  token: string;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  useEffect(() => {
    // Check if user is logged in (from localStorage)
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    token ? setToken(token) : setToken("");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // Process stored user data to ensure name field is properly set
      const processedUser = {
        ...parsedUser,
        name: parsedUser.firstName || parsedUser.email || parsedUser.name,
      };
      setIsAuthenticated(true);
      setUser(processedUser);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!email || !password) return false;

    try {
      const response = await apiClient.post("/auth/login", { email, password });
      console.log(response);

      if (response.status === 200 || response.status === 201) {
        // Create user object with name field from firstName only
        const userData = {
          ...response.data.user,
          name: response.data.user.firstName || response.data.user.email,
        };

        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("token", response.data.token);
        setToken(response.data.token || "");
        setIsAuthenticated(true);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setToken("");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
