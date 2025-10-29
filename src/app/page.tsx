'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f9fa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Navbar */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem 3rem',
        backgroundColor: 'white',
        borderBottom: '1px solid #e9ecef'
      }}>
        <h2 style={{
          color: '#212529',
          fontSize: '1.5rem',
          fontWeight: '600',
          margin: 0
        }}>
          🎓 Platforma Edukacyjna
        </h2>
        
        <div style={{
          display: 'flex',
          gap: '1rem'
        }}>
          <button 
            onClick={() => router.push('/login')}
            style={{
            padding: '10px 28px',
            fontSize: '1rem',
            fontWeight: '500',
            color: '#495057',
            backgroundColor: 'white',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = '#f8f9fa';
            (e.target as HTMLButtonElement).style.borderColor = '#adb5bd';
          }}
          onMouseOut={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = 'white';
            (e.target as HTMLButtonElement).style.borderColor = '#dee2e6';
          }}>
            Zaloguj
          </button>
          
          <button 
            onClick={() => router.push('/rejestracja')}
            style={{
            padding: '10px 28px',
            fontSize: '1rem',
            fontWeight: '500',
            color: 'white',
            backgroundColor: '#495057',
            border: '1px solid #495057',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = '#343a40';
            (e.target as HTMLButtonElement).style.borderColor = '#343a40';
          }}
          onMouseOut={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = '#495057';
            (e.target as HTMLButtonElement).style.borderColor = '#495057';
          }}>
            Zarejestruj
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{
        textAlign: 'center',
        padding: '6rem 2rem 4rem 2rem',
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        <h1 style={{
          fontSize: '3.5rem',
          marginBottom: '1.5rem',
          fontWeight: '600',
          lineHeight: '1.2',
          color: '#212529'
        }}>
          Ucz się efektywnie<br/>z naszą platformą
        </h1>
        
        <p style={{
          fontSize: '1.25rem',
          marginBottom: '3rem',
          color: '#6c757d',
          lineHeight: '1.6'
        }}>
          Nowoczesne narzędzia do nauki i współpracy. Tablica interaktywna, materiały edukacyjne i wiele więcej w jednym miejscu.
        </p>
        
        <button
          onClick={() => router.push('/tablica')}
          style={{
            padding: '16px 48px',
            fontSize: '1.1rem',
            fontWeight: '500',
            color: 'white',
            backgroundColor: '#495057',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
          onMouseOver={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = '#343a40';
            (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
          onMouseOut={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = '#495057';
            (e.target as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
          }}
        >
          Zacznij jako gość
        </button>
      </div>

      {/* Features Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '2rem',
        padding: '2rem 3rem 4rem 3rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Feature 1 */}
        <div style={{
          backgroundColor: 'white',
          padding: '2.5rem',
          borderRadius: '12px',
          textAlign: 'center',
          transition: 'all 0.2s',
          border: '1px solid #e9ecef'
        }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
          (e.currentTarget as HTMLDivElement).style.borderColor = '#dee2e6';
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
          (e.currentTarget as HTMLDivElement).style.borderColor = '#e9ecef';
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '1rem'
          }}>📋</div>
          <h3 style={{
            fontSize: '1.3rem',
            marginBottom: '0.75rem',
            fontWeight: '600',
            color: '#212529'
          }}>Tablica Interaktywna</h3>
          <p style={{
            fontSize: '1rem',
            color: '#6c757d',
            lineHeight: '1.6'
          }}>
            Rysuj, pisz i współpracuj w czasie rzeczywistym na wirtualnej tablicy
          </p>
        </div>

        {/* Feature 2 */}
        <div style={{
          backgroundColor: 'white',
          padding: '2.5rem',
          borderRadius: '12px',
          textAlign: 'center',
          transition: 'all 0.2s',
          border: '1px solid #e9ecef'
        }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
          (e.currentTarget as HTMLDivElement).style.borderColor = '#dee2e6';
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
          (e.currentTarget as HTMLDivElement).style.borderColor = '#e9ecef';
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '1rem'
          }}>📚</div>
          <h3 style={{
            fontSize: '1.3rem',
            marginBottom: '0.75rem',
            fontWeight: '600',
            color: '#212529'
          }}>Materiały Edukacyjne</h3>
          <p style={{
            fontSize: '1rem',
            color: '#6c757d',
            lineHeight: '1.6'
          }}>
            Dostęp do szerokiej biblioteki materiałów i zasobów edukacyjnych
          </p>
        </div>

        {/* Feature 3 */}
        <div style={{
          backgroundColor: 'white',
          padding: '2.5rem',
          borderRadius: '12px',
          textAlign: 'center',
          transition: 'all 0.2s',
          border: '1px solid #e9ecef'
        }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
          (e.currentTarget as HTMLDivElement).style.borderColor = '#dee2e6';
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
          (e.currentTarget as HTMLDivElement).style.borderColor = '#e9ecef';
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '1rem'
          }}>🚀</div>
          <h3 style={{
            fontSize: '1.3rem',
            marginBottom: '0.75rem',
            fontWeight: '600',
            color: '#212529'
          }}>Szybki Start</h3>
          <p style={{
            fontSize: '1rem',
            color: '#6c757d',
            lineHeight: '1.6'
          }}>
            Intuicyjny interfejs pozwala rozpocząć naukę w kilka sekund
          </p>
        </div>
      </div>
    </div>
  );
}