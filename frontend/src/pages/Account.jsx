import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Account.css";

const Account = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState({ id: "", username: "", email: "", profile_photo: "" });
    const [passwords, setPasswords] = useState({ old_password: "", new_password: "", confirm_password: "" });
    const [status, setStatus] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const storedUser = localStorage.getItem("thinktutor_user");
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            fetchUserDetails(parsed.id);
        } else {
            navigate("/login");
        }
    }, [navigate]);

    const fetchUserDetails = async (userId) => {
        try {
            const res = await fetch(`http://localhost/ThinkTutor/php_backend/api.php?action=get_user&user_id=${userId}`);
            const data = await res.json();
            if (data.status === "success") {
                setUser({ id: userId, ...data.user });
                updateLocalUserStorage({ ...data.user, id: userId });
            }
        } catch (e) {
            console.error("Failed to fetch user", e);
        }
    };

    const updateLocalUserStorage = (userData) => {
        // preserve other fields correctly
        const existingStr = localStorage.getItem("thinktutor_user");
        let existing = {};
        if (existingStr) {
            existing = JSON.parse(existingStr);
        }
        
        const updated = {
             id: userData.id || existing.id,
             name: userData.username || existing.name,
             email: userData.email || existing.email,
             profile_photo: 'profile_photo' in userData ? userData.profile_photo : existing.profile_photo
        };
        localStorage.setItem("thinktutor_user", JSON.stringify(updated));
    };

    const handleInputChange = (e) => {
        setUser({ ...user, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const handleProfileUpdate = async () => {
        setStatus(null);
        try {
            const res = await fetch("http://localhost/ThinkTutor/php_backend/api.php?action=update_user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: user.id,
                    username: user.username,
                    email: user.email
                })
            });
            const data = await res.json();
            if (data.status === "success") {
                setStatus({ type: "success", text: "Profile updated successfully!" });
                updateLocalUserStorage(user);
            } else {
                setStatus({ type: "error", text: data.message });
            }
        } catch (e) {
            setStatus({ type: "error", text: "Connection error" });
        }
    };

    const handlePasswordSubmit = async () => {
        setStatus(null);
        if (passwords.new_password !== passwords.confirm_password) {
            setStatus({ type: "error", text: "New passwords do not match" });
            return;
        }
        if (!passwords.old_password || !passwords.new_password) return;

        try {
            const res = await fetch("http://localhost/ThinkTutor/php_backend/api.php?action=change_password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: user.id,
                    old_password: passwords.old_password,
                    new_password: passwords.new_password
                })
            });
            const data = await res.json();
            if (data.status === "success") {
                setStatus({ type: "success", text: "Password changed successfully!" });
                setPasswords({ old_password: "", new_password: "", confirm_password: "" });
            } else {
                setStatus({ type: "error", text: data.message });
            }
        } catch (e) {
            setStatus({ type: "error", text: "Connection error" });
        }
    };

    const handlePhotoUpload = async (e) => {
        if (e.target.files.length === 0) return;
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append("photo", file);
        formData.append("user_id", user.id);

        try {
            const res = await fetch("http://localhost/ThinkTutor/php_backend/api.php?action=upload_photo", {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (data.status === "success") {
                setUser({ ...user, profile_photo: data.profile_photo });
                updateLocalUserStorage({ ...user, profile_photo: data.profile_photo });
                setStatus({ type: "success", text: "Profile photo updated!" });
            } else {
                setStatus({ type: "error", text: data.message });
            }
        } catch (error) {
            setStatus({ type: "error", text: "Photo upload failed" });
        }
    };

    const handlePhotoRemove = async () => {
        try {
            const res = await fetch("http://localhost/ThinkTutor/php_backend/api.php?action=remove_photo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: user.id })
            });
            const data = await res.json();
            if (data.status === "success") {
                setUser({ ...user, profile_photo: null });
                updateLocalUserStorage({ ...user, profile_photo: null });
                setStatus({ type: "success", text: "Profile photo removed!" });
            } else {
                setStatus({ type: "error", text: data.message });
            }
        } catch (error) {
            setStatus({ type: "error", text: "Photo removal failed" });
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("thinktutor_user");
        navigate("/login");
    };

    return (
        <div className="account-layout">
            <div className="account-container">
                <div className="account-header">
                    <h1>My Account</h1>
                </div>

                {status && (
                    <div className={`status-message ${status.type}`}>
                        {status.text}
                    </div>
                )}

                <div className="profile-photo-section">
                    <div className="profile-photo-wrapper" onClick={() => fileInputRef.current.click()} title="Click to change photo">
                        {user.profile_photo && user.profile_photo !== "null" && user.profile_photo !== "" ? (
                            <img src={user.profile_photo} alt="Profile" className="profile-img" />
                        ) : (
                            user.username ? user.username.charAt(0).toUpperCase() : "U"
                        )}
                        <div className="photo-upload-overlay">Change</div>
                    </div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: "none" }} 
                        accept="image/*" 
                        onChange={handlePhotoUpload} 
                    />
                    {user.profile_photo && (
                        <button className="btn-remove-photo" onClick={handlePhotoRemove}>Remove Photo</button>
                    )}
                </div>

                <div className="account-section-title">Personal Details</div>
                <div className="form-group">
                    <label>Username</label>
                    <input type="text" name="username" value={user.username || ""} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                    <label>Email</label>
                    <input type="email" name="email" value={user.email || ""} onChange={handleInputChange} />
                </div>
                <button className="btn-primary" onClick={handleProfileUpdate} style={{width: '100%'}}>Save Details</button>

                <div className="account-section-title">Change Password</div>
                <div className="form-group">
                    <label>Current Password</label>
                    <input type="password" name="old_password" value={passwords.old_password} onChange={handlePasswordChange} />
                </div>
                <div className="form-group">
                    <label>New Password</label>
                    <input type="password" name="new_password" value={passwords.new_password} onChange={handlePasswordChange} />
                </div>
                <div className="form-group">
                    <label>Confirm New Password</label>
                    <input type="password" name="confirm_password" value={passwords.confirm_password} onChange={handlePasswordChange} />
                </div>
                <button className="btn-primary" onClick={handlePasswordSubmit} style={{width: '100%'}}>Change Password</button>

                <div className="account-actions">
                    <button className="btn-secondary" onClick={() => navigate("/chat")}>Back to Chat</button>
                </div>
                
                <button className="btn-logout" onClick={handleLogout}>Log Out</button>

            </div>
        </div>
    );
};

export default Account;
