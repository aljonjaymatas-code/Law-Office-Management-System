const { useState, useEffect, useRef } = React;
        const { DOCUMENT_REVIEW_KEY, APPOINTMENTS_KEY, NOTIFICATIONS_KEY, readNotifications, readAppointmentRecords, readDocumentSubmissions, getLocalDateString } = window.AdminPortalStorage;
const currentUser = window.ADMIN_USER;
        const ADMIN_THEMES = [
          { id: 'amber', name: 'Classic Amber', description: 'Warm gold accents', color: '#f59e0b' },
          { id: 'ocean', name: 'Ocean Blue', description: 'Calm blue accents', color: '#38bdf8' },
          { id: 'emerald', name: 'Emerald', description: 'Fresh green accents', color: '#34d399' },
        ];

        function AdminLawyerDashboard() {
          const [userRole, setUserRole] = useState(window.ADMIN_USER_ROLE === 'lawyer' ? 'lawyer' : 'admin');
          const requestedTab = new URLSearchParams(window.location.search).get('tab');
          const requestedAttorneyTab = ['schedule', 'hours', 'account-settings', 'customization'].includes(requestedTab) ? requestedTab : 'cases';
          const [activeTab, setActiveTab] = useState(userRole === 'admin' ? 'overview' : requestedAttorneyTab);
          const [menuOpen, setMenuOpen] = useState(false);
          const [adminTheme, setAdminTheme] = useState(document.documentElement.dataset.adminTheme || 'amber');
          const [themeStorageError, setThemeStorageError] = useState(Boolean(window.ADMIN_THEME_STORAGE_ERROR));
          const [searchQuery, setSearchQuery] = useState('');
          const searchInputRef = useRef(null);
          const [reviewDocuments, setReviewDocuments] = useState(readDocumentSubmissions);
          const [selectedReviewDocumentId, setSelectedReviewDocumentId] = useState(null);
          const [declineMode, setDeclineMode] = useState(false);
          const [declineComment, setDeclineComment] = useState('');
          const [declineError, setDeclineError] = useState('');
          const [appointmentRequests, setAppointmentRequests] = useState(readAppointmentRecords);
          const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
          const [appointmentAvailabilityDate, setAppointmentAvailabilityDate] = useState('');
          const [appointmentAvailabilityTime, setAppointmentAvailabilityTime] = useState('');
          const [appointmentDecisionComment, setAppointmentDecisionComment] = useState('');
          const [appointmentDecisionError, setAppointmentDecisionError] = useState('');
          const [notifications, setNotifications] = useState(readNotifications);
          const [notificationsOpen, setNotificationsOpen] = useState(false);
          const timeEntries = Array.isArray(window.ADMIN_TIME_ENTRIES) ? window.ADMIN_TIME_ENTRIES : [];
          const [timeEntryModalOpen, setTimeEntryModalOpen] = useState(Boolean(window.ADMIN_TIME_ENTRY_NOTICE && window.ADMIN_TIME_ENTRY_NOTICE.type === 'error'));

          const usersList = Array.isArray(window.ADMIN_USERS) ? window.ADMIN_USERS : [];
          const clientRecords = Array.isArray(window.ADMIN_CLIENT_RECORDS) ? window.ADMIN_CLIENT_RECORDS : [];
          const caseRecords = Array.isArray(window.ADMIN_CASE_RECORDS) ? window.ADMIN_CASE_RECORDS : [];
          const pendingAppointments = Array.isArray(window.ADMIN_PENDING_APPOINTMENTS) ? window.ADMIN_PENDING_APPOINTMENTS : [];
          const calendarAppointments = Array.isArray(window.ADMIN_CALENDAR_APPOINTMENTS) ? window.ADMIN_CALENDAR_APPOINTMENTS : [];

          const firmReporting = {
            totalCases: window.ADMIN_TOTAL_CASES,
            pendingAppointments: window.ADMIN_PENDING_APPOINTMENTS_COUNT,
            totalBillableHoursYTD: `${Number(window.ADMIN_TOTAL_BILLABLE_HOURS_YTD || 0).toFixed(2)} hrs`,
            totalClients: window.ADMIN_TOTAL_CLIENTS
          };

          const assignedCases = caseRecords.filter((legalCase) => legalCase.lawyer_name);

          const masterCalendarAppointments = [
            ...calendarAppointments
              .filter((appointment) => appointment.status === 'Confirmed')
              .map((appointment) => ({
                id: `appointment-${appointment.appointment_id}`,
                title: appointment.title,
                case_title: appointment.case_title || appointment.client_name || 'No case or client',
                appointment_date: appointment.appointment_date,
                type: appointment.type
              }))
          ];

          const transactionHistory = [
            { transaction_id: 'TXN-2026-0418', date: '2026-04-18 10:42 AM', activity: 'Retainer payment received', record: 'Doe vs. Enterprise', performed_by: 'Victoria Sterling', status: 'Completed' },
            { transaction_id: 'TXN-2026-0417', date: '2026-04-17 03:16 PM', activity: 'Legal document uploaded', record: 'Acme Breach of Contract', performed_by: 'Marcus Vance', status: 'Completed' },
            { transaction_id: 'TXN-2026-0416', date: '2026-04-16 11:05 AM', activity: 'Consultation scheduled', record: 'Client #CL-2048', performed_by: 'Victoria Sterling', status: 'Pending' },
            { transaction_id: 'TXN-2026-0415', date: '2026-04-15 09:28 AM', activity: 'Case status updated', record: 'Doe vs. Enterprise', performed_by: 'Marcus Vance', status: 'Completed' }
          ];

          const searchableRecords = [
            ...usersList.map((user) => ({
              id: `user-${user.user_id}`,
              type: 'User',
              title: user.username,
              details: `${user.email} ${user.role} ${user.created_at} ${user.user_id}`,
              role: 'admin',
              tab: 'users'
            })),
            ...caseRecords.map((legalCase) => ({
              id: `database-case-${legalCase.case_id}`,
              type: 'Legal Case',
              title: `${legalCase.case_number} - ${legalCase.title}`,
              details: `${legalCase.client_name || ''} ${legalCase.lawyer_name || ''} ${legalCase.status} ${legalCase.filed_date}`,
              role: 'admin',
              tab: 'overview'
            })),
            ...reviewDocuments.map((doc) => ({
              id: `review-document-${doc.document_id}`,
              type: 'Document Review',
              title: doc.document_name,
              details: `${doc.case_title} ${doc.upload_date} ${doc.review_status} ${doc.uploaded_by}`,
              role: 'admin',
              tab: 'document-review'
            })),
            ...assignedCases.map((legalCase) => ({
              id: `case-${legalCase.case_id}`,
              type: 'Case',
              title: `${legalCase.case_number} - ${legalCase.title}`,
              details: `${legalCase.status} ${legalCase.filed_date}`,
              role: 'lawyer',
              tab: 'cases'
            })),
            ...masterCalendarAppointments.map((schedule) => ({
              id: `schedule-${schedule.appointment_id}`,
              type: 'Court date',
              title: schedule.title,
              details: `${schedule.case_title} ${schedule.appointment_date} ${schedule.type} ${schedule.status}`,
              role: 'lawyer',
              tab: 'schedule'
            })),
            ...timeEntries.map((entry) => ({
              id: `time-entry-${entry.time_entry_id}`,
              type: 'Time entry',
              title: entry.case_title,
              details: `${entry.description} ${entry.date_logged} ${entry.hours}`,
              role: 'lawyer',
              tab: 'hours'
            }))
          ];
          const normalizeSearch = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
          const searchTokens = normalizeSearch(searchQuery).split(/\s+/).filter(Boolean);
          const searchResults = searchTokens.length
            ? searchableRecords.filter((record) => {
                const searchableText = normalizeSearch(`${record.title} ${record.details} ${record.type}`);
                return searchTokens.every((token) => searchableText.includes(token));
              })
            : [];
          const matchesSearch = (record) => !searchTokens.length || searchTokens.every((token) => normalizeSearch(Object.values(record).join(' ')).includes(token));

          useEffect(() => {
            if (window.lucide) {
              window.lucide.createIcons();
            }
          }, [userRole, activeTab, menuOpen, reviewDocuments, appointmentRequests, notificationsOpen, notifications, timeEntryModalOpen, timeEntries]);

          useEffect(() => {
            const syncDocumentSubmissions = (event) => {
              if (event.key === DOCUMENT_REVIEW_KEY) {
                setReviewDocuments(readDocumentSubmissions());
              }
            };
            window.addEventListener('storage', syncDocumentSubmissions);
            return () => window.removeEventListener('storage', syncDocumentSubmissions);
          }, []);

          useEffect(() => {
            const syncAppointments = (event) => {
              if (event.key !== APPOINTMENTS_KEY) return;
              setAppointmentRequests(readAppointmentRecords());
            };
            window.addEventListener('storage', syncAppointments);
            return () => window.removeEventListener('storage', syncAppointments);
          }, []);

          useEffect(() => {
            const syncNotifications = (event) => {
              if (event.key !== NOTIFICATIONS_KEY) return;
              setNotifications(readNotifications());
            };
            window.addEventListener('storage', syncNotifications);
            return () => window.removeEventListener('storage', syncNotifications);
          }, []);

          useEffect(() => {
            if (!notificationsOpen) return undefined;
            const closeNotificationsOnEscape = (event) => {
              if (event.key === 'Escape') setNotificationsOpen(false);
            };
            window.addEventListener('keydown', closeNotificationsOnEscape);
            return () => window.removeEventListener('keydown', closeNotificationsOnEscape);
          }, [notificationsOpen]);

          useEffect(() => {
            if (!timeEntryModalOpen) return undefined;
            const closeTimeEntryModalOnEscape = (event) => {
              if (event.key === 'Escape') setTimeEntryModalOpen(false);
            };
            window.addEventListener('keydown', closeTimeEntryModalOnEscape);
            return () => window.removeEventListener('keydown', closeTimeEntryModalOnEscape);
          }, [timeEntryModalOpen]);

          useEffect(() => {
            const handleSearchShortcut = (event) => {
              if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                searchInputRef.current?.focus();
              }
            };
            window.addEventListener('keydown', handleSearchShortcut);
            return () => window.removeEventListener('keydown', handleSearchShortcut);
          }, []);

          useEffect(() => {
            if (!selectedReviewDocumentId) return undefined;
            const handleReviewKeyDown = (event) => {
              if (event.key === 'Escape') closeDocumentReview();
            };
            window.addEventListener('keydown', handleReviewKeyDown);
            return () => window.removeEventListener('keydown', handleReviewKeyDown);
          }, [selectedReviewDocumentId]);

          useEffect(() => {
            if (!selectedAppointmentId) return undefined;
            const handleAppointmentReviewKeyDown = (event) => {
              if (event.key === 'Escape') closeAppointmentReview();
            };
            window.addEventListener('keydown', handleAppointmentReviewKeyDown);
            return () => window.removeEventListener('keydown', handleAppointmentReviewKeyDown);
          }, [selectedAppointmentId]);

          const handleLogout = () => {
            window.location.href = 'logout.php';
          };

          const selectAdminTheme = (theme) => {
            if (!ADMIN_THEMES.some((item) => item.id === theme)) {
              console.error('Ignoring an unsupported Admin portal theme.', theme);
              return;
            }
            document.documentElement.dataset.adminTheme = theme;
            setAdminTheme(theme);
            setThemeStorageError(false);
            try {
              window.localStorage.setItem(window.ADMIN_THEME_STORAGE_KEY, theme);
            } catch (error) {
              console.error('Unable to save the Admin portal theme.', error);
              setThemeStorageError(true);
            }
          };

          const addNotification = (notification) => {
            const currentNotifications = readNotifications();
            const updatedNotifications = [{
              notification_id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              ...notification,
              created_at: new Date().toISOString(),
              read: false
            }, ...currentNotifications].slice(0, 100);
            try {
              window.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updatedNotifications));
              setNotifications(updatedNotifications);
            } catch (error) {
              console.error('Unable to save a portal notification.', error);
              window.alert('The form was saved, but its notification could not be saved. Check browser storage.');
            }
          };

          const updateNotifications = (update) => {
            const updatedNotifications = update(readNotifications());
            try {
              window.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updatedNotifications));
              setNotifications(updatedNotifications);
            } catch (error) {
              console.error('Unable to update portal notifications.', error);
              window.alert('Unable to update notifications. Check browser storage and try again.');
            }
          };

          const markAllNotificationsRead = () => {
            updateNotifications((current) => current.map((notification) => (
              notification.audience === 'attorney' ? { ...notification, read: true } : notification
            )));
          };

          const openNotification = (notification) => {
            if (!notification.read) {
              updateNotifications((current) => current.map((item) => (
                item.notification_id === notification.notification_id ? { ...item, read: true } : item
              )));
            }
            if (notification.tab) {
              setUserRole(notification.role || 'lawyer');
              setActiveTab(notification.tab);
            }
            setNotificationsOpen(false);
          };

          const saveAppointmentDecision = (appointmentId, decision) => {
            const currentAppointments = readAppointmentRecords();
            const target = currentAppointments.find((appointment) => appointment.appointment_id === appointmentId);
            if (!target || target.status !== 'Attorney Review — Submitted') {
              setAppointmentRequests(currentAppointments);
              window.alert('This appointment is no longer awaiting review. The queue has been refreshed.');
              return false;
            }
            if (!appointmentAvailabilityDate || !appointmentAvailabilityTime) {
              setAppointmentDecisionError('Select an available date and time before sending your decision to staff.');
              return false;
            }
            const reviewedAt = new Date().toISOString();
            const reviewer = userRole === 'admin' ? 'Victoria Sterling' : 'Marcus Vance';
            const availabilityDateTime = `${appointmentAvailabilityDate} ${appointmentAvailabilityTime}${target.time_zone ? ` (${target.time_zone})` : ''}`;
            const comment = appointmentDecisionComment.trim();
            const updatedAppointments = currentAppointments.map((appointment) => (
              appointment.appointment_id === appointmentId
                ? {
                    ...appointment,
                    status: decision === 'Approve' ? 'Approved — Client Confirmation Needed' : 'Reschedule — Alternatives Needed',
                    appointment_date: availabilityDateTime,
                    attorney_availability_date: appointmentAvailabilityDate,
                    attorney_availability_time: appointmentAvailabilityTime,
                    attorney_alternatives: decision === 'Reschedule' ? availabilityDateTime : '',
                    attorney_comment: comment,
                    reviewed_by: reviewer,
                    reviewed_at: reviewedAt,
                    staff_notification_at: reviewedAt,
                    updated_at: reviewedAt
                  }
                : appointment
            ));
            try {
              window.localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(updatedAppointments));
              setAppointmentRequests(updatedAppointments);
              addNotification({
                audience: 'staff',
                type: 'appointment-decision',
                title: decision === 'Approve' ? 'Appointment approved' : 'Alternative appointment proposed',
                message: `${target.client}: ${availabilityDateTime}${comment ? ` — ${comment}` : ''}`,
                tab: 'appointments'
              });
              closeAppointmentReview();
              return true;
            } catch (error) {
              console.error('Unable to save the attorney appointment decision.', error);
              window.alert('Unable to save the appointment decision. Check browser storage and try again.');
              return false;
            }
          };

          const openAppointmentReview = (appointment) => {
            setSelectedAppointmentId(appointment.appointment_id);
            setAppointmentAvailabilityDate(appointment.requested_date || '');
            setAppointmentAvailabilityTime(appointment.requested_time || '');
            setAppointmentDecisionComment('');
            setAppointmentDecisionError('');
          };

          const closeAppointmentReview = () => {
            setSelectedAppointmentId(null);
            setAppointmentAvailabilityDate('');
            setAppointmentAvailabilityTime('');
            setAppointmentDecisionComment('');
            setAppointmentDecisionError('');
          };

          const handleDocumentReview = (documentId, status, comment = '') => {
            const submissions = readDocumentSubmissions();
            const documentIndex = submissions.findIndex((doc) => doc.document_id === documentId);
            if (documentIndex < 0) {
              setReviewDocuments(submissions);
              window.alert('This document is no longer available in browser storage. The review list has been refreshed.');
              return false;
            }

            const reviewComment = String(comment).trim();
            if (status === 'Declined' && !reviewComment) {
              setDeclineError('Add a comment explaining why the document is declined.');
              return false;
            }
            const updatedDocument = {
              ...submissions[documentIndex],
              review_status: status,
              review_comment: reviewComment,
              reviewed_by: userRole === 'admin' ? 'Victoria Sterling' : 'Marcus Vance',
              reviewed_at: new Date().toISOString()
            };
            const updatedSubmissions = submissions.map((doc, index) => index === documentIndex ? updatedDocument : doc);

            try {
              window.localStorage.setItem(DOCUMENT_REVIEW_KEY, JSON.stringify(updatedSubmissions));
              setReviewDocuments(updatedSubmissions);
              addNotification({
                audience: 'staff',
                type: 'document-review',
                title: `Document ${status.toLowerCase()}`,
                message: `${updatedDocument.document_name} — ${updatedDocument.case_title}${reviewComment ? `: ${reviewComment}` : ''}`,
                tab: 'documents'
              });
              setSelectedReviewDocumentId(null);
              setDeclineMode(false);
              setDeclineComment('');
              setDeclineError('');
              return true;
            } catch (error) {
              console.error('Unable to save the attorney document review.', error);
              window.alert('Unable to save the review. Please check browser storage and try again.');
              return false;
            }
          };

          const openDocumentReview = (doc) => {
            setSelectedReviewDocumentId(doc.document_id);
            setDeclineMode(false);
            setDeclineComment('');
            setDeclineError('');
          };

          const closeDocumentReview = () => {
            setSelectedReviewDocumentId(null);
            setDeclineMode(false);
            setDeclineComment('');
            setDeclineError('');
          };

          const handlePrintReviewedDocument = (doc) => {
            if (doc.review_status !== 'Approved' || !doc.file_data_url) return;
            const printWindow = window.open(doc.file_data_url, '_blank');
            if (!printWindow) {
              window.alert('Allow pop-ups for this site to print the confidential reviewed document.');
              return;
            }
            printWindow.addEventListener('load', () => {
              printWindow.focus();
              printWindow.print();
            }, { once: true });
          };

          // --- DASHBOARD VIEW ---
          return (
            <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950 via-[#030712] to-black text-slate-100 flex flex-col">
              
              {/* Header with navigation, branding, and search */}
              <header className="bg-slate-900/90 backdrop-blur-md border-b border-amber-500/20 px-6 py-4 flex flex-wrap items-center gap-4 shadow-lg sticky top-0 z-50">
                <div className="flex min-w-0 flex-row flex-wrap items-center gap-4">
                  <button
                    type="button"
                    aria-label="Open navigation menu"
                    aria-expanded={menuOpen}
                    aria-controls="admin-navigation-drawer"
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 transition hover:border-amber-500/50 hover:text-white">
                    <i data-lucide="menu" className="h-4 w-4 text-amber-400"></i>
                    
                  </button>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    aria-label="Refresh dashboard"
                    className="flex items-center space-x-3 text-left">
                    <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg text-slate-950 gold-glow-sm">
                      <i data-lucide="scale" className="w-6 h-6"></i>
                    </div>
                    <div>
                      <span className="font-bold text-lg tracking-wide text-white">Law Office Management System</span>
                      <span className="block text-xs text-amber-400 font-semibold tracking-wider">ADMIN & ATTORNEY DASHBOARD</span>
                    </div>
                  </button>
                </div>
                <div className="relative z-20 flex w-full min-w-0 items-center gap-3 md:ml-auto md:w-[min(38rem,48vw)]">
                  <div className="relative min-w-0 flex-1">
                  <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 shadow-lg transition focus-within:border-amber-500/60 focus-within:ring-1 focus-within:ring-amber-500/30">
                    <i data-lucide="search" className="h-5 w-5 shrink-0 text-amber-400"></i>
                    <input
                      ref={searchInputRef}
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search clients, cases, documents, case numbers, or dates..."
                      aria-label="Search clients, cases, court dates, documents, time entries, and users"
                      aria-controls="admin-search-results"
                      className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                    />
                    <span className="hidden shrink-0 rounded border border-slate-700 bg-[#262626] px-2 py-1 text-[11px] text-[#d4af37] sm:inline">Ctrl K</span>
                  </div>
                  {searchTokens.length > 0 && (
                    <div id="admin-search-results" className="absolute left-0 right-0 top-full mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-2 shadow-2xl">
                      {searchResults.length ? searchResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => { setUserRole(result.role); setActiveTab(result.tab); }}
                          className="flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-800"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-white">{result.title}</span>
                            <span className="block truncate text-xs text-slate-400">{result.details}</span>
                          </span>
                          <span className="shrink-0 text-[11px] text-amber-400">{result.type}</span>
                        </button>
                      )) : <p className="px-3 py-4 text-sm text-slate-400">No matching records found.</p>}
                    </div>
                  )}
                  </div>
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      aria-label={`Notifications${notifications.filter((notification) => notification.audience === 'attorney' && !notification.read).length ? `, ${notifications.filter((notification) => notification.audience === 'attorney' && !notification.read).length} unread` : ''}`}
                      aria-expanded={notificationsOpen}
                      aria-controls="admin-notifications-panel"
                      onClick={() => setNotificationsOpen((open) => !open)}
                      className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/80 text-amber-400 shadow-lg transition hover:border-amber-500/60 hover:bg-slate-900"
                    >
                      <i data-lucide="bell" className="h-5 w-5"></i>
                      {notifications.filter((notification) => notification.audience === 'attorney' && !notification.read).length > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-slate-900 bg-red-500 px-1 text-[10px] font-bold text-white">
                          {notifications.filter((notification) => notification.audience === 'attorney' && !notification.read).length}
                        </span>
                      )}
                    </button>
                    {notificationsOpen && (
                      <div id="admin-notifications-panel" className="absolute right-0 top-full mt-2 w-[min(22rem,90vw)] overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                          <h2 className="text-sm font-semibold text-white">Notifications</h2>
                          <button type="button" onClick={markAllNotificationsRead} className="text-xs font-medium text-amber-300 hover:text-amber-200">Mark all read</button>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {notifications.filter((notification) => notification.audience === 'attorney').length ? notifications.filter((notification) => notification.audience === 'attorney').map((notification) => (
                            <button key={notification.notification_id} type="button" onClick={() => openNotification(notification)} className={`block w-full border-b border-slate-800 px-4 py-3 text-left transition hover:bg-slate-800/70 ${notification.read ? 'opacity-70' : 'bg-amber-500/5'}`}>
                              <span className="flex items-start justify-between gap-3">
                                <span className="text-sm font-semibold text-white">{notification.title}</span>
                                {!notification.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400"></span>}
                              </span>
                              <span className="mt-1 block text-xs text-slate-300">{notification.message}</span>
                              <span className="mt-1 block text-[10px] text-slate-500">{new Date(notification.created_at).toLocaleString()}</span>
                            </button>
                          )) : <p className="px-4 py-6 text-center text-sm text-slate-400">No notifications yet.</p>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </header>

              <div className={`fixed inset-0 z-[60] transition ${menuOpen ? 'visible' : 'invisible pointer-events-none'}`}>
                <button
                  type="button"
                  aria-label="Close navigation menu"
                  onClick={(event) => { event.currentTarget.blur(); setMenuOpen(false); }}
                  className={`absolute inset-0 bg-black/60 transition-opacity ${menuOpen ? 'opacity-100' : 'opacity-0'}`}></button>
                <aside
                  id="admin-navigation-drawer"
                  aria-label="Admin navigation"
                  aria-hidden={!menuOpen}
                  className={`absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col border-r border-amber-500/20 bg-slate-950 shadow-2xl transition-transform duration-300 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                  <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                    <span className="text-sm font-semibold uppercase tracking-wider text-amber-400">Admin Menu</span>
                    <button type="button" aria-label="Close navigation menu" onClick={(event) => { event.currentTarget.blur(); setMenuOpen(false); }} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white">
                      <i data-lucide="x" className="h-5 w-5"></i>
                    </button>
                  </div>

                  <div className="border-b border-slate-800 px-5 py-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300">
                        <i data-lucide="user-round" className="h-6 w-6"></i>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{currentUser.name}</p>
                        <p className="text-xs text-amber-400">{currentUser.roleLabel}</p>
                        <p className="truncate text-xs text-slate-400">{currentUser.email}</p>
                      </div>
                    </div>
                  </div>

                  <nav className="flex-1 space-y-2 overflow-y-auto p-3">
                    <button
                      type="button"
                      onClick={(event) => { event.currentTarget.blur(); setUserRole('admin'); setActiveTab('users'); setMenuOpen(false); }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition ${activeTab === 'users' ? 'bg-amber-500/15 text-amber-300' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                      <i data-lucide="users-round" className="h-5 w-5"></i>
                      <span>Users (users)</span>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => { event.currentTarget.blur(); setUserRole('admin'); setActiveTab('transactions'); setMenuOpen(false); }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition ${activeTab === 'transactions' ? 'bg-amber-500/15 text-amber-300' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                      <i data-lucide="history" className="h-5 w-5"></i>
                      <span>Transaction History & Tracking</span>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => { event.currentTarget.blur(); setActiveTab('document-review'); setMenuOpen(false); }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition ${activeTab === 'document-review' ? 'bg-amber-500/15 text-amber-300' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                      <i data-lucide="file-check-2" className="h-5 w-5"></i>
                      <span>Review File</span>
                    </button>
                    {userRole === 'lawyer' && (
                      <>
                        <button
                          type="button"
                          onClick={(event) => { event.currentTarget.blur(); setActiveTab('account-settings'); setMenuOpen(false); }}
                          aria-current={activeTab === 'account-settings' ? 'page' : undefined}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition ${activeTab === 'account-settings' ? 'bg-amber-500/15 text-amber-300' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                          <i data-lucide="settings" className="h-5 w-5"></i>
                          <span>Account Settings</span>
                        </button>
                        <button
                          type="button"
                          onClick={(event) => { event.currentTarget.blur(); setActiveTab('customization'); setMenuOpen(false); }}
                          aria-current={activeTab === 'customization' ? 'page' : undefined}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition ${activeTab === 'customization' ? 'bg-amber-500/15 text-amber-300' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                          <i data-lucide="paintbrush" className="h-5 w-5"></i>
                          <span>Customization</span>
                        </button>
                      </>
                    )}
                  </nav>

                  <div className="border-t border-slate-800 p-3">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-red-300 transition hover:bg-red-500/10 hover:text-red-200">
                      <i data-lucide="log-out" className="h-5 w-5"></i>
                      Log Out
                    </button>
                  </div>
                </aside>
              </div>

              {/* Main Workspace Area */}
              <main className="max-w-7xl w-full mx-auto p-6 space-y-6 flex-grow">
                {/* Banner & Tab Navigator */}
                <div className="bg-gradient-to-r from-blue-900/40 via-slate-900/80 to-slate-900/90 border border-amber-500/30 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl backdrop-blur-md">
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-wide">
                      {userRole === 'admin' ? 'Administrator / Managing Partner Dashboard' : 'Lawyer / Attorney Workspace'}
                    </h2>
                    <p className="text-slate-300 text-sm mt-1">
                      {userRole === 'admin' 
                        ? 'Manage system settings, user roles, and firm-wide reporting.' 
                        : 'Manage assigned cases, upload legal documents, track court schedules, and log billable hours.'}
                    </p>
                  </div>

                  {userRole === 'lawyer' && (
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setActiveTab('cases')} className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${activeTab === 'cases' ? 'bg-amber-500 text-slate-950 gold-glow-sm' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>Cases</button>
                      <button onClick={() => setActiveTab('schedule')} className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${activeTab === 'schedule' ? 'bg-amber-500 text-slate-950 gold-glow-sm' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>Court Calendar</button>
                      <button onClick={() => setActiveTab('hours')} className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${activeTab === 'hours' ? 'bg-amber-500 text-slate-950 gold-glow-sm' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>Billable Hours</button>
                    </div>
                  )}
                </div>

                {/* --- ADMIN VIEWS --- */}
                {userRole === 'admin' && activeTab === 'overview' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-slate-900/80 border border-amber-500/20 p-5 rounded-2xl shadow-lg">
                        <p className="text-xs uppercase text-slate-400 font-semibold">Legal Cases</p>
                        <p className="text-3xl font-extrabold text-white mt-2 font-mono">{firmReporting.totalCases}</p>
                      </div>
                      <div className="bg-slate-900/80 border border-amber-500/20 p-5 rounded-2xl shadow-lg">
                        <p className="text-xs uppercase text-slate-400 font-semibold">Pending Appointments</p>
                        <p className="text-3xl font-extrabold text-white mt-2 font-mono">{firmReporting.pendingAppointments}</p>
                      </div>
                      <div className="bg-slate-900/80 border border-amber-500/20 p-5 rounded-2xl shadow-lg">
                        <p className="text-xs uppercase text-slate-400 font-semibold">Billable Hours (YTD)</p>
                        <p className="text-3xl font-extrabold text-white mt-2 font-mono">{firmReporting.totalBillableHoursYTD}</p>
                      </div>
                      <div className="bg-slate-900/80 border border-amber-500/20 p-5 rounded-2xl shadow-lg">
                        <p className="text-xs uppercase text-slate-400 font-semibold">Total Clients</p>
                        <p className="text-3xl font-extrabold text-amber-300 mt-2 font-mono">{firmReporting.totalClients}</p>
                      </div>
                    </div>

                    {window.ADMIN_APPOINTMENT_NOTICE && (
                      <p
                        role={window.ADMIN_APPOINTMENT_NOTICE.type === 'error' ? 'alert' : 'status'}
                        className={`rounded-xl border p-4 text-sm ${
                          window.ADMIN_APPOINTMENT_NOTICE.type === 'error'
                            ? 'border-red-500/30 bg-red-500/10 text-red-200'
                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                        }`}
                      >
                        {window.ADMIN_APPOINTMENT_NOTICE.message}
                      </p>
                    )}

                    <section className="overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-900/80 shadow-xl">
                      <div className="border-b border-slate-800 p-5">
                        <h3 className="font-bold text-white text-base">Pending Appointment Requests</h3>
                        <p className="mt-1 text-sm text-slate-400">Review the request, adjust the appointment time for attorney availability, then confirm it for the client.</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left text-sm text-slate-300">
                          <thead className="bg-slate-950/60 text-xs uppercase text-amber-400/80">
                            <tr>
                              <th className="p-4">Client</th>
                              <th className="p-4">Appointment</th>
                              <th className="p-4">Requested Time</th>
                              <th className="p-4">Attorney Time</th>
                              <th className="p-4">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {pendingAppointments.map((appointment) => (
                              <tr key={appointment.appointment_id} className="hover:bg-slate-800/40">
                                <td className="p-4 font-semibold text-white">{appointment.client_name || '—'}</td>
                                <td className="p-4">
                                  <span className="block font-semibold text-white">{appointment.title}</span>
                                  <span className="text-xs text-slate-400">{appointment.type || 'Consultation'}{appointment.case_number ? ` · Case ${appointment.case_number}` : ''}</span>
                                  {appointment.preferred_attorney && (
                                    <span className="mt-1 block text-xs text-slate-400">Preferred attorney: {appointment.preferred_attorney}</span>
                                  )}
                                  {appointment.issue_description && (
                                    <span className="mt-1 block max-w-xs whitespace-pre-wrap text-xs text-slate-400">{appointment.issue_description}</span>
                                  )}
                                </td>
                                <td className="p-4">{appointment.appointment_date}</td>
                                <td className="p-4">
                                  <form id={`confirm-appointment-${appointment.appointment_id}`} method="post" action="index.php" className="flex items-center gap-2">
                                    <input type="hidden" name="action" value="confirm_appointment" />
                                    <input type="hidden" name="_csrf" value={window.ADMIN_APPOINTMENT_CSRF_TOKEN} />
                                    <input type="hidden" name="appointment_id" value={appointment.appointment_id} />
                                    <input
                                      type="datetime-local"
                                      name="appointment_date"
                                      required
                                      min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                      defaultValue={appointment.appointment_date.replace(' ', 'T').slice(0, 16)}
                                      aria-label={`Attorney appointment time for ${appointment.client_name || appointment.title}`}
                                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                                    />
                                  </form>
                                </td>
                                <td className="p-4">
                                  <button
                                    type="submit"
                                    form={`confirm-appointment-${appointment.appointment_id}`}
                                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500 hover:text-slate-950"
                                  >
                                    <i data-lucide="check" className="h-4 w-4"></i>
                                    Confirm &amp; Done
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {pendingAppointments.length === 0 && (
                              <tr><td colSpan="5" className="p-6 text-center text-slate-400">No pending appointment requests.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-900/80 shadow-xl">
                      <div className="border-b border-slate-800 p-5">
                        <h3 className="font-bold text-white text-base">Legal Cases</h3>
                        <p className="mt-1 text-sm text-slate-400">Case records read from the database.</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left text-sm text-slate-300">
                          <thead className="bg-slate-950/60 text-xs uppercase text-amber-400/80">
                            <tr>
                              <th className="p-4">Case #</th>
                              <th className="p-4">Case Title</th>
                              <th className="p-4">Client</th>
                              <th className="p-4">Assigned Lawyer</th>
                              <th className="p-4">Status</th>
                              <th className="p-4">Filed Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {caseRecords.filter(matchesSearch).map((record) => (
                              <tr key={record.case_id} className="hover:bg-slate-800/40">
                                <td className="p-4 font-mono text-amber-300">{record.case_number}</td>
                                <td className="p-4 font-semibold text-white">{record.title}</td>
                                <td className="p-4">{record.client_name || '—'}</td>
                                <td className="p-4">{record.lawyer_name || 'Unassigned'}</td>
                                <td className="p-4">{record.status}</td>
                                <td className="p-4">{record.filed_date}</td>
                              </tr>
                            ))}
                            {caseRecords.filter(matchesSearch).length === 0 && (
                              <tr><td colSpan="6" className="p-6 text-center text-slate-400">{caseRecords.length === 0 ? 'No cases have been recorded.' : 'No cases match your search.'}</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-900/80 shadow-xl">
                      <div className="border-b border-slate-800 p-5">
                        <h3 className="font-bold text-white text-base">Registered Client Records</h3>
                        <p className="mt-1 text-sm text-slate-400">Client accounts and contact details from the database.</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-sm text-slate-300">
                          <thead className="bg-slate-950/60 text-xs uppercase text-amber-400/80">
                            <tr>
                              <th className="p-4">Client ID</th>
                              <th className="p-4">Name</th>
                              <th className="p-4">Email</th>
                              <th className="p-4">Phone</th>
                              <th className="p-4">Address</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {clientRecords.map((client) => (
                              <tr key={client.client_id} className="hover:bg-slate-800/40">
                                <td className="p-4 font-mono text-amber-300">#{client.client_id}</td>
                                <td className="p-4 font-semibold text-white">{client.fullname}</td>
                                <td className="p-4">{client.email || '—'}</td>
                                <td className="p-4">{client.phone || '—'}</td>
                                <td className="p-4">{client.address || '—'}</td>
                              </tr>
                            ))}
                            {clientRecords.length === 0 && (
                              <tr><td colSpan="5" className="p-6 text-center text-slate-400">No registered client records found.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </div>
                )}

                {userRole === 'admin' && activeTab === 'users' && (
                  <section className="bg-slate-900/80 border border-amber-500/20 rounded-2xl overflow-hidden shadow-xl animate-fade-in">
                    <div className="p-5 border-b border-slate-800">
                      <h3 className="font-bold text-white text-base">System Account Management</h3>
                    </div>
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-950/60 text-amber-400/80 uppercase text-xs">
                        <tr><th className="p-4">ID</th><th className="p-4">Username</th><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4">Created</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {usersList.filter(matchesSearch).map(u => (
                          <tr key={u.user_id} className="hover:bg-slate-800/40">
                            <td className="p-4 font-mono text-amber-300">#{u.user_id}</td>
                            <td className="p-4 font-semibold text-white">{u.username}</td>
                            <td className="p-4">{u.email}</td>
                            <td className="p-4"><span className="px-2.5 py-1 rounded-full text-xs bg-amber-500/10 text-amber-400">{u.role.charAt(0).toUpperCase() + u.role.slice(1)}</span></td>
                            <td className="p-4 text-slate-400">{u.created_at}</td>
                          </tr>
                        ))}
                        {usersList.filter(matchesSearch).length === 0 && (
                          <tr><td colSpan="5" className="p-6 text-center text-slate-400">No matching users.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </section>
                )}

                {userRole === 'admin' && activeTab === 'transactions' && (
                  <section className="bg-slate-900/80 border border-amber-500/20 rounded-2xl overflow-hidden shadow-xl animate-fade-in">
                    <div className="border-b border-slate-800 p-5">
                      <h3 className="font-bold text-white text-base">Transaction History & Tracking</h3>
                      <p className="mt-1 text-sm text-slate-400">Review activity, linked records, responsible staff, and transaction status.</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-left text-sm text-slate-300">
                        <thead className="bg-slate-950/60 text-amber-400/80 uppercase text-xs">
                          <tr><th className="p-4">Transaction ID</th><th className="p-4">Date & Time</th><th className="p-4">Activity</th><th className="p-4">Related Record</th><th className="p-4">Performed By</th><th className="p-4">Status</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {transactionHistory.filter(matchesSearch).map(transaction => (
                            <tr key={transaction.transaction_id} className="hover:bg-slate-800/40">
                              <td className="p-4 font-mono text-amber-300">{transaction.transaction_id}</td>
                              <td className="p-4 whitespace-nowrap text-slate-400">{transaction.date}</td>
                              <td className="p-4 font-semibold text-white">{transaction.activity}</td>
                              <td className="p-4">{transaction.record}</td>
                              <td className="p-4">{transaction.performed_by}</td>
                              <td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs ${transaction.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-300'}`}>{transaction.status}</span></td>
                            </tr>
                          ))}
                          {transactionHistory.filter(matchesSearch).length === 0 && (
                            <tr><td colSpan="6" className="p-6 text-center text-slate-400">No matching transactions.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {activeTab === 'document-review' && (
                  <section className="bg-slate-900/80 border border-amber-500/20 rounded-2xl overflow-hidden shadow-xl animate-fade-in">
                    <div className="border-b border-slate-800 p-5">
                      <div className="flex items-center gap-2">
                        <i data-lucide="file-check-2" className="h-5 w-5 text-amber-400"></i>
                        <h3 className="font-bold text-white text-base">Review File</h3>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">Open a submitted document to review its contents. Approve it or decline it with a comment.</p>
                      <p className="mt-2 text-xs text-amber-300">Demo limitation: files and reviews sync only in this browser. Browser storage is not secure storage for real confidential records.</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px] text-left text-sm text-slate-300">
                        <thead className="bg-slate-950/60 text-amber-400/80 uppercase text-xs">
                          <tr>
                            <th className="p-4">Document</th>
                            <th className="p-4">Case</th>
                            <th className="p-4">Submitted By</th>
                            <th className="p-4">Upload Date</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {reviewDocuments.filter((doc) => matchesSearch({
                            case_title: doc.case_title,
                            document_name: doc.document_name,
                            upload_date: doc.upload_date,
                            uploaded_by: doc.uploaded_by,
                            review_status: doc.review_status,
                            review_comment: doc.review_comment
                          })).map((doc) => (
                            <tr key={doc.document_id} className="hover:bg-slate-800/40">
                              <td className="p-4 font-semibold text-white">{doc.document_name}</td>
                              <td className="p-4 text-slate-300">{doc.case_title}</td>
                              <td className="p-4 text-slate-300">{doc.uploaded_by}</td>
                              <td className="whitespace-nowrap p-4 text-slate-400">{doc.upload_date}</td>
                              <td className="p-4">
                                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${
                                  doc.review_status === 'Approved'
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                    : doc.review_status === 'Declined' || doc.review_status === 'Rejected'
                                      ? 'border-red-500/30 bg-red-500/10 text-red-300'
                                      : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                                }`}>{doc.review_status === 'Rejected' ? 'Declined' : doc.review_status || 'Pending Review'}</span>
                                {doc.reviewed_by && <span className="mt-2 block text-xs text-slate-500">By {doc.reviewed_by}</span>}
                              </td>
                              <td className="p-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => openDocumentReview(doc)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500 hover:text-slate-950"
                                >
                                  <i data-lucide="file-search" className="h-3.5 w-3.5"></i> Review File
                                </button>
                              </td>
                            </tr>
                          ))}
                          {reviewDocuments.filter((doc) => matchesSearch({
                            case_title: doc.case_title,
                            document_name: doc.document_name,
                            upload_date: doc.upload_date,
                            uploaded_by: doc.uploaded_by,
                            review_status: doc.review_status,
                            review_comment: doc.review_comment
                          })).length === 0 && (
                            <tr><td colSpan="6" className="p-6 text-center text-slate-400">No documents have been submitted for review.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {selectedReviewDocumentId && (() => {
                  const doc = reviewDocuments.find((item) => item.document_id === selectedReviewDocumentId);
                  if (!doc) return null;
                  const isPending = !doc.review_status || doc.review_status === 'Pending Review';
                  const canPreview = doc.file_type === 'application/pdf' || doc.file_type?.startsWith('image/') || doc.file_type?.startsWith('text/');
                  return (
                    <div
                      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
                      onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closeDocumentReview();
                      }}
                    >
                      <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="review-file-title"
                        className="my-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-amber-500/30 bg-slate-900 shadow-2xl"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                          <div className="min-w-0">
                            <h2 id="review-file-title" className="truncate text-xl font-bold text-white">Review File</h2>
                            <p className="mt-1 truncate text-sm text-slate-400">{doc.document_name} · {doc.case_title}</p>
                          </div>
                          <button
                            type="button"
                            onClick={closeDocumentReview}
                            aria-label="Close file review"
                            className="ml-4 rounded-lg px-2 py-1 text-2xl leading-none text-slate-400 transition hover:bg-slate-800 hover:text-white"
                          >
                            &times;
                          </button>
                        </div>

                        <div className="space-y-4 p-6">
                          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
                            <span>Submitted by {doc.uploaded_by || 'Staff'} on {doc.upload_date}</span>
                            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${
                              doc.review_status === 'Approved'
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                : doc.review_status === 'Declined' || doc.review_status === 'Rejected'
                                  ? 'border-red-500/30 bg-red-500/10 text-red-300'
                                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                            }`}>{doc.review_status === 'Rejected' ? 'Declined' : doc.review_status || 'Pending Review'}</span>
                          </div>

                          {doc.file_data_url && canPreview ? (
                            <iframe
                              title={`Document preview: ${doc.document_name}`}
                              src={doc.file_data_url}
                              className="h-[60vh] w-full rounded-xl border border-slate-700 bg-white"
                            />
                          ) : doc.file_data_url ? (
                            <div className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/70 p-6 text-center">
                              <i data-lucide="file-text" className="h-10 w-10 text-amber-400"></i>
                              <p className="text-sm text-slate-300">Preview is unavailable for this file type. Open the original file to review it.</p>
                              <a
                                href={doc.file_data_url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-500 hover:text-slate-950"
                              >
                                Open Document
                              </a>
                            </div>
                          ) : (
                            <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/70 p-6 text-sm text-slate-400">
                              The original file is not available to preview.
                            </div>
                          )}

                          {doc.review_comment && !isPending && (
                            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">Attorney Comment</p>
                              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{doc.review_comment}</p>
                            </div>
                          )}

                          {isPending ? (
                            <div className="space-y-4 border-t border-slate-800 pt-4">
                              {!declineMode ? (
                                <div className="flex flex-wrap justify-end gap-3">
                                  <button
                                    type="button"
                                    onClick={() => handleDocumentReview(doc.document_id, 'Approved')}
                                    className="rounded-lg bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500 hover:text-slate-950"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setDeclineMode(true); setDeclineError(''); }}
                                    className="rounded-lg bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500 hover:text-slate-950"
                                  >
                                    Decline
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <label htmlFor="decline-comment" className="block text-sm font-medium text-slate-200">
                                    Comment explaining the decline <span className="text-amber-400">*</span>
                                  </label>
                                  <textarea
                                    id="decline-comment"
                                    value={declineComment}
                                    onChange={(event) => { setDeclineComment(event.target.value); setDeclineError(''); }}
                                    rows="3"
                                    required
                                    autoFocus
                                    placeholder="Explain what needs to be changed..."
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-500"
                                  />
                                  {declineError && <p role="alert" className="text-sm text-red-300">{declineError}</p>}
                                  <div className="flex flex-wrap justify-end gap-3">
                                    <button
                                      type="button"
                                      onClick={() => { setDeclineMode(false); setDeclineComment(''); setDeclineError(''); }}
                                      className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                                    >
                                      Back
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDocumentReview(doc.document_id, 'Declined', declineComment)}
                                      className="rounded-lg bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500 hover:text-slate-950"
                                    >
                                      Confirm Decline
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-800 pt-4">
                              {doc.review_status === 'Approved' && doc.file_data_url && (
                                <button
                                  type="button"
                                  onClick={() => handlePrintReviewedDocument(doc)}
                                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-500 hover:text-slate-950"
                                >
                                  <i data-lucide="printer" className="h-4 w-4"></i> Print Confidential File
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={closeDocumentReview}
                                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                              >
                                Close
                              </button>
                            </div>
                          )}
                        </div>
                      </section>
                    </div>
                  );
                })()}

                {/* --- LAWYER VIEWS --- */}
                {userRole === 'lawyer' && activeTab === 'cases' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-center">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl">
                        <div className="bg-slate-900/80 border border-amber-500/20 p-5 rounded-2xl shadow-lg">
                          <p className="text-xs uppercase text-slate-400 font-semibold">Legal Cases</p>
                          <p className="text-3xl font-extrabold text-white mt-2 font-mono">{firmReporting.totalCases}</p>
                        </div>
                        <div className="bg-slate-900/80 border border-amber-500/20 p-5 rounded-2xl shadow-lg">
                          <p className="text-xs uppercase text-slate-400 font-semibold">Pending Appointments</p>
                          <p className="text-3xl font-extrabold text-white mt-2 font-mono">{firmReporting.pendingAppointments}</p>
                        </div>
                        <div className="bg-slate-900/80 border border-amber-500/20 p-5 rounded-2xl shadow-lg">
                          <p className="text-xs uppercase text-slate-400 font-semibold">Billable Hours (YTD)</p>
                          <p className="text-3xl font-extrabold text-white mt-2 font-mono">{firmReporting.totalBillableHoursYTD}</p>
                        </div>
                        <div className="bg-slate-900/80 border border-amber-500/20 p-5 rounded-2xl shadow-lg">
                          <p className="text-xs uppercase text-slate-400 font-semibold">Total Clients</p>
                          <p className="text-3xl font-extrabold text-amber-300 mt-2 font-mono">{firmReporting.totalClients}</p>
                        </div>
                      </div>
                    </div>

                    <section className="bg-slate-900/80 border border-amber-500/20 rounded-2xl overflow-hidden shadow-xl animate-fade-in">
                      <div className="p-5 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="font-bold text-white text-base">Assigned Legal Cases</h3>
                        <button onClick={() => alert('Opening Document Upload Modal')} className="bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs gold-glow-sm">Upload Legal Document</button>
                      </div>
                      <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-950/60 text-amber-400/80 uppercase text-xs">
                          <tr><th className="p-4">Case #</th><th className="p-4">Title</th><th className="p-4">Status</th><th className="p-4">Filed Date</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {assignedCases.filter(matchesSearch).map(c => (
                            <tr key={c.case_id} className="hover:bg-slate-800/40">
                              <td className="p-4 font-mono text-amber-300">{c.case_number}</td>
                              <td className="p-4 font-semibold text-white">{c.title}</td>
                              <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-xs ${c.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : c.status === 'Pending' ? 'bg-amber-500/10 text-amber-300' : 'bg-slate-700/60 text-slate-300'}`}>{c.status}</span></td>
                              <td className="p-4 text-slate-400">{c.filed_date}</td>
                            </tr>
                          ))}
                          {assignedCases.filter(matchesSearch).length === 0 && (
                            <tr><td colSpan="4" className="p-6 text-center text-slate-400">{assignedCases.length === 0 ? 'No assigned legal cases found.' : 'No matching cases.'}</td></tr>
                          )}
                        </tbody>
                      </table>
                    </section>
                  </div>
                )}

                {userRole === 'lawyer' && activeTab === 'schedule' && (
                  <div className="space-y-6">
                    <section className="bg-slate-900/80 border border-amber-500/20 rounded-2xl overflow-hidden shadow-xl animate-fade-in">
                      <div className="border-b border-slate-800 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-white text-base">Staff Appointment Requests</h3>
                            <p className="mt-1 text-sm text-slate-400">Review appointments scheduled by staff, adjust the date or time, and confirm them to add them to the court calendar.</p>
                          </div>
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                            {pendingAppointments.length} pending
                          </span>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[1050px] text-left text-sm text-slate-300">
                          <thead className="bg-slate-950/60 text-xs uppercase text-amber-400/80">
                            <tr><th className="p-4">Client / Case</th><th className="p-4">Appointment</th><th className="p-4">Requested By</th><th className="p-4">Proposed Date &amp; Time</th><th className="p-4">Attorney Schedule</th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {pendingAppointments.filter(matchesSearch).map((appointment) => (
                              <tr key={appointment.appointment_id} className="align-top hover:bg-slate-800/40">
                                <td className="p-4">
                                  <span className="block font-semibold text-white">{appointment.client_name || 'No client'}</span>
                                  <span className="mt-1 block text-xs text-slate-400">{appointment.case_number || 'No case linked'}</span>
                                </td>
                                <td className="p-4">
                                  <span className="block font-semibold text-white">{appointment.title}</span>
                                  <span className="mt-1 block text-xs text-amber-300">{appointment.type}</span>
                                </td>
                                <td className="p-4">
                                  {appointment.requested_by}
                                </td>
                                <td className="p-4 whitespace-nowrap text-slate-300">
                                  {String(appointment.appointment_date).replace('T', ' ')}
                                </td>
                                <td className="p-4">
                                  <form method="post" action="index.php?tab=schedule" className="flex items-center gap-2">
                                    <input type="hidden" name="action" value="confirm_appointment" />
                                    <input type="hidden" name="appointment_id" value={appointment.appointment_id} />
                                    <input type="hidden" name="_csrf" value={window.ADMIN_APPOINTMENT_CSRF_TOKEN} />
                                    <label className="sr-only" htmlFor={`appointment-date-${appointment.appointment_id}`}>Set appointment date and time for {appointment.title}</label>
                                    <input
                                      id={`appointment-date-${appointment.appointment_id}`}
                                      name="appointment_date"
                                      type="datetime-local"
                                      required
                                      min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                      defaultValue={String(appointment.appointment_date).replace(' ', 'T').slice(0, 16)}
                                      className="min-w-[205px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                                    />
                                    <button type="submit" className="whitespace-nowrap rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400">Confirm Appointment</button>
                                  </form>
                                </td>
                              </tr>
                            ))}
                            {pendingAppointments.filter(matchesSearch).length === 0 && <tr><td colSpan="5" className="p-6 text-center text-slate-400">{pendingAppointments.length === 0 ? 'No staff appointment requests are pending.' : 'No pending appointments match your search.'}</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    <section className="bg-slate-900/80 border border-amber-500/20 rounded-2xl overflow-hidden shadow-xl animate-fade-in">
                      <div className="border-b border-slate-800 p-5">
                        <h3 className="font-bold text-white text-base">Confirmed Court Calendar</h3>
                        <p className="mt-1 text-sm text-slate-400">Appointments confirmed by an attorney from staff requests.</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px] text-left text-sm text-slate-300">
                          <thead className="bg-slate-950/60 text-amber-400/80 uppercase text-xs">
                            <tr><th className="p-4">Appointment</th><th className="p-4">Case / Client</th><th className="p-4">Date &amp; Time</th><th className="p-4">Type</th><th className="p-4">Status</th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {masterCalendarAppointments.filter(matchesSearch).map((appointment) => (
                              <tr key={appointment.id} className="hover:bg-slate-800/40">
                                <td className="p-4 font-semibold text-white">{appointment.title}</td>
                                <td className="p-4">{appointment.case_title}</td>
                                <td className="p-4 whitespace-nowrap text-slate-300">{String(appointment.appointment_date).replace('T', ' ')}</td>
                                <td className="p-4 text-amber-400">{appointment.type}</td>
                                <td className="p-4"><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400">Confirmed</span></td>
                              </tr>
                            ))}
                            {masterCalendarAppointments.filter(matchesSearch).length === 0 && <tr><td colSpan="5" className="p-6 text-center text-slate-400">{masterCalendarAppointments.length === 0 ? 'No confirmed appointments are on the calendar.' : 'No confirmed appointments match your search.'}</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    {selectedAppointmentId && (() => {
                      const appointment = appointmentRequests.find((item) => item.appointment_id === selectedAppointmentId);
                      if (!appointment) return null;
                      return (
                        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) closeAppointmentReview(); }}>
                          <section role="dialog" aria-modal="true" aria-labelledby="appointment-review-title" className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-amber-500/30 bg-slate-900 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                              <div>
                                <h2 id="appointment-review-title" className="text-xl font-bold text-white">Pending Appointment</h2>
                                <p className="mt-1 text-sm text-slate-400">{appointment.client} · {appointment.title}</p>
                              </div>
                              <button type="button" onClick={closeAppointmentReview} aria-label="Close appointment review" className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-400 transition hover:bg-slate-800 hover:text-white">&times;</button>
                            </div>
                            <div className="space-y-5 px-6 py-5">
                              <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-sm">
                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">Staff proposed</p>
                                <p className="mt-2 text-white">{appointment.appointment_date}</p>
                                <p className="mt-1 text-slate-400">{appointment.type} · {appointment.duration || 'Duration not specified'}</p>
                                {appointment.case_title && <p className="mt-1 text-slate-400">Matter: {appointment.case_title}</p>}
                                {appointment.notes && <p className="mt-2 whitespace-pre-wrap text-slate-300">{appointment.notes}</p>}
                              </div>
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                  <label htmlFor="attorney-availability-date" className="mb-1 block text-sm font-medium text-slate-200">Available date <span className="text-amber-400">*</span></label>
                                  <input id="attorney-availability-date" type="date" required value={appointmentAvailabilityDate} onChange={(event) => { setAppointmentAvailabilityDate(event.target.value); setAppointmentDecisionError(''); }} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500" />
                                </div>
                                <div>
                                  <label htmlFor="attorney-availability-time" className="mb-1 block text-sm font-medium text-slate-200">Available time <span className="text-amber-400">*</span></label>
                                  <input id="attorney-availability-time" type="time" required value={appointmentAvailabilityTime} onChange={(event) => { setAppointmentAvailabilityTime(event.target.value); setAppointmentDecisionError(''); }} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500" />
                                </div>
                              </div>
                              <div>
                                <label htmlFor="attorney-appointment-comment" className="mb-1 block text-sm font-medium text-slate-200">Comment for staff</label>
                                <textarea id="attorney-appointment-comment" rows="3" value={appointmentDecisionComment} onChange={(event) => { setAppointmentDecisionComment(event.target.value); setAppointmentDecisionError(''); }} placeholder="Add instructions, constraints, or context for the staff assistant." className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-500"></textarea>
                              </div>
                              {appointmentDecisionError && <p role="alert" className="text-sm text-red-300">{appointmentDecisionError}</p>}
                              <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:justify-end">
                                <button type="button" onClick={() => saveAppointmentDecision(appointment.appointment_id, 'Reschedule')} className="rounded-lg bg-orange-500/10 px-4 py-2.5 text-sm font-semibold text-orange-300 transition hover:bg-orange-500 hover:text-slate-950">Return Alternative to Staff</button>
                                <button type="button" onClick={() => saveAppointmentDecision(appointment.appointment_id, 'Approve')} className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400">Send to Staff</button>
                              </div>
                            </div>
                          </section>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {userRole === 'lawyer' && activeTab === 'hours' && (
                  <section className="bg-slate-900/80 border border-amber-500/20 rounded-2xl overflow-hidden shadow-xl animate-fade-in">
                    <div className="p-5 border-b border-slate-800 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-white text-base">Billable Hours Log (time_entries)</h3>
                        <p className="mt-1 text-sm text-slate-400">{timeEntries.length} database entr{timeEntries.length === 1 ? 'y' : 'ies'} · {firmReporting.totalBillableHoursYTD} this year</p>
                      </div>
                      <button type="button" onClick={() => setTimeEntryModalOpen(true)} className="bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs gold-glow-sm">Log Billable Hours</button>
                    </div>
                    {window.ADMIN_TIME_ENTRY_NOTICE && (
                      <p role={window.ADMIN_TIME_ENTRY_NOTICE.type === 'error' ? 'alert' : 'status'} className={`mx-5 mt-5 rounded-xl border p-4 text-sm ${window.ADMIN_TIME_ENTRY_NOTICE.type === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}`}>
                        {window.ADMIN_TIME_ENTRY_NOTICE.message}
                      </p>
                    )}
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[800px] text-left text-sm text-slate-300">
                        <thead className="bg-slate-950/60 text-amber-400/80 uppercase text-xs">
                          <tr><th className="p-4">Case</th><th className="p-4">Hours</th><th className="p-4">Notes</th><th className="p-4">Date</th><th className="p-4">Logged By</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {timeEntries.filter(matchesSearch).map(t => (
                            <tr key={t.time_entry_id} className="hover:bg-slate-800/40">
                              <td className="p-4">
                                <span className="block font-semibold text-white">{t.case_title}</span>
                                <span className="mt-1 block font-mono text-xs text-amber-300">{t.case_number}</span>
                              </td>
                              <td className="p-4 font-mono font-bold text-amber-300">{Number(t.hours).toFixed(2)} hrs</td>
                              <td className="p-4 text-xs text-slate-300">{t.description || '—'}</td>
                              <td className="p-4 text-slate-400">{t.date_logged}</td>
                              <td className="p-4 text-slate-400">{t.logged_by || 'Unknown'}</td>
                            </tr>
                          ))}
                          {timeEntries.filter(matchesSearch).length === 0 && (
                            <tr><td colSpan="5" className="p-6 text-center text-slate-400">{timeEntries.length === 0 ? 'No billable hours have been logged in the database.' : 'No time entries match your search.'}</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {userRole === 'lawyer' && activeTab === 'account-settings' && (
                  <section className="overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-900/80 shadow-xl animate-fade-in">
                    <div className="border-b border-slate-800 p-6">
                      <div className="flex items-center gap-3">
                        <i data-lucide="settings" className="h-5 w-5 text-amber-400"></i>
                        <div>
                          <h3 className="text-xl font-semibold text-white">Account Settings</h3>
                          <p className="mt-1 text-sm text-slate-400">Your account information. Contact an administrator to request changes.</p>
                        </div>
                      </div>
                    </div>
                    <dl className="grid gap-4 p-6 sm:grid-cols-2">
                      {[
                        ['Username', currentUser.name],
                        ['Role', currentUser.roleLabel],
                        ['Email', currentUser.email],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
                          <dd className="mt-2 break-words text-sm font-medium text-white">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )}

                {userRole === 'lawyer' && activeTab === 'customization' && (
                  <section className="overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-900/80 shadow-xl animate-fade-in">
                    <div className="border-b border-slate-800 p-6">
                      <div className="flex items-center gap-3">
                        <i data-lucide="paintbrush" className="h-5 w-5 text-amber-400"></i>
                        <div>
                          <h3 className="text-xl font-semibold text-white">Customization</h3>
                          <p className="mt-1 text-sm text-slate-400">Choose a dark-mode accent palette. Your selection is saved in this browser.</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-4 p-6 md:grid-cols-3" aria-label="Accent color palette">
                      {ADMIN_THEMES.map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          aria-pressed={adminTheme === theme.id}
                          onClick={() => selectAdminTheme(theme.id)}
                          className={`rounded-xl border border-slate-700 bg-slate-950/50 p-4 text-left transition hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 ${adminTheme === theme.id ? 'admin-theme-selected' : ''}`}>
                          <span className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-3">
                              <span className="h-8 w-8 rounded-full border border-white/20" style={{ backgroundColor: theme.color }}></span>
                              <span>
                                <span className="block text-sm font-semibold text-white">{theme.name}</span>
                                <span className="mt-1 block text-xs text-slate-400">{theme.description}</span>
                              </span>
                            </span>
                            {adminTheme === theme.id && <i data-lucide="check" className="h-4 w-4 shrink-0 text-amber-300"></i>}
                          </span>
                        </button>
                      ))}
                    </div>
                    {themeStorageError && (
                      <p className="px-6 pb-6 text-sm text-amber-200" role="status">
                        The palette is active for this visit, but your browser couldn’t save it for your next visit.
                      </p>
                    )}
                  </section>
                )}

              </main>

              {timeEntryModalOpen && (
                <div
                  className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) {
                      setTimeEntryModalOpen(false);
                    }
                  }}
                >
                  <section role="dialog" aria-modal="true" aria-labelledby="time-entry-title" className="my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-amber-500/30 bg-slate-900 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                      <div>
                        <h2 id="time-entry-title" className="text-xl font-bold text-white">Log Billable Hours</h2>
                        <p className="mt-1 text-sm text-slate-400">Record time worked on a matter.</p>
                      </div>
                      <button type="button" onClick={() => setTimeEntryModalOpen(false)} aria-label="Close billable hours form" className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-400 transition hover:bg-slate-800 hover:text-white">&times;</button>
                    </div>
                    <form method="post" action="index.php?tab=hours" className="space-y-4 px-6 py-5">
                      <input type="hidden" name="action" value="create_time_entry" />
                      <input type="hidden" name="_csrf" value={window.ADMIN_TIME_ENTRY_CSRF_TOKEN} />
                      <div>
                        <label htmlFor="time-entry-case" className="mb-1 block text-sm font-medium text-slate-200">Case / Matter <span className="text-amber-400">*</span></label>
                        <select id="time-entry-case" name="case_id" required defaultValue="" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500">
                          <option value="" disabled>Select a case</option>
                          {caseRecords.map((legalCase) => (
                            <option key={legalCase.case_id} value={legalCase.case_id}>{legalCase.case_number} — {legalCase.title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="time-entry-hours" className="mb-1 block text-sm font-medium text-slate-200">Hours worked <span className="text-amber-400">*</span></label>
                          <input id="time-entry-hours" name="hours" type="number" required min="0.01" max="24" step="0.01" placeholder="e.g. 1.5" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500" />
                        </div>
                        <div>
                          <label htmlFor="time-entry-date" className="mb-1 block text-sm font-medium text-slate-200">Date worked <span className="text-amber-400">*</span></label>
                          <input id="time-entry-date" name="date_logged" type="date" required defaultValue={getLocalDateString()} max={getLocalDateString()} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500" />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="time-entry-description" className="mb-1 block text-sm font-medium text-slate-200">Work description <span className="text-amber-400">*</span></label>
                        <textarea id="time-entry-description" name="description" required rows="4" maxLength="1000" placeholder="Describe the legal work performed." className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-500"></textarea>
                      </div>
                      <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                        <button type="button" onClick={() => setTimeEntryModalOpen(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800">Cancel</button>
                        <button type="submit" className="rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:from-amber-500 hover:to-amber-400">Save Time Entry</button>
                      </div>
                    </form>
                  </section>
                </div>
              )}
            </div>
          );
        }

        ReactDOM.createRoot(document.getElementById('root')).render(<AdminLawyerDashboard />);