import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // استعادة الجلسة من localStorage
    const phone = localStorage.getItem('h_phone');
    const uid = localStorage.getItem('h_uid');
    const name = localStorage.getItem('h_name');
    return phone && uid ? { phone, uid, name } : null;
  });

  const login = (userData) => {
    localStorage.setItem('h_phone', userData.phone);
    localStorage.setItem('h_uid', userData.uid);
    localStorage.setItem('h_name', userData.name || '');
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('h_phone');
    localStorage.removeItem('h_uid');
    localStorage.removeItem('h_name');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
