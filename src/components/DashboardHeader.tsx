'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Modal from './Modal';
import HostForm from './HostForm';
import AccountSettingsForm from './AccountSettingsForm';
import CredentialManager from './CredentialManager';
import OAuthConfigModal from './OAuthConfigModal';
import OtlpConfigModal from './OtlpConfigModal';

export default function DashboardHeader() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [isOAuthConfigModalOpen, setIsOAuthConfigModalOpen] = useState(false);
  const [isOtlpConfigModalOpen, setIsOtlpConfigModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  
  const addHostRef = useRef<HTMLButtonElement>(null);
  const accountRef = useRef<HTMLButtonElement>(null);
  const credentialRef = useRef<HTMLButtonElement>(null);
  const oauthConfigRef = useRef<HTMLButtonElement>(null);
  const otlpConfigRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLButtonElement>(null);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-8 border-b border-cyan-500/30 pb-4">
        <h1 className="text-3xl font-bold text-cyan-400 neon-text tracking-wider">HOMON // SYSTEM MONITOR</h1>
        
        <div className="flex items-center gap-4">
          <button
            ref={addHostRef}
            onClick={() => setIsModalOpen(true)}
            className="bg-transparent border border-cyan-400 text-cyan-400 px-4 py-2 rounded-none hover:bg-cyan-400/10 hover:shadow-[0_0_10px_#0ff] transition-all font-mono uppercase text-sm flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Host
          </button>

          <button
            ref={sidebarRef}
            onClick={() => setIsSidebarOpen(true)}
            className="text-cyan-400 hover:text-cyan-300 p-2 hover:bg-cyan-400/10 transition-colors"
            aria-label="Menu"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
          
          <div className="relative w-72 h-full bg-[#0b101b] border-l border-cyan-500/30 shadow-[-10px_0_30px_rgba(6,182,212,0.2)] p-6 flex flex-col gap-6 animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-4 border-b border-cyan-500/20 pb-4">
              <h2 className="text-xl font-bold text-cyan-400 neon-text tracking-wider">SYSTEM MENU</h2>
              <button 
                onClick={() => setIsSidebarOpen(false)} 
                className="text-cyan-500 hover:text-cyan-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <button
                ref={credentialRef}
                onClick={() => { setIsCredentialModalOpen(true); setIsSidebarOpen(false); }}
                className="text-left text-cyan-500/70 hover:text-cyan-400 font-mono uppercase text-sm transition-colors p-3 hover:bg-cyan-500/5 border border-transparent hover:border-cyan-500/20 flex items-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Credentials
              </button>

              <button
                ref={oauthConfigRef}
                onClick={() => { setIsOAuthConfigModalOpen(true); setIsSidebarOpen(false); }}
                className="text-left text-cyan-500/70 hover:text-cyan-400 font-mono uppercase text-sm transition-colors p-3 hover:bg-cyan-500/5 border border-transparent hover:border-cyan-500/20 flex items-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                OAuth Config
              </button>

              <button
                ref={otlpConfigRef}
                onClick={() => { setIsOtlpConfigModalOpen(true); setIsSidebarOpen(false); }}
                className="text-left text-cyan-500/70 hover:text-cyan-400 font-mono uppercase text-sm transition-colors p-3 hover:bg-cyan-500/5 border border-transparent hover:border-cyan-500/20 flex items-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                OTLP Export
              </button>

              <button
                ref={accountRef}
                onClick={() => { setIsAccountModalOpen(true); setIsSidebarOpen(false); }}
                className="text-left text-cyan-500/70 hover:text-cyan-400 font-mono uppercase text-sm transition-colors p-3 hover:bg-cyan-500/5 border border-transparent hover:border-cyan-500/20 flex items-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Account Settings
              </button>
              
              <div className="h-px bg-cyan-500/20 my-4"></div>

              <button
                onClick={handleLogout}
                className="text-left text-red-500/70 hover:text-red-400 font-mono uppercase text-sm transition-colors p-3 hover:bg-red-500/5 border border-transparent hover:border-red-500/20 flex items-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Initialize New Host"
        triggerRef={addHostRef}
      >
        <HostForm onSuccess={() => setIsModalOpen(false)} />
      </Modal>

      <Modal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        title="Account Settings"
        triggerRef={accountRef}
      >
        <AccountSettingsForm onSuccess={() => setIsAccountModalOpen(false)} />
      </Modal>

      <Modal
        isOpen={isCredentialModalOpen}
        onClose={() => setIsCredentialModalOpen(false)}
        title="Manage Credentials"
        triggerRef={credentialRef}
      >
        <CredentialManager />
      </Modal>

      <Modal
        isOpen={isOAuthConfigModalOpen}
        onClose={() => setIsOAuthConfigModalOpen(false)}
        title="OAuth Configuration"
        triggerRef={oauthConfigRef}
      >
        <OAuthConfigModal />
      </Modal>

      <Modal
        isOpen={isOtlpConfigModalOpen}
        onClose={() => setIsOtlpConfigModalOpen(false)}
        title="OTLP Export Configuration"
        triggerRef={otlpConfigRef}
      >
        <OtlpConfigModal />
      </Modal>
    </div>
  );
}
