import React from "react";
import { Link } from "react-router-dom";
import "./Home.css";

const Home = () => {
    return (
        <div className="home-container">
            <div className="header-wrapper">
                <nav className="main-nav">
                    <div className="logo-container">
                        <img src="/static/images/22_6.svg" alt="Icon" className="logo-icon" />
                        <span className="logo-text">ThinkTutor</span>
                    </div>
                </nav>
            </div>

            <main className="home-main">
                <section id="section-hero">
                    <div className="bg-rings"></div>

                    <div className="hero-stack">
                        <h1 className="hero-title">SMART LEARNING</h1>
                        <div className="hero-img-wrapper">
                            <img
                                src="/static/images/ece8b3598fb64a4285aefe4dccbf782355836ac7.png"
                                alt="Student 3D Illustration"
                                className="hero-img"
                            />
                        </div>
                    </div>

                    <div className="hero-cta">
                        <p className="hero-tagline">Your Smart Companion for Learning.</p>
                        <Link to="/chat" className="btn-dark">
                            TRY NOW
                        </Link>
                    </div>
                </section>

                <section id="section-about">
                    <div className="card-about">
                        <div className="about-img-col">
                            {/* Note: Ensure this image exists, updating the path to a matching one or placeholder if needed */}
                            <img
                                src="/static/images/ChatGPT Image Feb 17, 2026, 11_59_09 AM.png"
                                alt="Robot and Student"
                            />
                        </div>
                        <div className="about-text-col">
                            <h2 className="section-title">ABOUT US</h2>
                            <ul className="content-list">
                                <li>
                                    At ThinkTutor, we believe learning should be simple,
                                    personalized, and accessible to everyone.
                                </li>
                                <li>
                                    We combine the power of artificial intelligence with a
                                    student-first approach to help learners understand concepts
                                    better, practice smarter, and grow with confidence.
                                </li>
                                <li>
                                    Our AI tutor adapts to your learning style, answers questions
                                    instantly, and supports you every step of the way whether you’re
                                    studying for exams, building skills, or exploring new topics.
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section id="section-mv">
                    <div className="mv-grid">
                        <div className="card-mv bg-blue">
                            <h3>OUR MISSION</h3>
                            <ul className="content-list">
                                <li>
                                    Our mission is to empower learners through intelligent,
                                    personalized education.
                                </li>
                                <li>
                                    ThinkTutor uses AI to provide clear explanations, adaptive
                                    learning support, and real time assistance making quality
                                    education more accessible and engaging.
                                </li>
                            </ul>
                        </div>

                        <div className="card-mv bg-yellow">
                            <h3>OUR VISION</h3>
                            <ul className="content-list">
                                <li>
                                    ThinkTutor aims to transform education through AI-powered
                                    learning solutions.
                                </li>
                                <li>
                                    We envision a future where every student has access to
                                    personalized guidance, instant explanations, and intelligent
                                    learning tools in one unified platform.
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>
            </main>

            <footer id="section-footer">
                <div className="footer-container">
                    <div className="footer-logo">
                        <img src="/static/images/32_80.svg" alt="ThinkTutor Logo" />
                        <span className="footer-brand">ThinkTutor</span>
                        <span className="footer-tagline">Smart Learning powered by AI</span>
                    </div>

                    <div className="divider"></div>

                    <div className="footer-contact">
                        <div className="contact-row">
                            <img src="/static/images/34_6.svg" alt="email" />
                            <span>support@thinktutor.ai</span>
                        </div>
                        <div className="contact-row">
                            <img src="/static/images/34_8.svg" alt="phone" />
                            <span>9658XXXXX5</span>
                        </div>
                    </div>

                    <div className="divider"></div>

                    <div className="copyright">© 2026 ThinkTutor All Rights Reserved</div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
