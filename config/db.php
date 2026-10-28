<?php
// config/db.php

$host = 'localhost';
$db_name = 'loms';
$username = 'root'; // Change if you have a custom MySQL/MariaDB username
$password = '';     // Change if you have a password set in XAMPP/MariaDB

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8mb4", $username, $password);
    
    // Set PDO error mode to exception for easier debugging
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Set default fetch mode to associative array
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

} catch (PDOException $e) {
    // If connection fails, stop execution and show error
    die("Database Connection Failed: " . $e->getMessage());
}
?>