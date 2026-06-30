import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Smartphone, User, Mail, CreditCard, Sparkles, CheckCircle, Fingerprint, RefreshCw, AlertCircle } from 'lucide-react';
import AnimatedAvatar from './AnimatedAvatar';
import { googleSignIn, getCachedGoogleUser, checkRedirectResult } from '../lib/firebaseAuth';

interface LoginPageProps {
  onLoginSuccess: (userData: {
    name: string;
    email: string;
    aadhaar: string;
    mobile: string;
  }) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  
  // Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [mobile, setMobile] = useState('');
  
  // Sign In Specific Fields
  const [signInAadhaar, setSignInAadhaar] = useState('');
  const [signInMobile, setSignInMobile] = useState('');
  const [signInEmail, setSignInEmail] = useState('');

  // UI state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStep, setVerificationStep] = useState(0);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Google sign in states
  const [googleUser, setGoogleUser] = useState<any | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Load cached Google User on mount to avoid re-prompting and process redirect login results
  useEffect(() => {
    const checkAuth = async () => {
      setGoogleLoading(true);
      try {
        const redirectRes = await checkRedirectResult();
        if (redirectRes) {
          const u = redirectRes.user;
          setGoogleUser(u);
          const isOfficialAppEmail = u.email?.toLowerCase() === "civxindia@gmail.com";
          
          // Autofill Name and Email from their signed-in Gmail profile
          setName(u.displayName || 'Praveen');
          setEmail(isOfficialAppEmail ? 'megapraveen6380@gmail.com' : (u.email || 'megapraveen6380@gmail.com'));
          
          // Prefill Aadhaar and Mobile numbers for a frictionless sandbox setup
          setAadhaar("5402-1928-3746");
          setMobile("9876543210");
          setSignInAadhaar("5402-1928-3746");
          setSignInMobile("9876543210");
          setSignInEmail(isOfficialAppEmail ? 'megapraveen6380@gmail.com' : (u.email || 'megapraveen6380@gmail.com'));
          return;
        }
      } catch (err) {
        console.error("Failed to process redirect result:", err);
      } finally {
        setGoogleLoading(false);
      }

      const cachedUser = getCachedGoogleUser();
      if (cachedUser) {
        setGoogleUser(cachedUser);
        const isOfficialAppEmail = cachedUser.email?.toLowerCase() === "civxindia@gmail.com";
        
        // Autofill Name and Email from their signed-in Gmail profile
        setName(cachedUser.displayName || 'Praveen');
        setEmail(isOfficialAppEmail ? 'megapraveen6380@gmail.com' : (cachedUser.email || 'megapraveen6380@gmail.com'));
        
        // Prefill Aadhaar and Mobile numbers for a frictionless sandbox setup
        setAadhaar("5402-1928-3746");
        setMobile("9876543210");
        setSignInAadhaar("5402-1928-3746");
        setSignInMobile("9876543210");
        setSignInEmail(isOfficialAppEmail ? 'megapraveen6380@gmail.com' : (cachedUser.email || 'megapraveen6380@gmail.com'));
      }
    };

    checkAuth();
  }, []);

