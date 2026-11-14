IF COL_LENGTH('dbo.document_templates', 'preview_file_name') IS NULL
    ALTER TABLE dbo.document_templates ADD preview_file_name NVARCHAR(255) NULL;

IF COL_LENGTH('dbo.document_templates', 'preview_stored_file_name') IS NULL
    ALTER TABLE dbo.document_templates ADD preview_stored_file_name NVARCHAR(100) NULL;
