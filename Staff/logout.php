<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

unset($_SESSION['staff_user_id'], $_SESSION['staff_csrf_token'], $_SESSION['staff_flash']);
session_regenerate_id(true);

header('Location: login.php');
exit;
