import { createContext, useContext, useState } from "react";
import api from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });

  const save = ({ access, user }) => {
    localStorage.setItem("access", access);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
    return user;
  };

  const login = async (email, password) => save((await api.post("/auth/login/", { email, password })).data);
  const register = async (body) => save((await api.post("/auth/register/", body)).data);
  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("user");
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
