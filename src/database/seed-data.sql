INSERT INTO developers (developer_id, name, email, company_name, api_key, is_active, created_at, updated_at)
VALUES 
('dev123', 'John Developer', 'john@example.com', 'TechCorp Inc', 'dev_api_key_123456', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Test query to verify developer exists
SELECT * FROM developers WHERE developer_id = 'dev123';