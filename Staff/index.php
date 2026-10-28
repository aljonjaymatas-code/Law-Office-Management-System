<?php
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_layout.php';

$user = staff_require_auth($pdo);
$success = staff_take_flash();

$summary = [
    'clients' => (int) $pdo->query(
        "SELECT COUNT(*)
         FROM clients c
         INNER JOIN users u ON u.user_id = c.user_id
         WHERE LOWER(TRIM(u.role)) = 'client'"
    )->fetchColumn(),
    'cases' => (int) $pdo->query('SELECT COUNT(*) FROM cases')->fetchColumn(),
    'appointments' => (int) $pdo->query(
        "SELECT COUNT(*) FROM appointments WHERE appointment_date >= NOW() AND status NOT IN ('Cancelled', 'Completed')"
    )->fetchColumn(),
];
$timeStatement = $pdo->prepare('SELECT COALESCE(SUM(hours), 0) FROM time_entries WHERE user_id = :user_id');
$timeStatement->execute(['user_id' => (int) $user['user_id']]);
$summary['hours'] = (float) $timeStatement->fetchColumn();

staff_layout_start('Staff Support Dashboard', $user, 'index.php', $success);
?>
<section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <?php
    $cards = [
        ['Clients', number_format($summary['clients']), 'users-round'],
        ['Cases', number_format($summary['cases']), 'briefcase-business'],
        ['Upcoming Appointments', number_format($summary['appointments']), 'calendar-days'],
        ['My Billable Hours', number_format($summary['hours'], 2) . ' hrs', 'clock-3'],
    ];
    foreach ($cards as [$label, $value, $icon]):
    ?>
        <article class="rounded-2xl border border-amber-500/20 bg-slate-900/80 p-5 shadow-lg">
            <div class="flex items-center justify-between">
                <p class="text-xs font-semibold uppercase tracking-wider text-slate-400"><?php echo staff_h($label); ?></p>
                <i data-lucide="<?php echo staff_h($icon); ?>" class="h-5 w-5 text-amber-400"></i>
            </div>
            <p class="mt-3 font-mono text-3xl font-extrabold text-white"><?php echo staff_h($value); ?></p>
        </article>
    <?php endforeach; ?>
</section>

<?php staff_layout_end(); ?>