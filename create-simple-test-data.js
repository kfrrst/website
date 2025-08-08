import { query } from './config/database.js';

async function createTestData() {
  try {
    console.log('Creating simple test data for dashboards...');
    
    // Use the existing client ID from the database
    const clientId = '8fa035c9-83a3-4ac2-a55b-a148d92a3f7e';
    console.log('Using existing client ID:', clientId);
    
    // Clear existing test projects for this client
    await query(`
      DELETE FROM projects 
      WHERE client_id = $1 
      AND name LIKE 'Test %'
    `, [clientId]);
    
    // Create test projects
    const projectNames = [
      'Test Brand Identity',
      'Test Marketing Campaign',
      'Test Product Launch',
      'Test Annual Report'
    ];
    
    for (let i = 0; i < projectNames.length; i++) {
      const status = i < 2 ? 'in_progress' : 'planning';
      
      const projectResult = await query(`
        INSERT INTO projects (
          name, 
          client_id, 
          status, 
          is_active, 
          description,
          budget_amount,
          progress_percentage,
          due_date
        )
        VALUES ($1, $2, $3, true, $4, $5, $6, $7)
        RETURNING id
      `, [
        projectNames[i],
        clientId,
        status,
        `This is a test project for ${projectNames[i]}`,
        5000 + (i * 1000),
        25 * (i + 1),
        new Date(Date.now() + (30 + i * 15) * 24 * 60 * 60 * 1000)
      ]);
      
      const projectId = projectResult.rows[0].id;
      console.log(`Project created: ${projectNames[i]} (${projectId})`);
      
      // Create phase tracking
      const phaseNumber = Math.min(i + 1, 8);
      const phaseNames = [
        'Onboarding', 'Ideation', 'Design', 'Review & Feedback',
        'Production/Print', 'Payment', 'Sign-off & Docs', 'Delivery'
      ];
      
      await query(`
        INSERT INTO project_phase_tracking (
          project_id,
          phase_number,
          phase_name,
          status,
          started_at
        )
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (project_id) DO UPDATE SET
          phase_number = EXCLUDED.phase_number,
          phase_name = EXCLUDED.phase_name,
          status = EXCLUDED.status
      `, [
        projectId,
        phaseNumber,
        phaseNames[phaseNumber - 1],
        'in_progress'
      ]);
      
      // Create activity log
      await query(`
        INSERT INTO activity_log (
          project_id,
          user_id,
          action,
          description,
          entity_type,
          entity_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        projectId,
        clientId,
        'project_created',
        `Project "${projectNames[i]}" created`,
        'project',
        projectId
      ]);
      
      // Create test files
      await query(`
        INSERT INTO files (
          project_id,
          file_name,
          file_size,
          mime_type,
          uploaded_by,
          is_active
        )
        VALUES 
          ($1, $2, 102400, 'application/pdf', $3, true),
          ($1, $4, 204800, 'image/png', $3, true)
      `, [
        projectId,
        `${projectNames[i].replace(/\s/g, '_')}_brief.pdf`,
        clientId,
        `${projectNames[i].replace(/\s/g, '_')}_mockup.png`
      ]);
      
      // Create test invoices for first two projects
      if (i < 2) {
        await query(`
          INSERT INTO invoices (
            invoice_number,
            project_id,
            client_id,
            total_amount,
            status,
            due_date
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          `INV-2025-10${i + 1}`,
          projectId,
          clientId,
          2500 + (i * 500),
          i === 0 ? 'pending' : 'paid',
          new Date(Date.now() + (15 - i * 10) * 24 * 60 * 60 * 1000)
        ]);
      }
    }
    
    console.log('\nTest data created successfully!');
    console.log('You can now log in with: client@example.com / client123');
    
    // Display summary
    const summary = await query(`
      SELECT 
        COUNT(*) as project_count,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_projects
      FROM projects 
      WHERE client_id = $1
    `, [clientId]);
    
    console.log(`\nDashboard will show:`);
    console.log(`- Total projects: ${summary.rows[0].project_count}`);
    console.log(`- Active projects: ${summary.rows[0].active_projects}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test data:', error);
    process.exit(1);
  }
}

createTestData();