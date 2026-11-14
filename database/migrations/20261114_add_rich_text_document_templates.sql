IF COL_LENGTH('dbo.document_templates', 'content_delta') IS NULL
    ALTER TABLE dbo.document_templates ADD content_delta NVARCHAR(MAX) NULL;

ALTER TABLE dbo.document_templates
    ALTER COLUMN original_file_name NVARCHAR(255) NULL;

ALTER TABLE dbo.document_templates
    ALTER COLUMN stored_file_name NVARCHAR(100) NULL;
