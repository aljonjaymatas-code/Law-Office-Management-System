IF OBJECT_ID('dbo.document_templates', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.document_templates (
        template_id INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_document_templates PRIMARY KEY,
        title NVARCHAR(150) NOT NULL,
        category NVARCHAR(100) NOT NULL,
        description NVARCHAR(1000) NULL,
        original_file_name NVARCHAR(255) NOT NULL,
        stored_file_name NVARCHAR(100) NOT NULL,
        uploaded_by INT NULL,
        created_at DATETIME2(0) NOT NULL
            CONSTRAINT DF_document_templates_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2(0) NOT NULL
            CONSTRAINT DF_document_templates_updated_at DEFAULT SYSUTCDATETIME()
    );

    CREATE INDEX IX_document_templates_category_updated_at
        ON dbo.document_templates (category, updated_at DESC);
END;
