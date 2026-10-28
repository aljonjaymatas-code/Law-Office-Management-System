ALTER TABLE appointments
    ADD COLUMN preferred_attorney VARCHAR(150) NULL AFTER status,
    ADD COLUMN issue_description TEXT NULL AFTER preferred_attorney;
