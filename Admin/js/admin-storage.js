window.AdminPortalStorage = (() => {
  const DOCUMENT_REVIEW_KEY = 'law-office-document-review';
  const APPOINTMENTS_KEY = 'law-office-appointment-workflow';
  const NOTIFICATIONS_KEY = 'law-office-notifications';
  const TIME_ENTRIES_KEY = 'law-office-time-entries';

  function readNotifications() {
    const savedNotifications = window.localStorage.getItem(NOTIFICATIONS_KEY);
    if (!savedNotifications) return [];
    try {
      const notifications = JSON.parse(savedNotifications);
      return Array.isArray(notifications) ? notifications : [];
    } catch (error) {
      console.error('Unable to read portal notifications from browser storage.', error);
      return [];
    }
  }

  function readAppointmentRecords() {
    const savedAppointments = window.localStorage.getItem(APPOINTMENTS_KEY);
    if (!savedAppointments) {
      return [
        { appointment_id: 'seed-1', title: 'Case Consultation', client: 'Jane Doe', appointment_date: '2026-04-10 10:00 AM', type: 'Consultation', status: 'Confirmed — Master Calendar Updated' },
        { appointment_id: 'seed-2', title: 'Court Hearing Prep', client: 'Acme Corporation', appointment_date: '2026-04-12 02:00 PM', type: 'Hearing', status: 'Confirmed — Master Calendar Updated' }
      ];
    }
    try {
      const appointments = JSON.parse(savedAppointments);
      return Array.isArray(appointments) ? appointments : [];
    } catch (error) {
      console.error('Unable to read appointment workflow records from browser storage.', error);
      return [];
    }
  }

  function readDocumentSubmissions() {
    const savedDocuments = window.localStorage.getItem(DOCUMENT_REVIEW_KEY);
    if (!savedDocuments) return [];
    try {
      const documents = JSON.parse(savedDocuments);
      return Array.isArray(documents) ? documents : [];
    } catch (error) {
      console.error('Unable to read document submissions from browser storage.', error);
      return [];
    }
  }

  function getLocalDateString(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function readTimeEntries() {
    try {
      const savedEntries = window.localStorage.getItem(TIME_ENTRIES_KEY);
      if (!savedEntries) {
        return [
          { time_entry_id: 1, case_title: 'Doe vs. Enterprise', hours: 3.5, description: 'Drafting initial complaint and reviewing discovery files.', date_logged: '2026-04-10' },
          { time_entry_id: 2, case_title: 'Acme Breach of Contract', hours: 2.0, description: 'Client consultation and contract clause analysis.', date_logged: '2026-04-11' }
        ];
      }
      const entries = JSON.parse(savedEntries);
      return Array.isArray(entries) ? entries : [];
    } catch (error) {
      console.error('Unable to read billable time entries from browser storage.', error);
      return [];
    }
  }
  return { DOCUMENT_REVIEW_KEY, APPOINTMENTS_KEY, NOTIFICATIONS_KEY, TIME_ENTRIES_KEY, readNotifications, readAppointmentRecords, readDocumentSubmissions, getLocalDateString, readTimeEntries };
})();
