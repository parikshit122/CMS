import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Button from "../../components/common/Button";
import { useAlert } from "../../components/common/Alert";
import { loginUser, registerUser } from "../../services/authService";
import API from "../../services/api";
import "../../styles/Login.css";
import "boxicons/css/boxicons.min.css";

import { signInWithPopup } from "firebase/auth";
import {
  auth,
  googleProvider,
  githubProvider,
  twitterProvider,
  facebookProvider,
} from "../../firebase";

function Login() {
  const [isActive, setIsActive] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const alert = useAlert();

  useEffect(() => {
    const panel = location.state?.panel;
    setIsActive(panel === "register");
  }, [location.state]);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");

    if (token) {
      if (user.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, []);

  const handleBack = () => navigate("/");
  const handleLoginChange = (e) =>
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  const handleRegisterChange = (e) =>
    setRegisterData({ ...registerData, [e.target.name]: e.target.value });

  const handleSocialLogin = async (providerName) => {
    const providers = {
      google: googleProvider,
      facebook: facebookProvider,
      github: githubProvider,
      twitter: twitterProvider,
    };

    const provider = providers[providerName];
    if (!provider) return;

    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken(true);

      const response = await API.post("/auth/social-login", { idToken });
      const { token, user } = response.data;

      sessionStorage.setItem("token", token);
      sessionStorage.setItem("user", JSON.stringify(user));

      alert.success("Login successful");
      setTimeout(() => {
        if (user.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      }, 800);
    } catch (err) {
      alert.error(err.response?.data?.message || "Social login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await loginUser(loginData);

      if (response.success) {
        sessionStorage.setItem("token", response.token);
        sessionStorage.setItem("user", JSON.stringify(response.user));

        alert.success("Login successful!");

        setTimeout(() => {
          if (response.user.role === "admin") {
            navigate("/admin");
          } else {
            navigate("/dashboard");
          }
        }, 800);

      } else {
        alert.error(response.message || "Login failed");
      }

    } catch (err) {
      alert.error(
        err.response?.data?.message ||
        err.response?.data?.errors?.[0] ||
        "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await registerUser(registerData);

      if (response.success) {
        sessionStorage.setItem("token", response.token);
        sessionStorage.setItem("user", JSON.stringify(response.user));

        alert.success("Registration successful!");

        setTimeout(() => {
          if (response.user.role === "admin") {
            navigate("/admin");
          } else {
            navigate("/dashboard");
          }
        }, 800);

      } else {
        alert.error(response.message || "Registration failed");
      }

    } catch (err) {
      alert.error(
        err.response?.data?.message ||
        err.response?.data?.errors?.[0] ||
        "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const SocialButtons = () => (
    <div className="social-icons">
      <button
        type="button"
        className="social-btn"
        onClick={() => handleSocialLogin("facebook")}
        disabled={loading}
        aria-label="Continue with Facebook"
      >
        <i className="bx bxl-facebook"></i>
      </button>
      <button
        type="button"
        className="social-btn"
        onClick={() => handleSocialLogin("twitter")}
        disabled={loading}
        aria-label="Continue with Twitter"
      >
        <i className="bx bxl-twitter"></i>
      </button>
      <button
        type="button"
        className="social-btn"
        onClick={() => handleSocialLogin("google")}
        disabled={loading}
        aria-label="Continue with Google"
      >
        <i className="bx bxl-google"></i>
      </button>
      <button
        type="button"
        className="social-btn"
        onClick={() => handleSocialLogin("github")}
        disabled={loading}
        aria-label="Continue with GitHub"
      >
        <i className="bx bxl-github"></i>
      </button>
    </div>
  );

  return (
    <div className="outer-container">
      <Button
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          zIndex: 9999,
        }}
        onClick={handleBack}
      >
        <i className="bx bx-arrow-back"></i> Back
      </Button>

      <div className={`logincontainer ${isActive ? "active" : ""}`}>

        {/* Login Form */}
        <div className="form-box login">
          <form onSubmit={handleLogin}>
            <h1>Login</h1>
            <div className="input-box">
              <input
                type="email"
                name="email"
                required
                placeholder="Enter Email"
                value={loginData.email}
                onChange={handleLoginChange}
              />
              <i className="bx bxs-envelope"></i>
            </div>
            <div className="input-box">
              <input
                type="password"
                name="password"
                required
                placeholder="Enter Password"
                value={loginData.password}
                onChange={handleLoginChange}
              />
              <i className="bx bxs-lock-alt"></i>
            </div>
            <div className="forgot-link">
              <a href="#">Forgot password?</a>
            </div>
            <Button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
            <p>Or login with social platforms</p>
            <SocialButtons />
          </form>
        </div>

        {/* Register Form */}
        <div className="form-box register">
          <form onSubmit={handleRegister}>
            <h1>Registration</h1>
            <div className="input-box">
              <input
                type="text"
                name="name"
                required
                placeholder="Enter Username"
                value={registerData.name}
                onChange={handleRegisterChange}
              />
              <i className="bx bxs-user"></i>
            </div>
            <div className="input-box">
              <input
                type="email"
                name="email"
                required
                placeholder="Enter Email"
                value={registerData.email}
                onChange={handleRegisterChange}
              />
              <i className="bx bxs-envelope"></i>
            </div>
            <div className="input-box">
              <input
                type="text"
                name="phone"
                required
                placeholder="Enter Mobile Number"
                value={registerData.phone}
                onChange={handleRegisterChange}
              />
              <i className="bx bxs-phone"></i>
            </div>
            <div className="input-box">
              <input
                type="password"
                name="password"
                required
                placeholder="Enter Password"
                value={registerData.password}
                onChange={handleRegisterChange}
              />
              <i className="bx bxs-lock-alt"></i>
            </div>
            <Button
              type="submit"
              className="register-btn"
              disabled={loading}
            >
              {loading ? "Registering..." : "Register"}
            </Button>
            <p>Or Register with social platforms</p>
            <SocialButtons />
          </form>
        </div>

        {/* Toggle Box */}
        <div className="toggle-box">
          <div className="toggle-panel toggle-left">
            <h1>Hello, Welcome!</h1>
            <p>Don't have an account?</p>
            <Button
              className="register-btn"
              onClick={() => setIsActive(true)}
            >
              Register
            </Button>
          </div>
          <div className="toggle-panel toggle-right">
            <h1>Welcome Back!</h1>
            <p>Already have an account?</p>
            <Button
              className="login-btn"
              onClick={() => setIsActive(false)}
            >
              Login
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Login;