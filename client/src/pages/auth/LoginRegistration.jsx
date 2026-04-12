import React, { useState } from 'react';
import Button from '../../components/common/Button';
import '../../styles/Login.css';
import 'boxicons/css/boxicons.min.css';

function Login() {
    const [isActive, setIsActive] = useState(false);

    return (
        <div className="outer-container">
            <div className={`container ${isActive ? 'active' : ''}`}>

                <div className="form-box login">
                    <form>
                        <h1>Login</h1>

                        <div className="input-box">
                            <input type="text" name="username" id="login-username" required placeholder="Enter Username" />
                            <i className="bx bxs-user"></i>
                        </div>

                        <div className="input-box">
                            <input type="password" name="password" id="login-password" required placeholder="Enter Password" />
                            <i className="bx bxs-lock-alt"></i>
                        </div>

                        <div className="forgot-link">
                            <a href="#">Forgot password?</a>
                        </div>

                        <Button type="submit" className="login-btn">Login</Button>

                        <p>Or login with social platforms</p>

                        <div className="social-icons">
                            <a href="#"><i className="bx bxl-facebook"></i></a>
                            <a href="#"><i className="bx bxl-twitter"></i></a>
                            <a href="#"><i className="bx bxl-google"></i></a>
                            <a href="#"><i className="bx bxl-linkedin"></i></a>
                        </div>
                    </form>
                </div>

                <div className="form-box register">
                    <form>
                        <h1>Registration</h1>

                        <div className="input-box">
                            <input type="text" name="username" id="register-username" required placeholder="Enter Username" />
                            <i className="bx bxs-user"></i>
                        </div>

                        <div className="input-box">
                            <input type="email" name="email" id="register-email" required placeholder="Enter Email" />
                            <i className="bx bxs-envelope"></i>
                        </div>

                        <div className="input-box">
                            <input type="password" name="password" id="register-password" required placeholder="Enter Password" />
                            <i className="bx bxs-lock-alt"></i>
                        </div>

                        <Button type="submit" className="register-btn">Register</Button>

                        <p>Or Register with social platforms</p>

                        <div className="social-icons">
                            <a href="#"><i className="bx bxl-facebook"></i></a>
                            <a href="#"><i className="bx bxl-twitter"></i></a>
                            <a href="#"><i className="bx bxl-google"></i></a>
                            <a href="#"><i className="bx bxl-linkedin"></i></a>
                        </div>
                    </form>
                </div>

                <div className="toggle-box">
                    <div className="toggle-panel toggle-left">
                        <h1>Hello, Welcome!</h1>
                        <p>Don't have an account?</p>
                        <Button className="register-btn" onClick={() => setIsActive(true)}>
                            Register
                        </Button>
                    </div>

                    <div className="toggle-panel toggle-right">
                        <h1>Welcome Back!</h1>
                        <p>Already have an account?</p>
                        <Button className="login-btn" onClick={() => setIsActive(false)}>
                            Login
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default Login;