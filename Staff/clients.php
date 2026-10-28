<?php
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_layout.php';

$user = staff_require_auth($pdo);
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $fullname = trim((string) ($_POST['fullname'] ?? ''));
    $emailInput = trim((string) ($_POST['email'] ?? ''));
    $phone = trim((string) ($_POST['phone'] ?? ''));
    $address = trim((string) ($_POST['address'] ?? ''));

    if (!staff_csrf_is_valid($_POST['_csrf'] ?? null)) {
        $error = 'Your session has expired. Refresh the page and try again.';
    } elseif (strlen($fullname) < 2 || strlen($fullname) > 150) {
        $error = 'Enter a client name between 2 and 150 characters.';
    } elseif ($emailInput !== '' && filter_var($emailInput, FILTER_VALIDATE_EMAIL) === false) {
        $error = 'Enter a valid email address or leave the email field blank.';
    } elseif (strlen($phone) > 12) {
        $error = 'The phone number must be 12 characters or fewer.';
    } else {
        $statement = $pdo->prepare(
            'INSERT INTO clients (fullname, phone, email, address) VALUES (:fullname, :phone, :email, :address)'
        );
        $statement->execute([
            'fullname' => $fullname,
            'phone' => $phone !== '' ? $phone : null,
            'email' => $emailInput !== '' ? $emailInput : null,
            'address' => $address !== '' ? $address : null,
        ]);
        staff_redirect_with_flash('Client record added successfully.');
    }
}

$clientsStatement = $pdo->query(
    "SELECT c.client_id, c.fullname, c.email, c.phone, c.address
     FROM clients c
     INNER JOIN users u ON u.user_id = c.user_id
     WHERE LOWER(TRIM(u.role)) = 'client'
     ORDER BY c.fullname ASC, c.client_id ASC"
);
$clients = $clientsStatement->fetchAll();
$intakeRecordsStatement = $pdo->query(
    "SELECT c.client_id, c.fullname, c.email, c.phone, c.address
     FROM clients c
     LEFT JOIN users u
       ON u.user_id = c.user_id AND LOWER(TRIM(u.role)) = 'client'
     WHERE u.user_id IS NULL
     ORDER BY c.fullname ASC, c.client_id ASC"
);
$intakeRecords = $intakeRecordsStatement->fetchAll();

staff_layout_start('Client Registration & Intake Management', $user, 'clients.php', staff_take_flash(), $error);
?>
<section class="<?php echo staff_panel_class(); ?>">
    <?php staff_panel_heading('New Client Intake'); ?>~~
    <form method="post" action="clients.php" class="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
        <?php staff_csrf_field(); ?>
        <div>
            <label for="fullname" class="mb-1 block text-sm font-medium text-slate-200">Full Name / Company <span class="text-amber-400">*</span></label>
            <input id="fullname" name="fullname" type="text" required minlength="2" maxlength="150" value="<?php echo staff_h($_POST['fullname'] ?? ''); ?>" class="<?php echo staff_input_class(); ?>">
        </div>
        <div>
            <label for="email" class="mb-1 block text-sm font-medium text-slate-200">Email Address</label>
            <input id="email" name="email" type="email" maxlength="150" value="<?php echo staff_h($_POST['email'] ?? ''); ?>" class="<?php echo staff_input_class(); ?>">
        </div>
        <div>
            <label for="phone" class="mb-1 block text-sm font-medium text-slate-200">Phone Number</label>
            <input id="phone" name="phone" type="tel" maxlength="12" value="<?php echo staff_h($_POST['phone'] ?? ''); ?>" class="<?php echo staff_input_class(); ?>">
        </div>
        <div>
            <label for="address" class="mb-1 block text-sm font-medium text-slate-200">Physical Address</label>
            <input id="address" name="address" type="text" value="<?php echo staff_h($_POST['address'] ?? ''); ?>" class="<?php echo staff_input_class(); ?>">
        </div>
        <div class="md:col-span-2">
            <button type="submit" class="rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:from-amber-500 hover:to-amber-400">Save Client</button>
        </div>
    </form>
</section>

<section class="<?php echo staff_panel_class(); ?>">
    <?php staff_panel_heading('Registered Client Accounts'); ?>
    <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-left text-sm text-slate-300">
            <thead class="bg-slate-950/60 text-xs uppercase tracking-wider text-amber-400/80">
                <tr><th class="p-4">Client ID</th><th class="p-4">Full Name / Company</th><th class="p-4">Email Address</th><th class="p-4">Phone Number</th><th class="p-4">Physical Address</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
                <?php if ($clients === []): ?>
                    <?php staff_table_empty_row(5, 'No registered Client accounts found.'); ?>
                <?php else: foreach ($clients as $client): ?>
                    <tr class="hover:bg-slate-800/40">
                        <td class="p-4 font-mono text-amber-300">#<?php echo (int) $client['client_id']; ?></td>
                        <td class="p-4 font-semibold text-white"><?php echo staff_h($client['fullname']); ?></td>
                        <td class="p-4"><?php echo staff_h($client['email'] ?: '—'); ?></td>
                        <td class="p-4"><?php echo staff_h($client['phone'] ?: '—'); ?></td>
                        <td class="p-4"><?php echo staff_h($client['address'] ?: '—'); ?></td>
                    </tr>
                <?php endforeach; endif; ?>
            </tbody>
        </table>
    </div>
</section>

<section class="<?php echo staff_panel_class(); ?>">
    <?php staff_panel_heading('Client Intake Records (No Client Account)'); ?>
    <p class="px-5 pb-4 text-sm text-slate-400">These staff-entered records are not linked to a Client user account and are excluded from dashboard client totals.</p>
    <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-left text-sm text-slate-300">
            <thead class="bg-slate-950/60 text-xs uppercase tracking-wider text-amber-400/80">
                <tr><th class="p-4">Record ID</th><th class="p-4">Full Name / Company</th><th class="p-4">Email Address</th><th class="p-4">Phone Number</th><th class="p-4">Physical Address</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
                <?php if ($intakeRecords === []): ?>
                    <?php staff_table_empty_row(5, 'No unlinked client intake records.'); ?>
                <?php else: foreach ($intakeRecords as $client): ?>
                    <tr class="hover:bg-slate-800/40">
                        <td class="p-4 font-mono text-amber-300">#<?php echo (int) $client['client_id']; ?></td>
                        <td class="p-4 font-semibold text-white"><?php echo staff_h($client['fullname']); ?></td>
                        <td class="p-4"><?php echo staff_h($client['email'] ?: '—'); ?></td>
                        <td class="p-4"><?php echo staff_h($client['phone'] ?: '—'); ?></td>
                        <td class="p-4"><?php echo staff_h($client['address'] ?: '—'); ?></td>
                    </tr>
                <?php endforeach; endif; ?>
            </tbody>
        </table>
    </div>
</section>
<?php staff_layout_end(); ?>
