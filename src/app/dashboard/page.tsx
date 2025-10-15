'use client';

import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '2rem'
    }}>
      <div style={{
        textAlign: 'center',
        color: 'white'
      }}>
        <h1 style={{
          fontSize: '3rem',
          marginBottom: '3rem',
          fontWeight: 'bold'
        }}>
          Dashboard
        </h1>
        
        <button 
          onClick={() => router.push('/tablica')}
          style={{
          padding: '16px 64px',
          fontSize: '1.2rem',
          fontWeight: '600',
          color: 'white',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          border: '2px solid white',
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'all 0.3s',
          backdropFilter: 'blur(10px)'
        }}
        onMouseOver={(e) => {
          (e.target as HTMLButtonElement).style.backgroundColor = 'white';
          (e.target as HTMLButtonElement).style.color = '#667eea';
          (e.target as HTMLButtonElement).style.transform = 'translateY(-4px)';
          (e.target as HTMLButtonElement).style.boxShadow = '0 12px 24px rgba(0,0,0,0.3)';
        }}
        onMouseOut={(e) => {
          (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
          (e.target as HTMLButtonElement).style.color = 'white';
          (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
          (e.target as HTMLButtonElement).style.boxShadow = 'none';
        }}>
          📋 Tablica
        </button>
      </div>
    </div>
  );
}