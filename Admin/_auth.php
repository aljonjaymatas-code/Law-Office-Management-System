<?php
function admin_portal_role_for_account_role(string $role): ?string
{
    $normalizedRole = strtolower(trim($role));

    if (in_array($normalizedRole, ['admin', 'administrator', 'managing partner'], true)) {
        return 'admin';
    }

    if (in_array($normalizedRole, ['lawyer', 'attorney'], true)) {
        return 'lawyer';
    }

    return null;
}
