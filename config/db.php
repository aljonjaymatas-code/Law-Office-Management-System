<?php

$envPath = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env';
if (is_file($envPath) && is_readable($envPath)) {
    foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }

        [$name, $value] = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        if ($name === '' || getenv($name) !== false) {
            continue;
        }
        if (
            strlen($value) >= 2
            && (($value[0] === '"' && $value[strlen($value) - 1] === '"')
                || ($value[0] === "'" && $value[strlen($value) - 1] === "'"))
        ) {
            $value = substr($value, 1, -1);
        }

        putenv($name . '=' . $value);
        $_ENV[$name] = $value;
    }
}

$driver = getenv('DB_DRIVER') ?: 'sqlsrv';
$server = getenv('DB_HOST') ?: 'localhost';
$database = getenv('DB_NAME') ?: 'loms_v2';
$authentication = strtolower(getenv('DB_AUTH') ?: 'windows');
$trustServerCertificate = filter_var(
    getenv('DB_TRUST_SERVER_CERTIFICATE') ?: 'false',
    FILTER_VALIDATE_BOOLEAN
);

if ($driver !== 'sqlsrv') {
    throw new RuntimeException('DB_DRIVER must be set to sqlsrv.');
}
if (
    $server === ''
    || $database === ''
    || preg_match('/[;\r\n]/', $server . $database) === 1
) {
    throw new RuntimeException('DB_HOST and DB_NAME must contain valid SQL Server connection values.');
}
if (!in_array($authentication, ['windows', 'sql'], true)) {
    throw new RuntimeException('DB_AUTH must be set to windows or sql.');
}

$dsn = "sqlsrv:Server=$server;Database=$database";
if ($trustServerCertificate) {
    $dsn .= ';TrustServerCertificate=1';
}

$username = null;
$password = null;
if ($authentication === 'sql') {
    $username = getenv('DB_USERNAME');
    $password = getenv('DB_PASSWORD');
    if ($username === false || $username === '' || $password === false) {
        throw new RuntimeException('DB_USERNAME and DB_PASSWORD are required for SQL Server authentication.');
    }
}

try {
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $exception) {
    error_log('SQL Server connection failed: ' . $exception->getMessage());
    http_response_code(500);
    exit('Database connection failed. Check SQL Server availability, database access for the Apache Windows account, and the PDO_SQLSRV driver.');
}
