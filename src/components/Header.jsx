import React from 'react';
import { User, LogOut } from 'lucide-react';

export default function Header({ currentUser, onLogout, onLoginTrigger, isAdmin }) {
  return (
    <header className="fixed-header" style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img 
          src="/whatsbro_logo.png" 
          alt="WhatsBro Logo" 
          style={{ width: '48px', height: '48px', objectFit: 'contain' }} 
        />
        <div>
          <div className="brand-name" style={{ fontSize: '1.4rem', lineHeight: '1.2' }}>WhatsBro</div>
          <div className="brand-subtitle" style={{ fontSize: '0.8rem' }}>TNService</div>
        </div>
      </div>
      
      {!isAdmin && (
        <div className="header-auth-section" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="user-profile-name" style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: '600' }}>
                Hi, {currentUser.name.split(' ')[0]}
              </span>
              <button 
                onClick={onLogout}
                title="Logout"
                className="icon-transparent-btn"
                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center' }}
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button 
              onClick={onLoginTrigger}
              className="header-login-btn"
              title="Login / Register"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#10b981',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%'
              }}
            >
              <User size={24} />
            </button>
          )}
        </div>
      )}
    </header>
  );
}
