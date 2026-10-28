<?php
session_start();
unset($_SESSION['admin_portal_role'], $_SESSION['admin_portal_user_id'], $_SESSION['admin_signup_csrf']);
session_regenerate_id(true);

header('Location: login.php');
exit;