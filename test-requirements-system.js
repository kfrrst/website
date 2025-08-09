import { query as dbQuery } from './config/database.js';

async function testRequirementsSystem() {
  console.log('Testing Phase Requirements System...\n');
  
  try {
    // 1. Check phase requirements exist
    console.log('1. Checking phase requirements:');
    const reqResult = await dbQuery(`
      SELECT phase_key, COUNT(*) as count, 
             COUNT(*) FILTER (WHERE is_mandatory = true) as mandatory_count
      FROM phase_requirements
      GROUP BY phase_key
      ORDER BY phase_key
    `);
    
    console.table(reqResult.rows);
    
    // 2. Check a sample project's requirements status
    console.log('\n2. Checking project requirements completion:');
    const projectResult = await dbQuery(`
      SELECT id, name, current_phase_key 
      FROM projects 
      WHERE is_active = true 
      LIMIT 1
    `);
    
    if (projectResult.rows.length > 0) {
      const project = projectResult.rows[0];
      console.log(`Project: ${project.name} (Phase: ${project.current_phase_key})`);
      
      // Get requirements for current phase
      const phaseReqResult = await dbQuery(`
        SELECT 
          pr.requirement_text,
          pr.requirement_type,
          pr.is_mandatory,
          COALESCE(ppr.completed, false) as completed,
          ppr.completed_at
        FROM phase_requirements pr
        LEFT JOIN project_phase_requirements ppr 
          ON pr.id = ppr.requirement_id AND ppr.project_id = $1
        WHERE pr.phase_key = $2
        ORDER BY pr.sort_order
      `, [project.id, project.current_phase_key]);
      
      console.table(phaseReqResult.rows);
      
      // Check completion percentage
      const stats = phaseReqResult.rows.reduce((acc, req) => {
        acc.total++;
        if (req.is_mandatory) acc.mandatory++;
        if (req.completed) acc.completed++;
        if (req.is_mandatory && req.completed) acc.mandatoryCompleted++;
        return acc;
      }, { total: 0, mandatory: 0, completed: 0, mandatoryCompleted: 0 });
      
      console.log('\nPhase Progress:');
      console.log(`- Total requirements: ${stats.total}`);
      console.log(`- Completed: ${stats.completed}/${stats.total} (${Math.round(stats.completed/stats.total*100)}%)`);
      console.log(`- Mandatory completed: ${stats.mandatoryCompleted}/${stats.mandatory} (${Math.round(stats.mandatoryCompleted/stats.mandatory*100)}%)`);
      console.log(`- Ready to advance: ${stats.mandatoryCompleted === stats.mandatory ? 'YES ✅' : 'NO ❌'}`);
    }
    
    // 3. Check form submissions in files
    console.log('\n3. Checking form submissions in files:');
    const filesResult = await dbQuery(`
      SELECT 
        f.original_name,
        f.file_type,
        f.created_at,
        p.name as project_name
      FROM files f
      LEFT JOIN projects p ON f.project_id = p.id
      WHERE f.file_type = 'document' 
        AND f.original_name LIKE '%form%'
      ORDER BY f.created_at DESC
      LIMIT 5
    `);
    
    if (filesResult.rows.length > 0) {
      console.table(filesResult.rows);
    } else {
      console.log('No form submissions found in files yet');
    }
    
    // 4. Check activity log for requirement completions
    console.log('\n4. Recent requirement activities:');
    const activityResult = await dbQuery(`
      SELECT 
        action,
        description,
        created_at
      FROM activity_log
      WHERE action IN ('requirement_completed', 'phase_ready', 'form_submission')
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (activityResult.rows.length > 0) {
      console.table(activityResult.rows);
    } else {
      console.log('No requirement activities logged yet');
    }
    
    console.log('\n✅ Requirements system test complete!');
    
  } catch (error) {
    console.error('Error testing requirements system:', error);
  }
  
  process.exit(0);
}

testRequirementsSystem();