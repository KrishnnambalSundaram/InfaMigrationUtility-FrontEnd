import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Background from '../assets/expleo-background.svg';
import Logo from '../assets/SmartMigrate.svg';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    const success = await login(email, password);
    setLoading(false);

    if (success) {
      navigate("/dashboard");
    } else {
      setError("Invalid credentials");
    }
  };

  const handleSignup = () => {
    navigate("/signup");
  };

  return (
    <div className="min-h-screen w-screen flex flex-col md:flex-row bg-white text-[#555555]">
      {/* Left Illustration Section */}
      <div className="hidden md:flex min-w-[55%] h-screen items-center justify-center bg-white overflow-hidden">
        <img
          src={Background}
          alt="Login Illustration"
          className="pl-15 h-full w-full object-contain object-center scale-140"
        />
      </div>

      {/* Right Login Form */}
      <div className="relative flex flex-1 min-w-[45%] items-center justify-center bg-white px-6 md:px-10">
  <div className="absolute right-0 w-full max-w-md bg-[#FCFCFC] rounded-l-[32px] shadow-2xl p-8 md:p-10 overflow-auto h-screen">
   
          <div className="flex items-center justify-center mb-4">
            <img src={Logo} alt="inflecto-logo" />
          </div>
          <h2 className="text-md font-regular text-gray-700 mb-6 text-center">
            Login to your account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Email */}
            <div className="relative">
              <p>Email</p>
              <input
                type="email"
                placeholder="info@xyz.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 pl-4 pr-4 py-2 bg-white rounded-lg focus:ring-1 focus:ring-gray-200 outline-none"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <p>Password</p>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 pl-4 pr-4 py-2 bg-white rounded-lg focus:ring-1 focus:ring-gray-200 outline-none"
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#E46356] to-[#E46356] text-white rounded-lg transition font-semibold shadow-md disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Login"}
            </button>

            <p className="text-[#C2C2C2] text-center">or</p>

            {/* Signup Redirect */}
            <div className="text-center mt-4 border border-[#E46356] py-2.5 px-1 rounded-lg">
              <p
                className="text-[#E46356] font-bold cursor-pointer"
                onClick={handleSignup}
              >
                Sign up
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
