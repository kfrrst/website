-- Test data for dashboards
-- Using existing client user ID: 8fa035c9-83a3-4ac2-a55b-a148d92a3f7e

-- Clear existing test data
DELETE FROM projects WHERE name LIKE 'Dashboard Test%';

-- Create test projects
INSERT INTO projects (name, client_id, status, description, budget_amount, progress_percentage, due_date)
VALUES 
  ('Dashboard Test Project 1', '8fa035c9-83a3-4ac2-a55b-a148d92a3f7e', 'in_progress', 'Test project for dashboard', 5000, 25, CURRENT_DATE + INTERVAL '30 days'),
  ('Dashboard Test Project 2', '8fa035c9-83a3-4ac2-a55b-a148d92a3f7e', 'in_progress', 'Another test project', 6000, 50, CURRENT_DATE + INTERVAL '45 days'),
  ('Dashboard Test Project 3', '8fa035c9-83a3-4ac2-a55b-a148d92a3f7e', 'planning', 'Planning phase project', 7000, 10, CURRENT_DATE + INTERVAL '60 days'),
  ('Dashboard Test Project 4', '8fa035c9-83a3-4ac2-a55b-a148d92a3f7e', 'completed', 'Completed project', 8000, 100, CURRENT_DATE - INTERVAL '10 days');

-- Add phase tracking for projects
INSERT INTO project_phase_tracking (project_id, phase_number, phase_name, status, started_at)
SELECT 
  p.id,
  CASE 
    WHEN p.status = 'in_progress' THEN 3
    WHEN p.status = 'planning' THEN 1
    WHEN p.status = 'completed' THEN 8
    ELSE 1
  END,
  CASE 
    WHEN p.status = 'in_progress' THEN 'Design'
    WHEN p.status = 'planning' THEN 'Onboarding'
    WHEN p.status = 'completed' THEN 'Delivery'
    ELSE 'Onboarding'
  END,
  CASE 
    WHEN p.status = 'completed' THEN 'completed'
    ELSE 'in_progress'
  END,
  NOW() - INTERVAL '5 days'
FROM projects p
WHERE p.name LIKE 'Dashboard Test%'
ON CONFLICT (project_id) DO UPDATE SET
  phase_number = EXCLUDED.phase_number,
  phase_name = EXCLUDED.phase_name,
  status = EXCLUDED.status;

-- Add some activity log entries
INSERT INTO activity_log (project_id, user_id, action, description, entity_type, entity_id)
SELECT 
  p.id,
  p.client_id,
  'project_updated',
  'Project ' || p.name || ' was updated',
  'project',
  p.id
FROM projects p
WHERE p.name LIKE 'Dashboard Test%';

-- Add test invoices
INSERT INTO invoices (invoice_number, project_id, client_id, total_amount, status, due_date)
SELECT 
  'INV-TEST-' || ROW_NUMBER() OVER(),
  p.id,
  p.client_id,
  2500 + (ROW_NUMBER() OVER() * 500),
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 'pending'
    WHEN ROW_NUMBER() OVER() = 2 THEN 'pending'
    ELSE 'paid'
  END,
  CURRENT_DATE + INTERVAL '15 days'
FROM projects p
WHERE p.name LIKE 'Dashboard Test%'
LIMIT 3;

-- Add test files
INSERT INTO files (project_id, file_name, file_size, mime_type, uploaded_by, is_active)
SELECT 
  p.id,
  p.name || '_document.pdf',
  102400,
  'application/pdf',
  p.client_id,
  true
FROM projects p
WHERE p.name LIKE 'Dashboard Test%';

-- Show summary
SELECT 
  COUNT(*) as total_projects,
  COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_projects,
  COUNT(CASE WHEN status = 'planning' THEN 1 END) as planning_projects,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_projects
FROM projects 
WHERE client_id = '8fa035c9-83a3-4ac2-a55b-a148d92a3f7e';

SELECT 
  COUNT(*) as pending_invoices,
  SUM(total_amount) as total_due
FROM invoices 
WHERE client_id = '8fa035c9-83a3-4ac2-a55b-a148d92a3f7e' 
AND status = 'pending';