import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        // If already logged in, redirect to chat
        const user = localStorage.getItem("thinktutor_user");
        if (user) {
            navigate("/chat");
        }
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const endpoint = "http://localhost/ThinkTutor/php_backend/api.php?action=" + (isLogin ? "login" : "register");

        const payload = {
            email,
            password,
            ...(!isLogin && { username })
        };

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.status === "success") {
                if (isLogin) {
                    localStorage.setItem("thinktutor_user", JSON.stringify({ id: data.user_id, name: data.username }));
                    navigate("/chat");
                } else {
                    setSuccess("Registration successful! Please log in.");
                    setIsLogin(true);
                    setPassword("");
                }
            } else {
                setError(data.message || "An error occurred.");
            }
        } catch (err) {
            setError("Failed to connect to the server. Is XAMPP running?");
        }
    };

    return (
        <div className="login-page">
            <div className="login-bg-rings"></div>
            <div className="login-card">
                <div className="login-logo">
                    <img src="/static/images/22_6.svg" alt="logo" />
                    <span>ThinkTutor</span>
                </div>

                <div className="login-header">
                    <h2>{isLogin ? "Welcome Back" : "Create an Account"}</h2>
                    <p>{isLogin ? "Enter your details to access your chats." : "Sign up to start your learning journey."}</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    {error && <div className="error-message">{error}</div>}
                    {success && <div className="success-message">{success}</div>}

                    {!isLogin && (
                        <div className="input-group">
                            <label>Username</label>
                            <input
                                type="text"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required={!isLogin}
                            />
                        </div>
                    )}

                    <div className="input-group">
                        <label>Email</label>
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="auth-btn">
                        {isLogin ? "Sign In" : "Sign Up"}
                    </button>
                </form>

                <div className="toggle-mode">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <span onClick={() => { setIsLogin(!isLogin); setError(""); setSuccess(""); }}>
                        {isLogin ? "Sign up" : "Log in"}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default Login;
