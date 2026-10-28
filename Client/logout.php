<?php
require_once __DIR__ . '/_bootstrap.php';

unset($_SESSION['client_user_id'], $_SESSION['client_csrf_token'], $_SESSION['client_flash']);
session_regenerate_id(true);

header('Location: login.php');
exit;