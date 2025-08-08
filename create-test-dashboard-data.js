import { query } from './config/database.js';
import bcrypt from 'bcryptjs';

async function createTestData() {
  try {
    console.log('Creating test data for dashboards...');
    
    // Create client user if not exists
    const clientEmail = 'client@example.com';
    const hashedPassword = await bcrypt.hash('client123', 10);
    
    // First check if user exists
    let checkResult = await query(`
      SELECT id FROM users WHERE email = $1
    `, [clientEmail]);
    
    let clientId;
    if (checkResult.rows.length > 0) {
      // User exists, just update password
      clientId = checkResult.rows[0].id;
      await query(`
        UPDATE users 
        SET password_hash = $1, first_name = $2, last_name = $3
        WHERE id = $4
      `, [hashedPassword, 'John', 'Smith', clientId]);
      console.log('Client user updated with ID:', clientId);
    } else {
      // Create new user
      const clientUser = await query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        RETURNING id
      `, [clientEmail, hashedPassword, 'John', 'Smith', 'client']);
      clientId = clientUser.rows[0].id;
      console.log('Client user created with ID:', clientId);
    }
    
    // Verify the client ID exists
    const verifyResult = await query(`
      SELECT id FROM users WHERE id = $1
    `, [clientId]);
    
    if (verifyResult.rows.length === 0) {
      throw new Error(`Client ID ${clientId} not found in database!`);
    }
    
    // Create admin user if not exists
    const adminEmail = 'admin@reprintstudios.com';
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    await query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
      ON CONFLICT (email) DO NOTHING
    `, [adminEmail, adminPassword, 'Admin', 'User', 'admin']);
    
    console.log('Admin user created/updated');
    
    // Create test projects for the client
    const projectNames = [
      'Brand Identity Redesign',
      'Marketing Campaign Q1',
      'Product Launch Materials',
      'Annual Report Design'
    ];
    
    for (let i = 0; i < projectNames.length; i++) {
      const status = i === 0 ? 'in_progress' : i === 1 ? 'in_progress' : 'planning';
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
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [
        projectNames[i],
        clientId,
        status,
        `This is a test project for ${projectNames[i]}`,
        5000 + (i * 1000),
        25 * (i + 1),
        new Date(Date.now() + (30 + i * 15) * 24 * 60 * 60 * 1000) // Due in 30-75 days
      ]);
      
      if (projectResult.rows.length > 0) {
        const projectId = projectResult.rows[0].id;
        console.log(`Project created: ${projectNames[i]} (${projectId})`);
        
        // Create phase tracking for the project
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
        
        // Create some activity log entries
        await query(`
          INSERT INTO activity_log (
            project_id,
            user_id,
            action,
            description,
            entity_type,
            entity_id
          )
          VALUES 
            ($1, $2, 'project_created', $3, 'project', $1),
            ($1, $2, 'phase_change', $4, 'project', $1)
        `, [
          projectId,
          clientId,
          `Project "${projectNames[i]}" created`,
          `Phase changed to ${phaseNames[phaseNumber - 1]}`
        ]);
        
        // Create some test files
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
          ON CONFLICT DO NOTHING
        `, [
          projectId,
          `${projectNames[i].replace(/\s/g, '_')}_brief.pdf`,
          clientId,
          `${projectNames[i].replace(/\s/g, '_')}_mockup.png`
        ]);
        
        // Create test invoices
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
            ON CONFLICT DO NOTHING
          `, [
            `INV-2025-00${i + 1}`,
            projectId,
            clientId,
            2500 + (i * 500),
            i === 0 ? 'pending' : 'paid',
            new Date(Date.now() + (15 - i * 10) * 24 * 60 * 60 * 1000)
          ]);
        }
        
        // Create test messages
        await query(`
          INSERT INTO messages (
            project_id,
            sender_id,
            recipient_id,
            subject,
            body
          )
          VALUES 
            ($1, $2, $2, $3, $4),
            ($1, $2, $2, $5, $6)
          ON CONFLICT DO NOTHING
        `, [
          projectId,
          clientId,
          `Update on ${projectNames[i]}`,
          `Here's the latest update on your project progress.`,
          `Question about deliverables`,
          `I have a question about the project deliverables.`
        ]);
      }
    }
    
    console.log('Test data created successfully!');
    console.log('\nYou can now log in with:');
    console.log('Client Portal: client@example.com / client123');
    console.log('Admin Portal: admin@reprintstudios.com / admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test data:', error);
    process.exit(1);
  }
}

createTestData();