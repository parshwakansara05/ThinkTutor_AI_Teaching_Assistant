<?php
// api.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

// Handle POST payload
$input = json_decode(file_get_contents('php://input'), true);

if ($action === 'register') {
    if (!isset($input['username']) || !isset($input['email']) || !isset($input['password'])) {
        echo json_encode(["status" => "error", "message" => "Missing fields"]);
        exit;
    }
    
    $username = $input['username'];
    $email = $input['email'];
    $password = password_hash($input['password'], PASSWORD_DEFAULT);

    try {
        $stmt = $pdo->prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)");
        $stmt->execute([$username, $email, $password]);
        $id = $pdo->lastInsertId();
        echo json_encode(["status" => "success", "user_id" => $id, "username" => $username]);
    } catch (PDOException $e) {
        http_response_code(400);
        if ($e->getCode() == 23000) { // Integrity constraint violation (unique)
            echo json_encode(["status" => "error", "message" => "Username or email already exists"]);
        } else {
            echo json_encode(["status" => "error", "message" => "DB Error: " . $e->getMessage()]);
        }
    }

} elseif ($action === 'login') {
    if (!isset($input['email']) || !isset($input['password'])) {
        echo json_encode(["status" => "error", "message" => "Missing fields"]);
        exit;
    }

    $email = $input['email'];
    $password = $input['password'];

    $stmt = $pdo->prepare("SELECT id, username, password_hash, profile_photo FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        echo json_encode(["status" => "success", "user_id" => $user['id'], "username" => $user['username'], "profile_photo" => $user['profile_photo']]);
    } else {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Invalid email or password"]);
    }

} elseif ($action === 'save_chat') {
    if (!isset($input['user_id']) || !isset($input['session_id']) || !isset($input['sender']) || !isset($input['message'])) {
        echo json_encode(["status" => "error", "message" => "Missing fields"]);
        exit;
    }

    $user_id = $input['user_id'];
    $session_id = $input['session_id'];
    $sender = $input['sender']; // 'user' or 'bot'
    $message = $input['message'];

    $stmt = $pdo->prepare("INSERT INTO chats (user_id, session_id, sender, message_text) VALUES (?, ?, ?, ?)");
    if ($stmt->execute([$user_id, $session_id, $sender, $message])) {
        echo json_encode(["status" => "success"]);
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Failed to save chat"]);
    }

} elseif ($action === 'delete_chat') {
    if (!isset($input['user_id']) || !isset($input['session_id'])) {
        echo json_encode(["status" => "error", "message" => "Missing fields"]);
        exit;
    }

    $user_id = $input['user_id'];
    $session_id = $input['session_id'];

    $stmt = $pdo->prepare("DELETE FROM chats WHERE user_id = ? AND session_id = ?");
    if ($stmt->execute([$user_id, $session_id])) {
        echo json_encode(["status" => "success"]);
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Failed to delete chat"]);
    }

} elseif ($action === 'get_chats') {
    if (!isset($_GET['user_id'])) {
        echo json_encode(["status" => "error", "message" => "Missing user_id"]);
        exit;
    }

    $user_id = $_GET['user_id'];
    
    // Group chats by session_id
    $stmt = $pdo->prepare("SELECT session_id, sender, message_text, timestamp FROM chats WHERE user_id = ? ORDER BY timestamp ASC");
    $stmt->execute([$user_id]);
    $rows = $stmt->fetchAll();

    $sessions = [];
    foreach ($rows as $row) {
        $sid = $row['session_id'];
        if (!isset($sessions[$sid])) {
            $sessions[$sid] = [];
        }
        $sessions[$sid][] = [
            'sender' => $row['sender'],
            'text' => $row['message_text'],
            'timestamp' => $row['timestamp']
        ];
    }

    echo json_encode(["status" => "success", "sessions" => $sessions]);

} elseif ($action === 'get_user') {
    if (!isset($_GET['user_id'])) {
        echo json_encode(["status" => "error", "message" => "Missing user_id"]);
        exit;
    }
    $stmt = $pdo->prepare("SELECT username, email, profile_photo FROM users WHERE id = ?");
    $stmt->execute([$_GET['user_id']]);
    $user = $stmt->fetch();
    if ($user) {
        echo json_encode(["status" => "success", "user" => $user]);
    } else {
        echo json_encode(["status" => "error", "message" => "User not found"]);
    }

} elseif ($action === 'update_user') {
    if (!isset($input['user_id']) || !isset($input['username']) || !isset($input['email'])) {
        echo json_encode(["status" => "error", "message" => "Missing fields"]);
        exit;
    }
    try {
        $stmt = $pdo->prepare("UPDATE users SET username = ?, email = ? WHERE id = ?");
        $stmt->execute([$input['username'], $input['email'], $input['user_id']]);
        echo json_encode(["status" => "success"]);
    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => "Update failed. Email or username might be taken."]);
    }

} elseif ($action === 'change_password') {
    if (!isset($input['user_id']) || !isset($input['old_password']) || !isset($input['new_password'])) {
        echo json_encode(["status" => "error", "message" => "Missing fields"]);
        exit;
    }
    $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE id = ?");
    $stmt->execute([$input['user_id']]);
    $user = $stmt->fetch();
    if ($user && password_verify($input['old_password'], $user['password_hash'])) {
        $new_hash = password_hash($input['new_password'], PASSWORD_DEFAULT);
        $update_stmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
        $update_stmt->execute([$new_hash, $input['user_id']]);
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Incorrect old password"]);
    }

} elseif ($action === 'upload_photo') {
    if (!isset($_POST['user_id']) || !isset($_FILES['photo'])) {
        echo json_encode(["status" => "error", "message" => "Missing fields or file"]);
        exit;
    }
    $target_dir = "uploads/profiles/";
    if (!file_exists($target_dir)) {
        mkdir($target_dir, 0777, true);
    }
    $file_extension = pathinfo($_FILES["photo"]["name"], PATHINFO_EXTENSION);
    $file_name = "user_" . $_POST['user_id'] . "_" . time() . "." . $file_extension;
    $target_file = $target_dir . $file_name;
    
    if (move_uploaded_file($_FILES["photo"]["tmp_name"], $target_file)) {
        $photo_url = "/ThinkTutor/php_backend/" . $target_file;
        $stmt = $pdo->prepare("UPDATE users SET profile_photo = ? WHERE id = ?");
        $stmt->execute([$photo_url, $_POST['user_id']]);
        echo json_encode(["status" => "success", "profile_photo" => $photo_url]);
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to upload file"]);
    }

} elseif ($action === 'remove_photo') {
    if (!isset($input['user_id'])) {
        echo json_encode(["status" => "error", "message" => "Missing user_id"]);
        exit;
    }
    $stmt = $pdo->prepare("UPDATE users SET profile_photo = NULL WHERE id = ?");
    if ($stmt->execute([$input['user_id']])) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to remove photo"]);
    }

} else {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "Unknown action"]);
}
?>
