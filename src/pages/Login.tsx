import { AlertCircle } from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Background from "../assets/expleo-background.svg";
import Logo from "../assets/SmartMigrate.svg";
import { useAuth } from "../context/AuthContext";

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

  return (
    <div className="min-h-screen w-screen flex flex-col md:flex-row bg-gradient-to-br from-gray-50 via-white to-blue-50/30 text-[#555555]">
      {/* Left Illustration Section */}
      <div className="hidden md:flex min-w-[55%] h-screen items-center justify-center bg-gradient-to-br from-blue-50/50 to-cyan-50/30 overflow-hidden">
        <img
          src={Background}
          alt="Login Illustration"
          className="pl-15 h-full w-full object-contain object-center scale-140 animate-fadeIn"
        />
      </div>

      {/* Right Login Form */}
      <div className="relative flex flex-1 min-w-[45%] items-center justify-center bg-transparent px-6 md:px-10">
        <div className="absolute right-0 w-full max-w-md bg-white/95 backdrop-blur-sm rounded-l-[32px] shadow-2xl border border-gray-100 p-8 md:p-10 overflow-auto h-screen animate-slideIn">
          <div className="flex items-center justify-center mb-6">
            <img src={Logo} alt="inflecto-logo" className="transform transition-transform duration-200 hover:scale-105" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-8 text-center manrope-semibold">
            Login to your account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3 shadow-md animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700 manrope-medium">{error}</p>
              </div>
            )}

            {/* Email */}
            <div className="relative">
              <p className="text-sm text-gray-700 mb-2 manrope-medium font-semibold">Email</p>
              <input
                type="email"
                placeholder="info@xyz.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-4 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-[#E46356] focus:ring-2 focus:ring-[#E46356]/20 outline-none transition-all duration-200 manrope-regular"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <p className="text-sm text-gray-700 mb-2 manrope-medium font-semibold">Password</p>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-[#E46356] focus:ring-2 focus:ring-[#E46356]/20 outline-none transition-all duration-200 manrope-regular"
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-[#E46356] to-[#B978B2] text-white rounded-xl transition-all duration-200 font-semibold shadow-lg shadow-[#E46356]/30 hover:shadow-xl hover:shadow-[#E46356]/40 hover:from-[#D8554A] hover:to-[#A869A0] transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none manrope-medium"
            >
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
