import { query as dbQuery } from './config/database.js';
import { v4 as uuidv4 } from 'uuid';

async function testFormSubmission() {
  console.log('Testing form submission and file creation...\n');
  
  try {
    // Get test project and user
    const projectResult = await dbQuery(`
      SELECT id, name, current_phase_key 
      FROM projects 
      WHERE is_active = true 
      LIMIT 1
    `);
    
    const userResult = await dbQuery(`
      SELECT id, email 
      FROM users 
      WHERE role = 'client' 
      LIMIT 1
    `);
    
    if (projectResult.rows.length === 0 || userResult.rows.length === 0) {
      console.error('No test project or user found');
      process.exit(1);
    }
    
    const project = projectResult.rows[0];
    const user = userResult.rows[0];
    
    console.log(`Testing with project: ${project.name} (${project.id})`);
    console.log(`Testing with user: ${user.email} (${user.id})`);
    console.log(`Current phase: ${project.current_phase_key}\n`);
    
    // Simulate form submission
    const formData = {
      business_name: 'Test Business',
      contact_name: 'Test Contact',
      email: 'test@example.com',
      phone: '555-1234',
      project_type: 'Brand Identity',
      budget: '5000-10000',
      timeline: '3 months',
      goals: 'Create a professional brand identity'
    };
    
    const moduleId = 'intake_base';
    const phaseKey = 'ONB';
    
    // Save form data
    console.log('1. Saving form data...');
    const formResult = await dbQuery(`
      INSERT INTO forms_data (
        project_id, phase_key, module_id, payload, submitted_by
      ) VALUES (
        $1, $2, $3, $4, $5
      ) ON CONFLICT (project_id, phase_key, module_id) 
      DO UPDATE SET 
        payload = $4,
        submitted_by = $5,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [project.id, phaseKey, moduleId, JSON.stringify(formData), user.id]);
    
    const savedData = formResult.rows[0];
    console.log('✓ Form data saved with ID:', savedData.id);
    
    // Create file record
    console.log('\n2. Creating file record...');
    const formattedDate = new Date().toISOString().split('T')[0];
    const fileName = `Intake Base - ${formattedDate}.json`;
    const storedName = `form_${savedData.id}.json`;
    const fileId = uuidv4();
    
    const fileResult = await dbQuery(`
      INSERT INTO files (
        id, original_name, stored_name, file_path, file_size, 
        mime_type, file_type, uploader_id, project_id, 
        description, is_active, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, CURRENT_TIMESTAMP
      ) RETURNING *
    `, [
      fileId,
      fileName,
      storedName,
      `/forms/${project.id}/${phaseKey}/${storedName}`,
      JSON.stringify(formData).length,
      'application/json',
      'document',
      user.id,
      project.id,
      `Intake Base submission for ${phaseKey} phase`
    ]);
    
    console.log('✓ File created:', {
      id: fileResult.rows[0].id,
      name: fileResult.rows[0].original_name,
      type: fileResult.rows[0].file_type
    });
    
    // Log activity
    console.log('\n3. Logging activity...');
    await dbQuery(`
      INSERT INTO activity_log (
        user_id, action, description, project_id, entity_type, entity_id, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      )
    `, [
      user.id,
      'form_submission',
      `Submitted ${moduleId} form for ${phaseKey} phase`,
      project.id,
      'form',
      savedData.id,
      JSON.stringify({ module_id: moduleId, form_data_id: savedData.id })
    ]);
    console.log('✓ Activity logged');
    
    // Mark requirement as completed
    console.log('\n4. Marking requirement as completed...');
    const requirementResult = await dbQuery(`
      SELECT id FROM phase_requirements 
      WHERE phase_key = $1 AND requirement_key = $2
    `, [phaseKey, 'intake_form']);
    
    if (requirementResult.rows.length > 0) {
      const requirementId = requirementResult.rows[0].id;
      
      await dbQuery(`
        INSERT INTO project_phase_requirements (
          id, project_id, requirement_id, completed, completed_at, completed_by, metadata
        ) VALUES (
          $1, $2, $3, true, CURRENT_TIMESTAMP, $4, $5
        ) ON CONFLICT (project_id, requirement_id) 
        DO UPDATE SET 
          completed = true,
          completed_at = CURRENT_TIMESTAMP,
          completed_by = $4,
          metadata = $5,
          updated_at = CURRENT_TIMESTAMP
      `, [
        uuidv4(),
        project.id,
        requirementId,
        user.id,
        JSON.stringify({ module_id: moduleId, form_data_id: savedData.id })
      ]);
      console.log('✓ Requirement marked as completed');
    }
    
    // Verify the results
    console.log('\n5. Verifying results...');
    
    // Check if file exists
    const fileCheck = await dbQuery(`
      SELECT * FROM files 
      WHERE project_id = $1 AND file_type = 'document' 
      ORDER BY created_at DESC 
      LIMIT 1
    `, [project.id]);
    
    if (fileCheck.rows.length > 0) {
      console.log('✓ File found in database:', fileCheck.rows[0].original_name);
    } else {
      console.log('✗ File NOT found in database');
    }
    
    // Check requirement status
    const reqCheck = await dbQuery(`
      SELECT 
        pr.requirement_text,
        COALESCE(ppr.completed, false) as completed
      FROM phase_requirements pr
      LEFT JOIN project_phase_requirements ppr 
        ON pr.id = ppr.requirement_id AND ppr.project_id = $1
      WHERE pr.phase_key = $2 AND pr.requirement_key = 'intake_form'
    `, [project.id, phaseKey]);
    
    if (reqCheck.rows.length > 0) {
      const req = reqCheck.rows[0];
      console.log(`✓ Requirement "${req.requirement_text}": ${req.completed ? 'COMPLETED' : 'NOT COMPLETED'}`);
    }
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('Error in test:', error);
  }
  
  process.exit(0);
}

testFormSubmission();