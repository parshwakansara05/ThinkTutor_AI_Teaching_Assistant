import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Chat.css";

const Chat = () => {
    const navigate = useNavigate();
    const [isSidebarActive, setIsSidebarActive] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [historySessions, setHistorySessions] = useState({});

    const chatBoxRef = useRef(null);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    useEffect(() => {
        const storedUser = localStorage.getItem("thinktutor_user");
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            fetchHistory(parsedUser.id);
        }
    }, []);

    const fetchHistory = async (userId) => {
        try {
            const res = await fetch(`http://localhost/ThinkTutor/php_backend/api.php?action=get_chats&user_id=${userId}`);
            const data = await res.json();
            if (data.status === "success" && data.sessions) {
                setHistorySessions(data.sessions);
            }
        } catch (e) {
            console.error("Failed to fetch history", e);
        }
    };

    const saveMessageToDB = async (currentSessionId, text, sender) => {
        const storedUser = JSON.parse(localStorage.getItem("thinktutor_user"));
        if (!storedUser) return;
        try {
            await fetch("http://localhost/ThinkTutor/php_backend/api.php?action=save_chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: storedUser.id,
                    session_id: currentSessionId,
                    message: text,
                    sender: sender
                })
            });
        } catch (e) {
            console.error("Failed to save message", e);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("thinktutor_user");
        window.location.href = "/login";
    };

    const toggleSidebar = () => {
        setIsSidebarActive(!isSidebarActive);
    };

    const startNewChat = () => {
        setMessages([]);
        setSessionId(null);
        clearFiles();
    };

    const loadSession = (sid) => {
        setSessionId(sid);
        const storedMsgs = historySessions[sid].map((msg, index) => ({
            id: `hist_${index}_${msg.timestamp || Date.now()}`,
            text: msg.text,
            sender: msg.sender
        }));
        setMessages(storedMsgs);
        if (window.innerWidth <= 768) {
            setIsSidebarActive(false);
        }
    };

    const getSessionTitle = (sid) => {
        const session = historySessions[sid];
        if (!session) return "Session " + sid;
        const firstUserMsg = session.find(msg => msg.sender === 'user');
        if (firstUserMsg && firstUserMsg.text) {
            return firstUserMsg.text.length > 25 ? firstUserMsg.text.substring(0, 25) + "..." : firstUserMsg.text;
        }
        return "Session (No questions)";
    };

    const deleteSession = async (e, sid) => {
        e.stopPropagation();
        const storedUser = JSON.parse(localStorage.getItem("thinktutor_user"));
        if (!storedUser) return;

        try {
            const res = await fetch("http://localhost/ThinkTutor/php_backend/api.php?action=delete_chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: storedUser.id,
                    session_id: sid
                })
            });
            const data = await res.json();
            if (data.status === "success") {
                if (sessionId === sid) {
                    startNewChat();
                }
                const newSessions = { ...historySessions };
                delete newSessions[sid];
                setHistorySessions(newSessions);
            }
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
            if (e.target.value === "") textareaRef.current.style.height = "24px";
        }
    };

    const handleEnter = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const triggerUpload = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files.length > 0) {
            setSelectedFiles(Array.from(e.target.files));
            if (textareaRef.current) {
                textareaRef.current.focus();
            }
        }
    };

    const clearFiles = () => {
        if (fileInputRef.current) fileInputRef.current.value = "";
        setSelectedFiles([]);
    };

    const setQuickPrompt = (text) => {
        setInputValue(text);
        if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

    const uploadAndInitSession = async () => {
        if (selectedFiles.length === 0) return true;

        const loadingId = Date.now();
        setMessages((prev) => [
            ...prev,
            { id: loadingId, text: "Analyzing uploaded files...", sender: "bot", isLoading: true },
        ]);

        const formData = new FormData();
        selectedFiles.forEach((file) => {
            formData.append("files[]", file);
        });

        try {
            const response = await fetch("http://127.0.0.1:5000/upload", {
                method: "POST",
                body: formData,
            });
            const data = await response.json();

            setMessages((prev) => prev.filter((msg) => msg.id !== loadingId));

            if (data.status === "success") {
                setSessionId(data.session_id);
                clearFiles();
                return true;
            } else {
                setMessages((prev) => [
                    ...prev,
                    { id: Date.now(), text: "Error uploading files: " + data.error, sender: "bot" },
                ]);
                return false;
            }
        } catch (error) {
            setMessages((prev) => prev.filter((msg) => msg.id !== loadingId));
            setMessages((prev) => [
                ...prev,
                { id: Date.now(), text: "Upload failed due to connection error.", sender: "bot" },
            ]);
            return false;
        }
    };

    const sendMessage = async () => {
        const messageText = inputValue.trim();
        if (!messageText && selectedFiles.length === 0) return;

        let activeSessionId = sessionId;
        if (!activeSessionId) {
            activeSessionId = "session_" + Date.now();
            setSessionId(activeSessionId);
        }

        if (messageText) {
            setMessages((prev) => [...prev, { id: Date.now(), text: messageText, sender: "user" }]);
            setInputValue("");
            if (textareaRef.current) textareaRef.current.style.height = "24px";

            saveMessageToDB(activeSessionId, messageText, "user");
        }

        if (selectedFiles.length > 0) {
            const uploadSuccess = await uploadAndInitSession();
            if (!uploadSuccess) return;
        }

        if (!messageText) return;

        setIsLoading(true);

        try {
            const response = await fetch("http://127.0.0.1:5000/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: messageText, session_id: sessionId }),
            });
            const data = await response.json();

            setIsLoading(false);

            if (data.response) {
                setMessages((prev) => [...prev, { id: Date.now(), text: data.response, sender: "bot" }]);
                saveMessageToDB(activeSessionId, data.response, "bot");
            } else {
                setMessages((prev) => [
                    ...prev,
                    { id: Date.now(), text: "Sorry, I encountered an error.", sender: "bot" },
                ]);
            }
        } catch (error) {
            setIsLoading(false);
            setMessages((prev) => [
                ...prev,
                { id: Date.now(), text: "Connection error.", sender: "bot" },
            ]);
        }
    };

    const formatText = (text) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={index}>{part.slice(2, -2)}</strong>;
            }
            return (
                <span key={index}>
                    {part.split("\n").map((line, i) => (
                        <React.Fragment key={i}>
                            {line}
                            {i !== part.split("\n").length - 1 && <br />}
                        </React.Fragment>
                    ))}
                </span>
            );
        });
    };

    const hasMessagesOrFiles = messages.length > 0 || isLoading;

    return (
        <div className="chat-layout">
            {/* Background visual element */}
            <div className="chat-bg-rings"></div>

            {/* SIDEBAR */}
            <aside className={`sidebar ${isSidebarActive ? "active" : ""}`} id="sidebar">
                <div className="sidebar-header">
                    <img className="logo-icon" viewBox="0 0 24 24" src="/static/images/22_6.svg" alt="logo" />
                    <span className="logo-text">ThinkTutor</span>
                </div>

                <button className="new-chat-btn" onClick={startNewChat}>
                    + New Chat
                </button>

                <div className="history-list">
                    <div className="history-label">Recent Chats</div>
                    <div
                        className={`history-item ${!sessionId && messages.length === 0 ? 'active' : ''}`}
                        onClick={startNewChat}
                        style={{ cursor: 'pointer' }}
                    >
                        Current Chat
                    </div>
                    {Object.keys(historySessions).map((sid, index) => (
                        <div
                            key={sid}
                            className={`history-item ${sessionId === sid ? 'active' : ''}`}
                            title={getSessionTitle(sid)}
                            onClick={() => loadSession(sid)}
                        >
                            <span className="history-item-text">
                                {getSessionTitle(sid)}
                            </span>
                            <span
                                onClick={(e) => deleteSession(e, sid)}
                                className="delete-session"
                                title="Delete Session"
                            >
                                &times;
                            </span>
                        </div>
                    ))}
                </div>

                <div className="user-profile" onClick={() => navigate("/account")} style={{ cursor: "pointer" }} title="My Account">
                    <div className="avatar" style={{ overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center" }}>
                        {user && user.profile_photo && user.profile_photo !== "null" && user.profile_photo !== "" ? (
                            <img src={user.profile_photo} alt="User" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            user ? user.name?.charAt(0).toUpperCase() : "U"
                        )}
                    </div>
                    <div className="username">{user ? user.name : "Guest User"}</div>
                </div>
            </aside>

            {/* MAIN CHAT */}
            <main className="main-content">
                <div className="top-bar">
                    <button className="mobile-menu-btn" onClick={toggleSidebar}>
                        <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="chat-container" ref={chatBoxRef}>
                    {!hasMessagesOrFiles && (
                        <div className="landing-view">
                            <div className="landing-title">
                                Welcome to <span>ThinkTutor</span>
                            </div>
                            <div className="landing-subtitle">Your personal AI study companion. How can I help you excel today?</div>

                            <div className="feature-grid">
                                <div className="feature-card peach" onClick={triggerUpload}>
                                    <div className="feature-icon">
                                        <img src="/static/images/icons/icons8-copy-100.png" alt="analyze" />
                                    </div>
                                    <strong>Analyze Papers</strong>
                                    <span>Upload past exams to get custom study tips and identify patterns.</span>
                                </div>
                                <div className="feature-card blue" onClick={() => setQuickPrompt("Explain Quantum Physics in simple terms")}>
                                    <div className="feature-icon">
                                        <img src="/static/images/icons/icons8-mark-as-favorite-100.png" alt="explain" />
                                    </div>
                                    <strong>Explain Concepts</strong>
                                    <span>Break down complex topics into simple, easy-to-understand summaries.</span>
                                </div>
                                <div className="feature-card yellow" onClick={() => setQuickPrompt("Create a study schedule for finals")}>
                                    <div className="feature-icon">
                                        <img src="/static/images/icons/icons8-planner-100.png" alt="plan" />
                                    </div>
                                    <strong>Study Plan</strong>
                                    <span>Generate a structured timeline to conquer your remaining syllabus.</span>
                                </div>
                                <div className="feature-card teal" onClick={() => setQuickPrompt("Quiz me on Biology")}>
                                    <div className="feature-icon">
                                        <img src="/static/images/icons/icons8-questions-100.png" alt="quiz" />
                                    </div>
                                    <strong>Practice Quiz</strong>
                                    <span>Test your knowledge with an interactive Q&A session.</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div key={msg.id} className={`message-row ${msg.sender}`}>
                            <div className="message-content">
                                <div className={`message-avatar ${msg.sender}`}>
                                    {msg.sender === "user" ? "U" : (
                                        <img src="/static/images/22_6.svg" alt="AI" style={{ width: '24px', height: '24px' }} />
                                    )}
                                </div>
                                <div className="message-bubble">
                                    {msg.isLoading ? (
                                        <div className="loader"></div>
                                    ) : (
                                        formatText(msg.text)
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="message-row bot relative">
                            <div className="message-content">
                                <div className="message-avatar bot">
                                    <img src="/static/images/22_6.svg" alt="AI" style={{ width: '24px', height: '24px' }} />
                                </div>
                                <div className="message-bubble" style={{ display: 'flex', alignItems: 'center', minHeight: '60px' }}>
                                    <div className="loader"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="input-container">
                    <div className="input-box-wrapper">
                        <input
                            type="file"
                            ref={fileInputRef}
                            multiple
                            accept=".pdf,.docx,.jpg,.png,.jpeg"
                            style={{ display: "none" }}
                            onChange={handleFileSelect}
                        />

                        <button className="attach-btn" title="Attach file" onClick={triggerUpload}>
                            <img src="/static/images/icons/icons8-attach-52.png" alt="attach" style={{ width: '30px', height: '30px' }} />
                        </button>

                        {selectedFiles.length > 0 && (
                            <div className="upload-badge" style={{ display: "flex" }}>
                                <span>{selectedFiles.length} file(s) selected</span>
                                <span style={{ cursor: "pointer", fontSize: "16px", marginLeft: "4px" }} onClick={clearFiles}>×</span>
                            </div>
                        )}

                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleEnter}
                            placeholder="Ask ThinkTutor anything..."
                            rows="1"
                        ></textarea>

                        <button className="send-btn" onClick={sendMessage} disabled={isLoading && !inputValue && selectedFiles.length === 0}>
                            <img src="/static/images/icons/icons8-send-52.png" alt="send" style={{ width: '30px', height: '30px' }} />
                        </button>
                    </div>
                    <div style={{ position: "absolute", bottom: "12px", fontSize: "12px", color: "rgba(31, 42, 42, 0.6)", fontWeight: "500" }}>
                        ThinkTutor can make mistakes. Consider verifying important info.
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Chat;
