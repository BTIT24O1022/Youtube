import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState } from "react";
import { createContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import { useEffect, useContext } from "react";
import { useTheme } from "next-themes";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [otpChallenge, setOtpChallenge] = useState(null);
  const { setTheme } = useTheme();

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("user");
        if (stored) setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    }
  }, []);

  const login = (userdata, token) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
    if (token) {
      localStorage.setItem("token", token);
    }
  };
  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const finalizeLogin = (data) => {
    login(data.result, data.token);
    // This "deviceToken" is how the backend recognizes this same browser
    // next time, so it can skip asking for OTP again while trust is valid.
    if (data.deviceToken) localStorage.setItem("deviceToken", data.deviceToken);
    // Server may return an auto-computed theme (based on login time) or the
    // user's manually saved preference -- either way, apply it now so the
    // UI matches across devices, not just this browser's own history.
    if (data.theme) setTheme(data.theme);
  };

  const attemptLogin = async (payload) => {
    try {
      const deviceToken = localStorage.getItem("deviceToken") || undefined;
      const response = await axiosInstance.post("/user/login", { ...payload, deviceToken });
      if (response.data.requireOtp) {
        // Save the (possibly new) device token now so it stays consistent
        // between this request and the OTP verification step.
        localStorage.setItem("deviceToken", response.data.deviceToken);
        setOtpChallenge({
          otpId: response.data.otpId,
          deviceToken: response.data.deviceToken,
          message: response.data.message,
        });
        return;
      }
      finalizeLogin(response.data);
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const verifyOtp = async (code, trustDevice) => {
    if (!otpChallenge) return { success: false, message: "No pending verification" };
    try {
      const response = await axiosInstance.post("/user/verify-login-otp", {
        otpId: otpChallenge.otpId,
        code,
        deviceToken: otpChallenge.deviceToken,
        trustDevice,
      });
      finalizeLogin(response.data);
      setOtpChallenge(null);
      return { success: true };
    } catch (error) {
      return { success: false, message: error?.response?.data?.message || "Verification failed" };
    }
  };

  const cancelOtp = async () => {
    setOtpChallenge(null);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const handlegooglesignin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;
      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName,
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
      };
      await attemptLogin(payload);
    } catch (error) {
      console.error(error);
    }
  };
  useEffect(() => {
    const unsubcribe = onAuthStateChanged(auth, async (firebaseuser) => {
      if (firebaseuser) {
        try {
          const payload = {
            email: firebaseuser.email,
            name: firebaseuser.displayName,
            image: firebaseuser.photoURL || "https://github.com/shadcn.png",
          };
          await attemptLogin(payload);
        } catch (error) {
          console.error(error);
          logout();
        }
      }
    });
    return () => unsubcribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, login, logout, handlegooglesignin, otpChallenge, verifyOtp, cancelOtp }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
