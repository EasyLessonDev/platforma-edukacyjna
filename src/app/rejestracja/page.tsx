'use client';

import { useRouter } from 'next/navigation';

export default function Rejestruj() {
  const router = useRouter();

  const handleRegister = () => {
    router.push('/dashboard');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '3rem',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        width: '90%',
        maxWidth: '400px'
      }}>
        <h1 style={{
          fontSize: '2rem',
          marginBottom: '2rem',
          textAlign: 'center',
          color: '#333'
        }}>
          Zarejestruj się
        </h1>
        
        <input
          type="text"
          placeholder="Imię i nazwisko"
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '1rem',
            fontSize: '1rem',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            outline: 'none',
            transition: 'border 0.2s'
          }}
        />
        
        <input
          type="email"
          placeholder="Email"
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '1rem',
            fontSize: '1rem',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            outline: 'none',
            transition: 'border 0.2s'
          }}
        />
        
        <input
          type="password"
          placeholder="Hasło"
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '1rem',
            fontSize: '1rem',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            outline: 'none',
            transition: 'border 0.2s'
          }}
        />
        
        <input
          type="password"
          placeholder="Powtórz hasło"
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '1.5rem',
            fontSize: '1rem',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            outline: 'none',
            transition: 'border 0.2s'
          }}
        />
        
        <button
          onClick={handleRegister}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '1.1rem',
            fontWeight: '600',
            color: 'white',
            backgroundColor: '#667eea',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = '#5568d3';
            (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = '#667eea';
            (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
          }}
        >
          Zarejestruj
        </button>
      </div>
    </div>
  );
}