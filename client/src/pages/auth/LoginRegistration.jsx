import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import { loginUser, registerUser } from '../../services/authService';
import '../../styles/Login.css';
import 'boxicons/css/boxicons.min.css';

function Login() {
    const [isActive, setIsActive] = useState(false);
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [registerData, setRegisterData] = useState({ name: '', email: '', phone: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleBack = () => {
        navigate('/');
    };

    const handleLoginChange = (e) => {
        setLoginData({ ...loginData, [e.target.name]: e.target.value });
    };

    const handleRegisterChange = (e) => {
        setRegisterData({ ...registerData, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await loginUser(loginData);
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data));
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.errors?.[0] || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            console.log('Sending data:', registerData);
            const response = await registerUser(registerData);
            console.log('Response:', response);
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data));
            navigate('/');
        } catch (err) {
            console.log('Full error:', err.response?.data);
            setError(err.response?.data?.message || err.response?.data?.errors?.[0] || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="outer-container">
            <Button style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 9999 }} onClick={handleBack}>
                <i className="bx bx-arrow-back"></i> Back
            </Button>

            <div className={`logincontainer ${isActive ? 'active' : ''}`}>

                <div className="form-box login">
                    <form onSubmit={handleLogin}>
                        <h1>Login</h1>
                        {error && !isActive && (
                            <p style={{ color: 'red', fontSize: '14px' }}>{error}</p>
                        )}
                        <div className="input-box">
                            <input type="email" name="email" required placeholder="Enter Email" value={loginData.email} onChange={handleLoginChange} />
                            <i className="bx bxs-envelope"></i>
                        </div>
                        <div className="input-box">
                            <input type="password" name="password" required placeholder="Enter Password" value={loginData.password} onChange={handleLoginChange} />
                            <i className="bx bxs-lock-alt"></i>
                        </div>
                        <div className="forgot-link">
                            <a href="#">Forgot password?</a>
                        </div>
                        <Button type="submit" className="login-btn" disabled={loading}>
                            {loading ? 'Logging in...' : 'Login'}
                        </Button>
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
                    <form onSubmit={handleRegister}>
                        <h1>Registration</h1>
                        {error && isActive && (
                            <p style={{ color: 'red', fontSize: '14px' }}>{error}</p>
                        )}
                        <div className="input-box">
                            <input type="text" name="name" required placeholder="Enter Username" value={registerData.name} onChange={handleRegisterChange} />
                            <i className="bx bxs-user"></i>
                        </div>
                        <div className="input-box">
                            <input type="email" name="email" required placeholder="Enter Email" value={registerData.email} onChange={handleRegisterChange} />
                            <i className="bx bxs-envelope"></i>
                        </div>
                        <div className="input-box">
                            <input type="text" name="phone" required placeholder="Enter Mobile number" value={registerData.phone} onChange={handleRegisterChange} />
                            <i className="bx bxs-phone"></i>
                        </div>
                        <div className="input-box">
                            <input type="password" name="password" required placeholder="Enter Password" value={registerData.password} onChange={handleRegisterChange} />
                            <i className="bx bxs-lock-alt"></i>
                        </div>
                        <Button type="submit" className="register-btn" disabled={loading}>
                            {loading ? 'Registering...' : 'Register'}
                        </Button>
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
                        <Button className="register-btn" onClick={() => { setIsActive(true); setError(''); }}>
                            Register
                        </Button>
                    </div>
                    <div className="toggle-panel toggle-right">
                        <h1>Welcome Back!</h1>
                        <p>Already have an account?</p>
                        <Button className="login-btn" onClick={() => { setIsActive(false); setError(''); }}>
                            Login
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default Login;