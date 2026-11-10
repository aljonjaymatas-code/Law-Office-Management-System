IF COL_LENGTH('dbo.appointments', 'preferred_attorney') IS NULL
    ALTER TABLE dbo.appointments ADD preferred_attorney NVARCHAR(150) NULL;

IF COL_LENGTH('dbo.appointments', 'issue_description') IS NULL
    ALTER TABLE dbo.appointments ADD issue_description NVARCHAR(MAX) NULL;

IF COL_LENGTH('dbo.cases', 'assigned_lawyer_name') IS NULL
    ALTER TABLE dbo.cases ADD assigned_lawyer_name NVARCHAR(150) NULL;
