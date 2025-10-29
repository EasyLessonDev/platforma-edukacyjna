// API Service - komunikacja z FastAPI backendem

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Typy danych
export interface RegisterData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  full_name?: string;
}

export interface LoginData {
  login: string;
  password: string;
}

export interface VerifyEmailData {
  user_id: number;
  code: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterResponse {
  user: User;
  message: string;
}

// Helper do obsługi błędów
const handleResponse = async (response: Response) => {
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    const errorMessage = data.detail || 'Wystąpił błąd';
    throw new Error(errorMessage);
  }
  
  return data;
};

// API funkcje

/**
 * Rejestracja nowego użytkownika
 */
export const registerUser = async (userData: RegisterData): Promise<RegisterResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  
  return handleResponse(response);
};

/**
 * Weryfikacja email przez kod
 */
export const verifyEmail = async (verifyData: VerifyEmailData): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/verify-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(verifyData),
  });
  
  return handleResponse(response);
};

/**
 * Logowanie użytkownika
 */
export const loginUser = async (loginData: LoginData): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(loginData),
  });
  
  return handleResponse(response);
};

/**
 * Ponowne wysłanie kodu weryfikacyjnego
 */
export const resendVerificationCode = async (userId: number): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/resend-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: userId }),
  });
  
  return handleResponse(response);
};

// Local Storage + Cookies helpers dla tokenu
// Zapisujemy w OBA miejsca:
// - localStorage: dla łatwego dostępu w komponentach
// - cookies: dla middleware (ochrona tras)
export const saveToken = (token: string) => {
  if (typeof window !== 'undefined') {
    // Zapisz w localStorage
    localStorage.setItem('access_token', token);
    
    // Zapisz w cookies (ważne przez 7 dni)
    document.cookie = `access_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
  }
};

export const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
};

export const removeToken = () => {
  if (typeof window !== 'undefined') {
    // Usuń z localStorage
    localStorage.removeItem('access_token');
    
    // Usuń z cookies
    document.cookie = 'access_token=; path=/; max-age=0';
  }
};

export const saveUser = (user: User) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
};

export const getUser = (): User | null => {
  if (typeof window !== 'undefined') {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
  return null;
};

export const removeUser = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
  }
};

// Helper do sprawdzenia czy użytkownik jest zalogowany
export const isAuthenticated = (): boolean => {
  return !!getToken();
};

// Wylogowanie
export const logout = () => {
  removeToken();
  removeUser();
};

/**
 * Sprawdza czy użytkownik istnieje i czy jest zweryfikowany
 */
export const checkUser = async (email: string): Promise<{ exists: boolean; verified: boolean; user_id?: number }> => {
  const response = await fetch(`${API_BASE_URL}/api/check-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  
  return handleResponse(response);
};