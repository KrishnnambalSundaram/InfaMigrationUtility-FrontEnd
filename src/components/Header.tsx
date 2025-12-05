import { LogOut } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../assets/SmartMigrate.svg";
import { useAuth } from "../context/AuthContext";

type HeaderProps = {
  handleReset?: () => void;
};

const Header: React.FC<HeaderProps> = ({ handleReset }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="bg-white sticky top-0 z-50 border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-28">
          <div className="flex items-center gap-3 cursor-pointer transition-transform duration-200 hover:scale-105" onClick={handleReset}>
            <img src={Logo} alt="logo" className="h-18" />
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm text-gray-900 manrope-medium font-semibold">
                {"Welcome, " + (user?.name || user?.email || "User")}
              </p>
              {/* <p className="text-xs text-gray-500">{user?.email}</p> */}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 rounded-xl transition-all duration-200 border border-gray-200 hover:border-red-200 hover:shadow-md manrope-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
