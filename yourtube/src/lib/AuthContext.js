import { useState } from "react";
import { createContext } from "react";
import axiosInstance from "./axiosinstance";
import { useEffect, useContext } from "react";

const UserContext = createContext();
const USER_STORAGE_KEY = "user";
const LOGIN_META_KEY = "yourtube_login_meta";

const persistLoginMeta = (userData, loggedInAt = new Date().toISOString()) => {
  if (typeof window === "undefined") return;

  const loginMeta = {
    loggedInAt,
    state: userData?.state || "",
  };

  localStorage.setItem(LOGIN_META_KEY, JSON.stringify(loginMeta));
  return loginMeta;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loginMeta, setLoginMeta] = useState(null);

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userdata));
    setLoginMeta(persistLoginMeta(userdata));
  };

  const syncUser = (userdata) => {
    setUser(userdata);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userdata));

    if (loginMeta?.loggedInAt) {
      setLoginMeta(persistLoginMeta(userdata, loginMeta.loggedInAt));
    }
  };
  const refreshUser = async (userId) => {
    if (!userId) return;

    try {
      const response = await axiosInstance.get(`/user/profile/${userId}`);
      syncUser(response.data);
      return response.data;
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  };
  const logout = async () => {
    setUser(null);
    setLoginMeta(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(LOGIN_META_KEY);
  };
  const sendOtp = async (payload) => {
    try {
      const response = await axiosInstance.post("/user/send-otp", payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  };
  const verifyOtp = async (email, otp) => {
    const response = await axiosInstance.post("/user/verify-otp", { email, otp });
    login(response.data.result);
    return response.data.result;
  };

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    const storedLoginMeta = localStorage.getItem(LOGIN_META_KEY);
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Error parsing stored user:", error);
      }
    }

    if (storedLoginMeta) {
      try {
        setLoginMeta(JSON.parse(storedLoginMeta));
      } catch (error) {
        console.error("Error parsing stored login metadata:", error);
      }
    }
  }, []);

  return (
    <UserContext.Provider
      value={{ user, login, loginMeta, logout, refreshUser, sendOtp, verifyOtp }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
