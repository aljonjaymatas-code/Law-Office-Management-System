<?php
if (!defined('CLIENT_PORTAL_ACCESS')) {
    header('Location: login.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Law Office Management System - Client Portal</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <link rel="stylesheet" href="styles.css">
</head>
<body class="bg-[#020617] text-slate-100 antialiased selection:bg-amber-500 selection:text-slate-950">
    <div id="root"></div>
    <script>
        window.CLIENT_PORTAL_DATA = <?php echo json_encode(
            $clientPortalData,
            JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_THROW_ON_ERROR
        ); ?>;
    </script>
    <script type="text/babel" src="js/client-app.js?v=2"></script>
</body>
</html>
