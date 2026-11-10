IF COL_LENGTH('dbo.users', 'phone') IS NULL
    ALTER TABLE dbo.users ADD phone VARCHAR(11) NULL;

IF COL_LENGTH('dbo.users', 'address') IS NULL
    ALTER TABLE dbo.users ADD address VARCHAR(50) NULL;

UPDATE u
SET phone = c.phone
FROM dbo.users u
INNER JOIN dbo.clients c ON c.user_id = u.user_id
WHERE (u.phone IS NULL OR u.phone = '')
  AND c.phone IS NOT NULL
  AND LEN(c.phone) <= 11
  AND c.phone NOT LIKE '%[^0-9]%';

UPDATE u
SET address = c.address
FROM dbo.users u
INNER JOIN dbo.clients c ON c.user_id = u.user_id
WHERE (u.address IS NULL OR u.address = '')
  AND c.address IS NOT NULL
  AND LEN(c.address) <= 50;
