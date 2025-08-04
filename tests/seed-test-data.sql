-- Seed test data for [RE]Print Studios E2E tests

-- Create a test client user if not exists
INSERT INTO users (id, email, password, role, active)
VALUES (
  'c468a7f8-f5e5-4db5-b7e7-ae7cab3139e5',
  'client@example.com',
  '$2a$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WrxJx/FeC9.gOMxlJla2', -- password: test123
  'client',
  true
) ON CONFLICT (id) DO NOTHING;

-- Create test projects
INSERT INTO projects (id, client_id, name, description, status, priority, start_date, due_date)
VALUES 
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'c468a7f8-f5e5-4db5-b7e7-ae7cab3139e5',
    'Brand Identity Redesign',
    'Complete brand identity overhaul including logo, color palette, and guidelines',
    'active',
    'high',
    CURRENT_DATE - INTERVAL '7 days',
    CURRENT_DATE + INTERVAL '30 days'
  ),
  (
    'b2c3d4e5-f6a7-8901-bcde-f23456789012',
    'c468a7f8-f5e5-4db5-b7e7-ae7cab3139e5',
    'Website Mockup Design',
    'Design mockups for new company website',
    'planning',
    'medium',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '14 days'
  );

-- Create project phases for the active project
INSERT INTO project_phases (project_id, phase_number, phase_name, status, started_at, completed_at)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 1, 'Onboarding', 'completed', CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '6 days'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2, 'Ideation', 'completed', CURRENT_TIMESTAMP - INTERVAL '6 days', CURRENT_TIMESTAMP - INTERVAL '4 days'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 3, 'Design', 'active', CURRENT_TIMESTAMP - INTERVAL '4 days', NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 4, 'Review & Feedback', 'pending', NULL, NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 5, 'Production/Print', 'pending', NULL, NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 6, 'Payment', 'pending', NULL, NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 7, 'Sign-off & Docs', 'pending', NULL, NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 8, 'Delivery', 'pending', NULL, NULL);

-- Create some test files
INSERT INTO files (
  id, 
  project_id, 
  uploader_id, 
  original_name, 
  stored_name, 
  file_path, 
  file_size, 
  mime_type, 
  file_type
)
VALUES
  (
    'd1e2f3a4-b5c6-7890-abcd-ef1234567890',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'c468a7f8-f5e5-4db5-b7e7-ae7cab3139e5',
    'logo-concept-v1.png',
    '1234567890_logo-concept-v1.png',
    '/uploads/projects/a1b2c3d4-e5f6-7890-abcd-ef1234567890/',
    524288,
    'image/png',
    'design'
  ),
  (
    'e2f3a4b5-c6d7-8901-bcde-f23456789012',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'c468a7f8-f5e5-4db5-b7e7-ae7cab3139e5',
    'brand-guidelines.pdf',
    '1234567891_brand-guidelines.pdf',
    '/uploads/projects/a1b2c3d4-e5f6-7890-abcd-ef1234567890/',
    2097152,
    'application/pdf',
    'document'
  );

-- Add some messages
INSERT INTO messages (
  project_id,
  sender_id,
  content,
  is_read
)
VALUES
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'c468a7f8-f5e5-4db5-b7e7-ae7cab3139e5',
    'I have uploaded the initial logo concepts. Please review when you have a chance.',
    true
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'e8d77070-598a-4597-8658-9a2ddb05e7e1',
    'Great work! I love the direction of concept #2. Can we explore more variations?',
    false
  );

-- Create test invoice
INSERT INTO invoices (
  project_id,
  invoice_number,
  amount,
  currency,
  status,
  due_date
)
VALUES
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'INV-2024-001',
    2500.00,
    'USD',
    'pending',
    CURRENT_DATE + INTERVAL '30 days'
  );

-- Output summary
SELECT 'Test data seeded successfully!' as message;
SELECT 'Users:' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Projects:', COUNT(*) FROM projects
UNION ALL
SELECT 'Project Phases:', COUNT(*) FROM project_phases
UNION ALL
SELECT 'Files:', COUNT(*) FROM files
UNION ALL
SELECT 'Messages:', COUNT(*) FROM messages
UNION ALL
SELECT 'Invoices:', COUNT(*) FROM invoices;