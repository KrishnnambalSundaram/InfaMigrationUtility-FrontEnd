import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from '../assets/SmartMigrate.svg'


type HeaderProps = {
    handleReset?: () => void;
}

const Header: React.FC<HeaderProps> = ({ handleReset }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-gray-50 sticky top-0 z-50 ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-28">
          <div className="flex items-center gap-3" onClick={handleReset}>
            <img src={Logo} alt="logo" className='h-18'/>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm text-gray-900 manrope-regular">{'Welcome, '+user?.name || 'User'}</p>
              {/* <p className="text-xs text-gray-500">{user?.email}</p> */}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
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