<?php
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_layout.php';

$user = staff_require_auth($pdo);
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $title = trim((string) ($_POST['title'] ?? ''));
    $clientId = filter_var($_POST['client_id'] ?? null, FILTER_VALIDATE_INT);
    $caseInput = trim((string) ($_POST['case_id'] ?? ''));
    $caseId = $caseInput === '' ? null : filter_var($caseInput, FILTER_VALIDATE_INT);
    $type = trim((string) ($_POST['type'] ?? ''));
    $dateInput = trim((string) ($_POST['appointment_date'] ?? ''));
    $appointmentDate = DateTime::createFromFormat('!Y-m-d\TH:i', $dateInput);
    $dateErrors = DateTime::getLastErrors();

    if (!staff_csrf_is_valid($_POST['_csrf'] ?? null)) {
        $error = 'Your session has expired. Refresh the page and try again.';
    } elseif ($title === '' || strlen($title) > 255) {
        $error = 'Enter an appointment title (up to 255 characters).';
    } elseif ($clientId === false || $clientId === null || $clientId < 1) {
        $error = 'Select a valid client.';
    } elseif ($caseId === false || ($caseId !== null && $caseId < 1)) {
        $error = 'Select a valid case, or leave it blank.';
    } elseif ($type === '' || strlen($type) > 50) {
        $error = 'Enter an appointment type (up to 50 characters).';
    } elseif (
        !$appointmentDate
        || ($dateErrors !== false && ($dateErrors['warning_count'] > 0 || $dateErrors['error_count'] > 0))
        || $appointmentDate <= new DateTime()
    ) {
        $error = 'Choose a valid future date and time.';
    } else {
        $clientCheck = $pdo->prepare('SELECT client_id FROM clients WHERE client_id = :client_id LIMIT 1');
        $clientCheck->execute(['client_id' => $clientId]);
        if ($clientCheck->fetchColumn() === false) {
            $error = 'The selected client could not be found.';
        } elseif ($caseId !== null) {
            $caseCheck = $pdo->prepare('SELECT client_id FROM cases WHERE case_id = :case_id LIMIT 1');
            $caseCheck->execute(['case_id' => $caseId]);
            $caseClientId = $caseCheck->fetchColumn();
            if ($caseClientId === false || (int) $caseClientId !== $clientId) {
                $error = 'Select a case that belongs to the chosen client.';
            }
        }

        if ($error === '') {
            $insert = $pdo->prepare(
                'INSERT INTO appointments (case_id, client_id, user_id, title, appointment_date, type, status)
                 VALUES (:case_id, :client_id, :user_id, :title, :appointment_date, :type, :status)'
            );
            $insert->execute([
                'case_id' => $caseId,
                'client_id' => $clientId,
                'user_id' => (int) $user['user_id'],
                'title' => $title,
                'appointment_date' => $appointmentDate->format('Y-m-d H:i:s'),
                'type' => $type,
                'status' => 'Pending',
            ]);
            staff_redirect_with_flash('Appointment saved as pending.');
        }
    }
}

