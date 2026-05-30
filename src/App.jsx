import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import UserPortal from './pages/UserPortal';
import AdminPortal from './pages/AdminPortal';
import { Home, FileText, CheckCircle, Plus, Users, X } from 'lucide-react';
import { registerUser, loginUser } from './services/db';

function PortalLayout() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Auth state
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('whatsbro_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  
  // Login form state
  const [loginMethod, setLoginMethod] = useState('phone'); // 'phone' or 'aadhar'
  const [loginDob, setLoginDob] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginAadhar, setLoginAadhar] = useState('');
  
  // Register form state
  const [regName, setRegName] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAadhar, setRegAadhar] = useState('');
  
  // Alerts and loading
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Determine if active route is admin or user
  const isAdmin = location.pathname.toLowerCase().startsWith('/admin');
  
  // Read active tab, default based on portal type with automatic bounds verification
  const rawTab = searchParams.get('tab');
  const activeTab = isAdmin
    ? (['posts', 'forms', 'users'].includes(rawTab) ? rawTab : 'posts')
    : (['home', 'apply', 'status'].includes(rawTab) ? rawTab : 'home');

  const handleTabChange = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  const handleLogout = () => {
    localStorage.removeItem('whatsbro_user');
    setCurrentUser(null);
  };

  const handleUpdateProfile = (updatedUser) => {
    localStorage.setItem('whatsbro_user', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setIsLoading(true);
    
    try {
      if (!loginDob) throw new Error('Please enter your Date of Birth.');
      if (loginMethod === 'phone' && !loginPhone) throw new Error('Please enter your Phone number.');
      if (loginMethod === 'aadhar' && !loginAadhar) throw new Error('Please enter your Aadhaar number.');
      
      const payload = {
        dob: loginDob,
        phone: loginMethod === 'phone' ? loginPhone : undefined,
        aadhar: loginMethod === 'aadhar' ? loginAadhar : undefined
      };
      
      const user = await loginUser(payload);
      localStorage.setItem('whatsbro_user', JSON.stringify(user));
      setCurrentUser(user);
      setAuthSuccess('Welcome back! Login successful.');
      setTimeout(() => {
        setIsAuthModalOpen(false);
        setLoginDob('');
        setLoginPhone('');
        setLoginAadhar('');
        setAuthSuccess('');
      }, 1000);
    } catch (err) {
      setAuthError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setIsLoading(true);
    
    try {
      if (!regName) throw new Error('Please enter your full Name.');
      if (!regDob) throw new Error('Please enter your Date of Birth.');
      if (!regPhone) throw new Error('Please enter your Phone number.');
      
      const payload = {
        name: regName,
        dob: regDob,
        phone: regPhone,
        aadhar: regAadhar || undefined
      };
      
      const user = await registerUser(payload);
      localStorage.setItem('whatsbro_user', JSON.stringify(user));
      setCurrentUser(user);
      setAuthSuccess('Registration successful! Profile created.');
      setTimeout(() => {
        setIsAuthModalOpen(false);
        setRegName('');
        setRegDob('');
        setRegPhone('');
        setRegAadhar('');
        setAuthSuccess('');
      }, 1000);
    } catch (err) {
      setAuthError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="layout-viewport-container">
      
      {/* Centered Mobile Container Viewport */}
      <div className="app-mobile-container" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Header - Fixed at the top */}
        <Header 
          currentUser={currentUser} 
          onLogout={handleLogout} 
          onLoginTrigger={() => { 
            setAuthError('');
            setAuthSuccess('');
            setIsRegisterMode(false); 
            setIsAuthModalOpen(true); 
          }} 
          isAdmin={isAdmin}
        />
        
        {/* Scrollable Frame Content (Main Routes) */}
        <div className="mobile-frame-content" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          
          {/* Main Contents */}
          <main style={{ flex: 1, paddingBottom: '20px' }}>
            <Routes>
              <Route path="/user" element={<UserPortal currentUser={currentUser} onUpdateProfile={handleUpdateProfile} onLoginTrigger={() => { setAuthError(''); setAuthSuccess(''); setIsRegisterMode(false); setIsAuthModalOpen(true); }} />} />
              <Route path="/admin" element={<AdminPortal />} />
              <Route path="*" element={<Navigate to="/user" replace />} />
            </Routes>
          </main>

        </div>

        {/* Footer - Fixed at the bottom above bottom nav */}
        <Footer />

        {/* Global Bottom Sticky Menu */}
        {isAdmin ? (
          <div className="bottom-nav-bar">
            <button 
              onClick={() => handleTabChange('posts')}
              className={`bottom-nav-item ${activeTab === 'posts' ? 'active' : ''}`}
            >
              <Home className="bottom-nav-icon" size={20} />
              <span>Posts</span>
            </button>
            <button 
              onClick={() => handleTabChange('forms')}
              className={`bottom-nav-item ${activeTab === 'forms' ? 'active' : ''}`}
            >
              <Plus className="bottom-nav-icon" size={20} />
              <span>Templates</span>
            </button>
            <button 
              onClick={() => handleTabChange('users')}
              className={`bottom-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            >
              <Users className="bottom-nav-icon" size={20} />
              <span>Submissions</span>
            </button>
          </div>
        ) : (
          <div className="bottom-nav-bar">
            <button 
              onClick={() => handleTabChange('home')}
              className={`bottom-nav-item ${activeTab === 'home' ? 'active' : ''}`}
            >
              <Home className="bottom-nav-icon" size={20} />
              <span>Home</span>
            </button>
            <button 
              onClick={() => handleTabChange('apply')}
              className={`bottom-nav-item ${activeTab === 'apply' ? 'active' : ''}`}
            >
              <FileText className="bottom-nav-icon" size={20} />
              <span>Apply</span>
            </button>
            <button 
              onClick={() => handleTabChange('status')}
              className={`bottom-nav-item ${activeTab === 'status' ? 'active' : ''}`}
            >
              <CheckCircle className="bottom-nav-icon" size={20} />
              <span>Status</span>
            </button>
          </div>
        )}

        {/* Authentication Modal */}
        {isAuthModalOpen && (
          <div className="modal-overlay" style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            zIndex: 9999,
            padding: '16px',
            paddingTop: '60px'
          }}>
            <div className="auth-card" style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '360px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              position: 'relative'
            }}>
              {/* Close Button */}
              <button 
                onClick={() => setIsAuthModalOpen(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>

              {/* Title Header */}
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                  {isRegisterMode ? 'Register Profile' : 'User Verification'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px', marginBottom: 0, lineHeight: '1.4' }}>
                  {isRegisterMode ? 'Create a profile to easily apply for certificates' : 'Sign in to access your stored applications & prefill forms'}
                </p>
              </div>

              {/* Success / Error Alerts */}
              {authError && (
                <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', borderRadius: '4px', color: '#991b1b', fontSize: '0.8rem' }}>
                  {authError}
                </div>
              )}
              {authSuccess && (
                <div style={{ padding: '8px 12px', backgroundColor: '#f0fdf4', borderLeft: '4px solid #10b981', borderRadius: '4px', color: '#166534', fontSize: '0.8rem' }}>
                  {authSuccess}
                </div>
              )}

              {/* Form Content */}
              {!isRegisterMode ? (
                // Login Form
                <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Login Method Toggle */}
                  <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '2px', border: '1px solid #e2e8f0' }}>
                    <button
                      type="button"
                      onClick={() => { setLoginMethod('phone'); setAuthError(''); }}
                      style={{
                        flex: 1,
                        padding: '6px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: loginMethod === 'phone' ? '#10b981' : 'transparent',
                        color: loginMethod === 'phone' ? '#ffffff' : '#64748b',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Phone Number
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLoginMethod('aadhar'); setAuthError(''); }}
                      style={{
                        flex: 1,
                        padding: '6px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: loginMethod === 'aadhar' ? '#10b981' : 'transparent',
                        color: loginMethod === 'aadhar' ? '#ffffff' : '#64748b',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Aadhaar Number
                    </button>
                  </div>

                  {/* DOB Input */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155' }}>Date of Birth *</label>
                    <input 
                      type="date" 
                      value={loginDob}
                      onChange={(e) => setLoginDob(e.target.value)}
                      required
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#1e293b',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>

                  {/* Phone Input */}
                  {loginMethod === 'phone' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155' }}>Phone Number *</label>
                      <input 
                        type="tel" 
                        placeholder="Enter registered mobile number"
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        required
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#1e293b',
                          fontSize: '0.85rem'
                        }}
                      />
                    </div>
                  ) : (
                    // Aadhaar Input
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155' }}>Aadhaar Number *</label>
                      <input 
                        type="text" 
                        maxLength={12}
                        placeholder="Enter 12-digit Aadhaar number"
                        value={loginAadhar}
                        onChange={(e) => setLoginAadhar(e.target.value.replace(/\D/g, ''))}
                        required
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#1e293b',
                          fontSize: '0.85rem'
                        }}
                      />
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      marginTop: '8px',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {isLoading ? 'Verifying...' : 'Login Profile'}
                  </button>
                  
                  {/* Toggle Link */}
                  <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                    Don't have a profile?{' '}
                    <span 
                      onClick={() => { setIsRegisterMode(true); setAuthError(''); }}
                      style={{ color: '#10b981', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Register Now
                    </span>
                  </div>
                </form>
              ) : (
                // Register Form
                <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Full Name */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155' }}>Full Name *</label>
                    <input 
                      type="text" 
                      placeholder="Enter English full name"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#1e293b',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>

                  {/* DOB Input */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155' }}>Date of Birth *</label>
                    <input 
                      type="date" 
                      value={regDob}
                      onChange={(e) => setRegDob(e.target.value)}
                      required
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#1e293b',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>

                  {/* Phone Input */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155' }}>Phone Number *</label>
                    <input 
                      type="tel" 
                      placeholder="Enter mobile number"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      required
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#1e293b',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>

                  {/* Aadhaar Input (Optional) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155' }}>Aadhaar Number (Optional)</label>
                    <input 
                      type="text" 
                      maxLength={12}
                      placeholder="Enter 12-digit Aadhaar"
                      value={regAadhar}
                      onChange={(e) => setRegAadhar(e.target.value.replace(/\D/g, ''))}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#1e293b',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      marginTop: '8px',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {isLoading ? 'Creating...' : 'Register Profile'}
                  </button>
                  
                  {/* Toggle Link */}
                  <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                    Already registered?{' '}
                    <span 
                      onClick={() => { setIsRegisterMode(false); setAuthError(''); }}
                      style={{ color: '#10b981', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Login Now
                    </span>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <PortalLayout />
    </BrowserRouter>
  );
}
