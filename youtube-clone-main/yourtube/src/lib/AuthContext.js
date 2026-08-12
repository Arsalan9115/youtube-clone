import { useState, useEffect, useContext, createContext } from "react";
import axiosInstance from "./axiosinstance";

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

  const login = (userdata, token) => {
    setUser(userdata);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userdata));
    if (token) localStorage.setItem("yourtube-token", token);
    setLoginMeta(persistLoginMeta(userdata));
  };

  const syncUser = (userdata) => {
    if (!userdata) return;
    setUser(userdata);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userdata));

    if (loginMeta?.loggedInAt) {
      setLoginMeta(persistLoginMeta(userdata, loginMeta.loggedInAt));
    }
  };

  const refreshUser = async (userId) => {
    const targetId = userId || user?._id || user?.id;
    if (!targetId) return;

    try {
      const response = await axiosInstance.get(`/user/profile/${targetId}`);
      const freshUser = response.data?.user || response.data;
      if (freshUser) {
        syncUser(freshUser);
        return freshUser;
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  };

  const logout = async () => {
    setUser(null);
    setLoginMeta(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(LOGIN_META_KEY);
    localStorage.removeItem("yourtube-token");
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
    login(response.data.result, response.data.token);
    return response.data.result;
  };

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    const storedLoginMeta = localStorage.getItem(LOGIN_META_KEY);
    
    let parsedUser = null;

    if (storedUser) {
      try {
        parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
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

    // ⚡ FIX: App load hotey hi backend se fresh currentPlan fetch karo
    if (parsedUser?._id || parsedUser?.id) {
      const targetId = parsedUser._id || parsedUser.id;
      axiosInstance
        .get(`/user/profile/${targetId}`)
        .then((res) => {
          const freshUser = res.data?.user || res.data;
          if (freshUser) {
            syncUser(freshUser);
          }
        })
        .catch(() => undefined);
    }
  }, []);

  return (
    <UserContext.Provider
      value={{ user, login, loginMeta, logout, refreshUser, syncUser, sendOtp, verifyOtp }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);