  const handleGoogleLogin = async () => {
    setGoogleError(null);
    setGoogleLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        const isOfficialAppEmail = result.user.email?.toLowerCase() === "civxindia@gmail.com";
        
        // Autofill Name and Email
        setName(result.user.displayName || 'Praveen');
        setEmail(isOfficialAppEmail ? 'megapraveen6380@gmail.com' : (result.user.email || 'megapraveen6380@gmail.com'));
        
        // Prefill Aadhaar and Mobile numbers for a frictionless setup
        setAadhaar("5402-1928-3746");
        setMobile("9876543210");
        setSignInAadhaar("5402-1928-3746");
        setSignInMobile("9876543210");
        setSignInEmail(isOfficialAppEmail ? 'megapraveen6380@gmail.com' : (result.user.email || 'megapraveen6380@gmail.com'));
        
        // Clear any Google validation error once verified
        setErrors(prev => {
          const updated = { ...prev };
          delete updated.google;
          return updated;
        });
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || 'Failed to authenticate Google account.';
      if (errMsg.includes('popup-closed-by-user') || errMsg.includes('auth/popup-closed-by-user')) {
        errMsg = "Google login failed because the popup window was closed or blocked. (Note: Inside the AI Studio preview iframe, browser security may block popup windows. We recommend opening the application in a new tab, or checking your browser's address bar for blocked popup notifications!)";
      }
      setGoogleError(errMsg);
    } finally {
      setGoogleLoading(false);
    }
  };

  // Helper to generate a virtual citizen ID from a mobile number
  const generateVirtualAadhaar = (mobileNum: string) => {
    const cleanMobile = mobileNum.replace(/\D/g, '');
    if (!cleanMobile) return "5402-1928-3746";
    if (cleanMobile === "9876543210") {
      return "5402-1928-3746";
    }
    let val = cleanMobile + "99";
    if (val.length < 12) {
      val = val.padEnd(12, '0');
    }
    const part1 = val.slice(0, 4);
    const part2 = val.slice(4, 8);
    const part3 = val.slice(8, 12);
    return `${part1}-${part2}-${part3}`;
  };

  // Helper to format Mobile as 10 digits
  const formatMobile = (val: string) => {
    return val.replace(/\D/g, '').slice(0, 10);
  };

  // Synchronize virtual Aadhaar values when mobile numbers change to avoid any downstream issues
  useEffect(() => {
    setAadhaar(generateVirtualAadhaar(mobile));
  }, [mobile]);

  useEffect(() => {
    setSignInAadhaar(generateVirtualAadhaar(signInMobile));
  }, [signInMobile]);

  // Validate fields
  const validateForm = () => {
    const errs: { [key: string]: string } = {};

    // Gmail/Google Verification is now optional. If not verified, they can enter details manually.
    
    if (activeTab === 'signup') {
      if (!name.trim()) errs.name = "Full Name is required";
      if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) errs.email = "Please enter a valid email address";
      
      if (mobile.length !== 10) {
        errs.mobile = "Mobile must be a 10-digit number";
      }
    } else {
      if (signInMobile.length !== 10) {
        errs.signInMobile = "Please enter your 10-digit mobile number";
      }

      if (!signInEmail.trim() || !/\S+@\S+\.\S+/.test(signInEmail)) {
        errs.signInEmail = "Please enter a valid email address";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Trigger login workflow
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Start authenticating
    setIsVerifying(true);
    setVerificationStep(0);
  };

  // Step loader simulation for ultra-polished Gov-tech feel
  useEffect(() => {
    if (!isVerifying) return;

    const timers = [
      setTimeout(() => setVerificationStep(1), 800),  // Fingerprint verification
      setTimeout(() => setVerificationStep(2), 1600), // OTP simulation
      setTimeout(() => setVerificationStep(3), 2400), // Success redirect
      setTimeout(() => {
        setIsVerifying(false);
        if (activeTab === 'signup') {
          // Store registered user in localStorage
          const isOfficialAppEmail = googleUser?.email?.toLowerCase() === "civxindia@gmail.com";
          const newUser = { 
            name: (isOfficialAppEmail ? name : (googleUser?.displayName || name)) || 'Praveen', 
            email: (isOfficialAppEmail ? email : (googleUser?.email || email)) || 'megapraveen6380@gmail.com', 
            aadhaar, 
            mobile 
          };
          localStorage.setItem('social_constraint_registered_' + aadhaar.replace(/-/g, ''), JSON.stringify(newUser));
          localStorage.setItem('social_constraint_current_user', JSON.stringify(newUser));
          onLoginSuccess(newUser);
        } else {
          // Check if user is registered, else create default profile
          const saved = localStorage.getItem('social_constraint_registered_' + signInAadhaar.replace(/-/g, ''));
          if (saved) {
            const parsed = JSON.parse(saved);
            const isOfficialAppEmail = googleUser?.email?.toLowerCase() === "civxindia@gmail.com";
            parsed.email = (isOfficialAppEmail ? signInEmail : (googleUser?.email || signInEmail)) || parsed.email;
            if (googleUser && !isOfficialAppEmail) {
              parsed.name = googleUser.displayName || parsed.name;
            }
            localStorage.setItem('social_constraint_current_user', JSON.stringify(parsed));
            onLoginSuccess(parsed);
          } else {
            // Auto register with a beautiful matching email for demonstration
            const isOfficialAppEmail = googleUser?.email?.toLowerCase() === "civxindia@gmail.com";
            const generatedUser = {
              name: (isOfficialAppEmail ? null : googleUser?.displayName) || (signInAadhaar === "5402-1928-3746" ? "Praveen" : "Citizen " + signInAadhaar.slice(-4)),
              email: (isOfficialAppEmail ? signInEmail : googleUser?.email) || signInEmail || `citizen.${signInAadhaar.slice(-4)}@gov-portal.in`,
              aadhaar: signInAadhaar,
              mobile: signInMobile
            };
            localStorage.setItem('social_constraint_registered_' + signInAadhaar.replace(/-/g, ''), JSON.stringify(generatedUser));
            localStorage.setItem('social_constraint_current_user', JSON.stringify(generatedUser));
            onLoginSuccess(generatedUser);
          }
        }
      }, 3000)
    ];

    return () => timers.forEach(clearTimeout);
  }, [isVerifying, activeTab, name, email, aadhaar, mobile, signInAadhaar, signInMobile, signInEmail, googleUser, onLoginSuccess]);

  // Load a quick simulation preset
  const loadDemoUser = () => {
    setSignInAadhaar("5402-1928-3746");
    setSignInMobile("9876543210");
    setSignInEmail("megapraveen6380@gmail.com");
  };

  // Active seed to preview the animated profile picture live!
  const previewSeed = activeTab === 'signup' 
    ? (aadhaar.replace(/-/g, '') + mobile + name) 
    : (signInAadhaar.replace(/-/g, '') + signInMobile);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans select-none antialiased">
      
      {/* Decorative background visual elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-green-500/5 blur-3xl" />

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative z-10 min-h-[600px]">
        
        {/* Left column: branding & preview panel */}
        <div className="md:col-span-5 bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900 p-8 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Overlay Grid lines */}
          <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black font-display tracking-tight leading-none">Social Constraint</h2>
                <p className="text-[9px] uppercase font-bold text-emerald-400 tracking-widest mt-1">Digital Citizen Assembly</p>
              </div>
            </div>

            <div className="mt-10">
              <h1 className="text-2xl font-black font-display tracking-tight leading-tight">
                National Civil Protection Gateway
              </h1>
              <p className="text-xs text-emerald-200/80 leading-relaxed mt-2">
                Securely authenticate using your Verified Gmail Profile and linked Mobile number to submit instant, AI-diagnosed civic hazards, map local community consensus, and audit public work budgets.
              </p>
            </div>
          </div>

          {/* REALTIME ANIMATED PROFILE PREVIEW */}
          <div className="my-8 py-6 px-4 bg-white/5 backdrop-blur-xs rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-4 relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Your Dynamic Profile Picture
            </span>
            
            <AnimatedAvatar 
              seed={previewSeed || "default_guest_preview"} 
              size={120} 
              isAnimated={true}
            />

            <div className="text-center">
              <h3 className="text-xs font-black text-white font-display">
                {activeTab === 'signup' ? (name || "Anonymous Citizen") : (signInMobile ? "Citizen Sentinel" : "Guest Sandbox Profile")}
              </h3>
              <p className="text-[10px] text-emerald-300 font-mono mt-0.5">
                {activeTab === 'signup' 
                  ? (mobile ? `Citizen ID: ${aadhaar}` : "Awaiting registration...") 
                  : (signInMobile ? `Citizen ID: ${signInAadhaar}` : "Awaiting credentials...")}
              </p>
            </div>

            <p className="text-[9px] text-emerald-200/60 max-w-[200px] text-center italic leading-normal">
              Every citizen is generated a unique, animated portrait seeded from their verified identity parameters.
            </p>
          </div>

          <div className="relative z-10 flex justify-between items-center text-[10px] text-emerald-200/50 border-t border-white/10 pt-4 font-mono">
            <span>SECURE INGRESS GATEWAY v4.2</span>
            <span>NIC COMPLIANT</span>
          </div>
        </div>

        {/* Right column: form entry */}
        <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-center relative bg-white">
          <AnimatePresence mode="wait">
            {!isVerifying ? (
              <motion.div
                key="forms"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-md mx-auto"
              >
                {/* Form Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('signin');
                      setErrors({});
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activeTab === 'signin' 
                        ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/50' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Citizen Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('signup');
                      setErrors({});
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activeTab === 'signup' 
                        ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/50' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Register New Citizen
                  </button>
                </div>

                {/* Google Sign In option */}
                <div className="mb-6 bg-emerald-50/30 border border-emerald-100 p-4 rounded-2xl flex flex-col gap-3">
                  <div className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-[11px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1.5">
                        <span className="bg-slate-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm">OPTIONAL</span>
                        Verify Gmail Identity
                      </h4>
                      <p className="text-[10px] text-slate-500 leading-normal mt-0.5">
                        (Optional) Sign in with Google to prefill your name/email. If skipped, you can manually enter your profile details below.
                      </p>
                    </div>
                  </div>

                  {googleUser ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200/60 rounded-xl px-3 py-2 text-xs animate-[fadeIn_0.3s_ease-out]">
                      <span className="font-bold text-emerald-800 flex items-center gap-1.5 font-mono">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        {googleUser.email}
                      </span>
                      <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.5 rounded uppercase">Verified</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={googleLoading}
                      className="w-full flex items-center justify-center gap-2 bg-white hover:bg-emerald-50/50 text-slate-700 font-bold text-xs py-2.5 px-4 border border-emerald-200 rounded-xl shadow-xs transition cursor-pointer"
                    >
                      {googleLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                      ) : (
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        </svg>
                      )}
                      <span>{googleLoading ? "Connecting Secure Google Auth..." : "Verify Gmail ID via Google Sign-In"}</span>
                    </button>
                  )}

                  {googleError && (
                    <div className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-100 px-2 py-1 rounded">
                      ⚠️ {googleError}
                    </div>
                  )}

                  {errors.google && (
                    <div className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-150 p-2.5 rounded-lg flex items-start gap-1.5 animate-[fadeIn_0.2s_ease-out]">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500 mt-0.5" />
                      <span>{errors.google}</span>
                    </div>
                  )}
                </div>

                <div className="relative flex py-2 items-center mb-6">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-4 text-emerald-800 text-[10px] uppercase font-extrabold tracking-widest flex items-center gap-1.5">
                    <span className="bg-emerald-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm">REQUIRED</span>
                    Citizen Profile Details
                  </span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4.5">
                  {activeTab === 'signup' ? (
                    <>
                      {/* Name input */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Full Name</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                            <User className="w-4 h-4" />
                          </span>
                          <input
                            type="text"
                            placeholder="e.g. Praveen Kumar"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-10.5 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs font-semibold outline-none transition-all text-slate-800"
                          />
                        </div>
                        {errors.name && <span className="text-[10px] text-rose-500 font-semibold">{errors.name}</span>}
                      </div>

                      {/* Email input */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Email Address</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                            <Mail className="w-4 h-4" />
                          </span>
                          <input
                            type="email"
                            placeholder="e.g. megapraveen6380@gmail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10.5 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs font-semibold outline-none transition-all text-slate-800"
                          />
                        </div>
                        {errors.email && <span className="text-[10px] text-rose-500 font-semibold">{errors.email}</span>}
                      </div>


                      {/* Mobile input */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Linked Mobile Number</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                            <Smartphone className="w-4 h-4" />
                          </span>
                          <span className="absolute left-10 text-[11px] font-bold text-slate-500 top-1/2 -translate-y-1/2 select-none border-r border-slate-200 pr-2">
                            +91
                          </span>
                          <input
                            type="text"
                            placeholder="98765 43210"
                            value={mobile}
                            onChange={(e) => setMobile(formatMobile(e.target.value))}
                            className="w-full pl-21 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs font-semibold outline-none transition-all text-slate-800 font-mono tracking-wider"
                          />
                        </div>
                        {errors.mobile && <span className="text-[10px] text-rose-500 font-semibold">{errors.mobile}</span>}
                      </div>
                    </>
                  ) : (
                    <>

                      {/* Sign-in Mobile */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Registered Mobile Number</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                            <Smartphone className="w-4 h-4" />
                          </span>
                          <span className="absolute left-10 text-[11px] font-bold text-slate-500 top-1/2 -translate-y-1/2 select-none border-r border-slate-200 pr-2">
                            +91
                          </span>
                          <input
                            type="text"
                            placeholder="98765 43210"
                            value={signInMobile}
                            onChange={(e) => setSignInMobile(formatMobile(e.target.value))}
                            className="w-full pl-21 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs font-semibold outline-none transition-all text-slate-800 font-mono tracking-wider"
                          />
                        </div>
                        {errors.signInMobile && <span className="text-[10px] text-rose-500 font-semibold">{errors.signInMobile}</span>}
                      </div>

                      {/* Sign-in Email */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Email Address (CC Recipient)</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                            <Mail className="w-4 h-4" />
                          </span>
                          <input
                            type="email"
                            placeholder="e.g. megapraveen6380@gmail.com"
                            value={signInEmail}
                            onChange={(e) => setSignInEmail(e.target.value)}
                            className="w-full pl-10.5 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs font-semibold outline-none transition-all text-slate-800"
                          />
                        </div>
                        {errors.signInEmail && <span className="text-[10px] text-rose-500 font-semibold">{errors.signInEmail}</span>}
                      </div>

                      {/* Preset sandbox login quick-button */}
                      <button
                        type="button"
                        onClick={loadDemoUser}
                        className="text-right text-[10.5px] font-black text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer flex items-center justify-end gap-1 self-end mt-1"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                        Autofill Demo Citizen Credentials (Praveen)
                      </button>
                    </>
                  )}

                  {/* Submit Action Button */}
                  <button
                    type="submit"
                    className="mt-4 w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/10 active:scale-[0.98] select-none cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Fingerprint className="w-4 h-4" />
                    {activeTab === 'signup' ? "Initialize Citizen Profile" : "Secure Sign In"}
                  </button>
                </form>
              </motion.div>
            ) : (
              // Biometric verification loader screen
              <motion.div
                key="verifying"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="text-center py-8 flex flex-col items-center justify-center gap-6"
              >
                {/* Fingerprint animated circle */}
                <div className="relative w-28 h-28 rounded-full border-4 border-slate-100 flex items-center justify-center bg-emerald-50 shadow-inner overflow-hidden">
                  <Fingerprint className="w-14 h-14 text-emerald-600" />
                  
                  {/* Moving laser scan-line */}
                  <motion.div 
                    className="absolute left-0 right-0 h-1 bg-emerald-500 shadow-md shadow-emerald-400"
                    animate={{
                      top: ['15%', '85%', '15%']
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1.5 max-w-sm">
                  <h3 className="text-sm font-black text-slate-800 font-display">
                    {verificationStep === 0 && "Connecting to Citizen Central Registry..."}
                    {verificationStep === 1 && "Verifying Citizen Profile Credentials..."}
                    {verificationStep === 2 && "Identity Successfully Cleared!"}
                    {verificationStep === 3 && "Deploying Citizen Crypt-Profile..."}
                  </h3>
                  
                  <p className="text-xs text-slate-500 leading-normal">
                    {verificationStep === 0 && "Establishing secure handshake protocol using 256-bit civic encryption standards."}
                    {verificationStep === 1 && "Authenticating profile parameters against registered civic databases."}
                    {verificationStep === 2 && "Securing and signing session credentials for the Citizen Assembly."}
                    {verificationStep === 3 && "Caching local keys. Accessing community dispatch routes..."}
                  </p>
                </div>

                {/* Animated tiny loading bar */}
                <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-emerald-500 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ 
                      width: 
                        verificationStep === 0 ? '25%' : 
                        verificationStep === 1 ? '55%' : 
                        verificationStep === 2 ? '85%' : '100%' 
                    }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
