<?php
function staff_layout_start(string $title, array $user, string $activePage, string $success = '', string $error = ''): void
{
    $navigation = [
        'index.php' => ['Dashboard', 'layout-dashboard'],
        'clients.php' => ['Clients', 'users-round'],
        'cases.php' => ['Cases', 'briefcase-business'],
        'appointments.php' => ['Appointments', 'calendar-days'],
        'time_entries.php' => ['Time Entries', 'clock-3'],
        'documents.php' => ['Documents', 'files'],
    ];
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title><?php echo staff_h($title); ?> - Staff Portal</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/lucide@latest"></script>
        <link rel="stylesheet" href="../CSS/staff-styles.css">
        <style>
            html {
                overflow-y: scroll;
                scrollbar-gutter: stable;
            }
        </style>
    </head>
    <body class="min-h-screen bg-[#020617] text-slate-100 antialiased selection:bg-amber-500 selection:text-slate-950">
        <header class="sticky top-0 z-40 border-b border-amber-500/20 bg-slate-900/95 px-4 py-4 shadow-lg backdrop-blur-md sm:px-6">
            <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
                <a href="index.php" class="flex items-center gap-3">
                    <span class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 gold-glow-sm">
                        <i data-lucide="users" class="h-6 w-6"></i>
                    </span>
                    <span>
                        <span class="block text-lg font-bold tracking-wide text-white">Law Office Management System</span>
                        <span class="block text-xs font-semibold tracking-wider text-amber-400">STAFF PORTAL</span>
                    </span>
                </a>
                <div class="flex items-center gap-4">
                    <div class="hidden text-right sm:block">
                        <p class="text-sm font-semibold text-white"><?php echo staff_h($user['username']); ?></p>
                        <p class="text-xs text-slate-400"><?php echo staff_h($user['email']); ?></p>
                    </div>
                    <a href="logout.php" class="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-red-500/50 hover:text-red-300">
                        <i data-lucide="log-out" class="h-4 w-4"></i><span>Log out</span>
                    </a>
                </div>
            </div>
        </header>
        <nav class="border-b border-slate-800 bg-slate-950/80 px-4 sm:px-6" aria-label="Staff sections">
            <div class="mx-auto flex max-w-7xl gap-1 overflow-x-auto py-2">
                <?php foreach ($navigation as $path => [$label, $icon]): ?>
                    <a
                        href="<?php echo staff_h($path); ?>"
                        class="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition <?php echo $activePage === $path ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-white'; ?>"
                        <?php echo $activePage === $path ? 'aria-current="page"' : ''; ?>>
                        <i data-lucide="<?php echo staff_h($icon); ?>" class="h-4 w-4"></i>
                        <?php echo staff_h($label); ?>
                    </a>
                <?php endforeach; ?>
            </div>
        </nav>
        <main class="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
            <section class="rounded-2xl border border-amber-500/25 bg-gradient-to-r from-blue-900/40 via-slate-900/90 to-slate-900/90 p-5 shadow-xl sm:p-6">
                <h1 class="text-2xl font-bold tracking-wide text-white"><?php echo staff_h($title); ?></h1>
                <p class="mt-1 text-sm text-slate-300">Staff operations and records from the law office database.</p>
            </section>
            <?php if ($success !== ''): ?>
                <p role="status" class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"><?php echo staff_h($success); ?></p>
            <?php endif; ?>
            <?php if ($error !== ''): ?>
                <p role="alert" class="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"><?php echo staff_h($error); ?></p>
            <?php endif; ?>
    <?php
}

function staff_layout_end(): void
{
    ?>
        </main>
        <script>
            if (window.lucide) window.lucide.createIcons();
        </script>
    </body>
    </html>
    <?php
}

function staff_table_empty_row(int $columnCount, string $message = 'No records found.'): void
{
    ?>
    <tr><td colspan="<?php echo $columnCount; ?>" class="p-6 text-center text-slate-400"><?php echo staff_h($message); ?></td></tr>
    <?php
}

function staff_input_class(): string
{
    return 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-500';
}

function staff_panel_class(): string
{
    return 'overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-900/80 shadow-xl';
}

function staff_panel_heading(string $title): void
{
    ?>
    <div class="border-b border-slate-800 p-5">
        <h2 class="font-bold tracking-wide text-white"><?php echo staff_h($title); ?></h2>
    </div>
    <?php
}
