import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Background from '../assets/expleo-background.svg';
import Logo from '../assets/SmartMigrate.svg';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!name || !email || !password || !confirmPassword || !company) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    const success = await signup(name, email, password, company);
    setLoading(false);
    if (success) navigate("/dashboard");
    else setError("Failed to create account");
  };
  const handleLogin = () =>{
    navigate('/login')
  }
  return (
    <div className="min-h-screen w-screen flex flex-col md:flex-row bg-white text-[#555555]">
        {/* Left Illustration Section */}
        <div className="hidden md:flex min-w-[55%] h-screen items-center justify-center bg-white overflow-hidden">
            <img
            src={Background}
            alt="Signup Illustration"
            className="pl-15 h-full w-full object-contain object-center scale-140"
            />
        </div>

        {/* Right Signup Form */}
        <div className="relative flex flex-1 min-w-[45%] items-center justify-center bg-white px-6 md:px-10">
  <div className="absolute right-0 w-full max-w-md bg-[#FCFCFC] rounded-l-[32px] shadow-2xl p-8 md:p-10 overflow-auto max-h-screen">
          <div className="flex items-center justify-center mb-2">
            <img src={Logo} alt="inflecto-logo"/>
          </div>
          <h2 className="text-md font-regular text-gray-700 mb-4 text-center">
            Sign up into your account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Name */}
            <div className="relative">
                <p>Name</p>
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full mt-1 pl-4 pr-4 py-2 bg-white rounded-lg focus:ring-1 focus:ring-gray-200 outline-none"
              />
            </div>

            {/* Email */}
            <div className="relative">
                <p>Email Id</p>
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

            {/* Confirm Password */}
            <div className="relative">
                <p>Confirm Password</p>
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full mt-1 pl-4 pr-4 py-2 bg-white rounded-lg focus:ring-1 focus:ring-gray-200 outline-none"
              />
            </div>

            {/* Company */}
            <div className="relative">
                <p>Company Name</p>
              <input
                type="text"
                placeholder="Enter company name"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full mt-1 pl-4 pr-4 py-2 bg-white rounded-lg focus:ring-1 focus:ring-gray-200 outline-none"
              />
            </div>

            {/* Signup Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#E46356] to-[#E46356] text-white rounded-lg transition font-semibold shadow-md disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Sign up"}
            </button>
            <p className="text-[#C2C2C2] text-center">or</p>
            {/* OR Login */}
            
            <div className="text-center mt-4 border border-[#E46356] py-2.5 px-1 rounded-lg">
                <p
                  className="text-[#E46356] font-bold"
                  onClick={handleLogin}
                >
                  Login
                </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
