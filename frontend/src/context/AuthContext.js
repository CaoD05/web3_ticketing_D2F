import { createContext, useContext, useState, useEffect } from 'react';
import api, { clearAuthSession, getAuthSession, setAuthSession } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => getAuthSession()?.user || null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const session = getAuthSession();
        if (!session?.token) {
            setLoading(false);
            return;
        }

        api.get('/auth/me')
            .then((response) => {
                if (response.data?.ok && response.data?.user) {
                    setUser(response.data.user);
                    setAuthSession(session.token, response.data.user, session.remember);
                } else {
                    clearAuthSession();
                    setUser(null);
                }
            })
            .catch(() => {
                clearAuthSession();
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

    const login = (token, userData, remember = false) => {
        setAuthSession(token, userData, remember);
        setUser(userData);
    };

    const logout = (callback) => {
        clearAuthSession();
        setUser(null);
        if (callback) callback();
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