$clients = $pdo->query('SELECT client_id, fullname FROM clients ORDER BY fullname ASC')->fetchAll();
$cases = $pdo->query('SELECT case_id, client_id, case_number, title FROM cases ORDER BY case_number ASC')->fetchAll();
$appointmentsStatement = $pdo->query(
    'SELECT a.appointment_id, a.title, a.appointment_date, a.type, a.status,
            cl.fullname AS client_name, c.case_number, c.title AS case_title,
            COALESCE(u.username, CASE WHEN a.user_id IS NULL THEN \'Client request\' END) AS staff_name
     FROM appointments a
     LEFT JOIN clients cl ON cl.client_id = a.client_id
     LEFT JOIN cases c ON c.case_id = a.case_id
     LEFT JOIN users u ON u.user_id = a.user_id
     ORDER BY a.appointment_date DESC, a.appointment_id DESC'
);
$appointments = $appointmentsStatement->fetchAll();

staff_layout_start('Appointment & Hearing Scheduling', $user, 'appointments.php', staff_take_flash(), $error);
?>
<section class="<?php echo staff_panel_class(); ?>">
    <?php if ($clients === []): ?>
        <?php staff_panel_heading('Schedule an Appointment'); ?>
        <p class="p-5 text-sm text-slate-400">Add a client before scheduling an appointment.</p>
    <?php else: ?>
        <details class="group" <?php echo $error !== '' ? 'open' : ''; ?>>
            <summary class="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
                <span>
                    <span class="block font-bold tracking-wide text-white">Schedule an Appointment</span>
                    <span class="mt-1 block text-sm text-slate-400">Open the form to schedule a client meeting or hearing.</span>
                </span>
                <span class="inline-flex shrink-0 items-center gap-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:from-amber-500 hover:to-amber-400">
                    <i data-lucide="plus" class="h-4 w-4 group-open:hidden"></i>
                    <i data-lucide="minus" class="hidden h-4 w-4 group-open:block"></i>
                    <span class="group-open:hidden">Schedule Appointment</span>
                    <span class="hidden group-open:inline">Close Form</span>
                </span>
            </summary>
            <form method="post" action="appointments.php" class="grid grid-cols-1 gap-4 border-t border-slate-800 p-5 md:grid-cols-2">
            <?php staff_csrf_field(); ?>
            <div>
                <label for="title" class="mb-1 block text-sm font-medium text-slate-200">Meeting Title <span class="text-amber-400">*</span></label>
                <input id="title" name="title" type="text" required maxlength="255" value="<?php echo staff_h($_POST['title'] ?? ''); ?>" class="<?php echo staff_input_class(); ?>" placeholder="e.g. Case consultation">
            </div>
            <div>
                <label for="client_id" class="mb-1 block text-sm font-medium text-slate-200">Client <span class="text-amber-400">*</span></label>
                <select id="client_id" name="client_id" required class="<?php echo staff_input_class(); ?>">
                    <option value="">Select a client</option>
                    <?php foreach ($clients as $client): ?>
                        <option value="<?php echo (int) $client['client_id']; ?>" <?php echo (string) ($_POST['client_id'] ?? '') === (string) $client['client_id'] ? 'selected' : ''; ?>>
                            <?php echo staff_h($client['fullname']); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div>
                <label for="case_id" class="mb-1 block text-sm font-medium text-slate-200">Related Case</label>
                <select id="case_id" name="case_id" class="<?php echo staff_input_class(); ?>">
                    <option value="">No case selected</option>
                    <?php foreach ($cases as $case): ?>
                        <option value="<?php echo (int) $case['case_id']; ?>" <?php echo (string) ($_POST['case_id'] ?? '') === (string) $case['case_id'] ? 'selected' : ''; ?>>
                            <?php echo staff_h($case['case_number'] . ' — ' . $case['title']); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
                <p class="mt-1 text-xs text-slate-500">If selected, the case must belong to the selected client.</p>
            </div>
            <div>
                <label for="type" class="mb-1 block text-sm font-medium text-slate-200">Appointment Type <span class="text-amber-400">*</span></label>
                <select id="type" name="type" required class="<?php echo staff_input_class(); ?>">
                    <option value="">Select a type</option>
                    <?php foreach (['Consultation', 'Hearing', 'Deposition', 'Client Meeting', 'Other'] as $appointmentType): ?>
                        <option value="<?php echo staff_h($appointmentType); ?>" <?php echo ($_POST['type'] ?? '') === $appointmentType ? 'selected' : ''; ?>><?php echo staff_h($appointmentType); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div>
                <label for="appointment_date" class="mb-1 block text-sm font-medium text-slate-200">Date &amp; Time <span class="text-amber-400">*</span></label>
                <input id="appointment_date" name="appointment_date" type="datetime-local" required min="<?php echo staff_h(date('Y-m-d\TH:i')); ?>" value="<?php echo staff_h($_POST['appointment_date'] ?? ''); ?>" class="<?php echo staff_input_class(); ?>">
            </div>
            <div class="flex items-end">
                <button type="submit" class="rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:from-amber-500 hover:to-amber-400">Save Pending Appointment</button>
            </div>
            </form>
        </details>
    <?php endif; ?>
</section>

<section class="<?php echo staff_panel_class(); ?>">
    <?php staff_panel_heading('Upcoming Appointments'); ?>
    <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-left text-sm text-slate-300">
            <thead class="bg-slate-950/60 text-xs uppercase tracking-wider text-amber-400/80">
                <tr><th class="p-4">Meeting Title</th><th class="p-4">Client</th><th class="p-4">Case</th><th class="p-4">Date &amp; Time</th><th class="p-4">Type</th><th class="p-4">Status</th><th class="p-4">Created By</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
                <?php if ($appointments === []): ?>
                    <?php staff_table_empty_row(7, 'No appointments have been recorded.'); ?>
                <?php else: foreach ($appointments as $appointment): ?>
                    <tr class="hover:bg-slate-800/40">
                        <td class="p-4 font-semibold text-white"><?php echo staff_h($appointment['title']); ?></td>
                        <td class="p-4"><?php echo staff_h($appointment['client_name'] ?: '—'); ?></td>
                        <td class="p-4"><?php echo staff_h($appointment['case_number'] ? $appointment['case_number'] . ' — ' . $appointment['case_title'] : '—'); ?></td>
                        <td class="p-4"><?php echo staff_h(date('M j, Y g:i A', strtotime($appointment['appointment_date']))); ?></td>
                        <td class="p-4"><?php echo staff_h($appointment['type'] ?: '—'); ?></td>
                        <td class="p-4"><?php echo staff_h($appointment['status']); ?></td>
                        <td class="p-4"><?php echo staff_h($appointment['staff_name'] ?: '—'); ?></td>
                    </tr>
                <?php endforeach; endif; ?>
            </tbody>
        </table>
    </div>
</section>
<?php staff_layout_end(); ?>
