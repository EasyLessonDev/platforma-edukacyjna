'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Home, Settings, User, LogOut } from 'lucide-react';

export default function AuthHeader() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '64px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px'
    }}>
      {/* Logo / Tytuł */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.3)';
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)';
          }}
          title="Wróć do Dashboard"
        >
          <Home size={18} />
          Dashboard
        </button>

        <span style={{
          color: 'white',
          fontSize: '18px',
          fontWeight: '600',
          opacity: 0.9
        }}>
          {pathname === '/tablica' && '📋 Tablica'}
          {pathname === '/dashboard' && '🏠 Dashboard'}
          {pathname === '/profile' && '👤 Profil'}
        </span>
      </div>

      {/* Prawe menu */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        {/* Ustawienia */}
        <button
          onClick={() => router.push('/settings')}
          style={{
            background: 'transparent',
            border: 'none',
            borderRadius: '8px',
            padding: '10px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)';
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
          title="Ustawienia"
        >
          <Settings size={20} />
        </button>

        {/* Profil */}
        <button
          onClick={() => router.push('/profile')}
          style={{
            background: 'transparent',
            border: 'none',
            borderRadius: '8px',
            padding: '10px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)';
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
          title="Profil"
        >
          <User size={20} />
        </button>

        {/* Wyloguj */}
        <button
          onClick={() => {
            // TODO: Dodaj logikę wylogowania
            console.log('Wylogowano');
            router.push('/');
          }}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220, 38, 38, 0.8)';
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)';
          }}
          title="Wyloguj się"
        >
          <LogOut size={18} />
          Wyloguj
        </button>
      </div>
    </header>
  );
}