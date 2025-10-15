'use client';

import { useRouter } from 'next/navigation';

export default function Tablica() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#2c3e50',
      padding: '1.5rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        maxWidth: '1600px',
        margin: '0 auto',
        height: 'calc(100vh - 3rem)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          padding: '0.5rem'
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            color: 'white',
            fontWeight: '600'
          }}>
            📋 Tablica
          </h1>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              padding: '8px 20px',
              fontSize: '0.95rem',
              fontWeight: '600',
              color: '#2c3e50',
              backgroundColor: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.target as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            ← Wróć
          </button>
        </div>

        {/* Whiteboard */}
        <div style={{
          flex: 1,
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          backgroundImage: `
            linear-gradient(rgba(200, 200, 200, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(200, 200, 200, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Opcjonalny watermark */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            color: '#e0e0e0',
            fontSize: '0.85rem',
            fontWeight: '500',
            pointerEvents: 'none'
          }}>
            Whiteboard
          </div>
        </div>
      </div>
    </div>
  );
}