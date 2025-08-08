import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Simplified phase endpoint that just returns basic phase data
router.get('/projects/:projectId/phases/:phaseNumber', authenticateToken, async (req, res) => {
  try {
    const { projectId, phaseNumber } = req.params;
    
    // Define phase names
    const phaseNames = [
      'Onboarding', 'Ideation', 'Design', 'Review & Feedback',
      'Production/Print', 'Payment', 'Sign-off & Docs', 'Delivery'
    ];
    
    const phaseIndex = parseInt(phaseNumber) - 1;
    
    if (phaseIndex < 0 || phaseIndex >= phaseNames.length) {
      return res.status(404).json({ error: 'Invalid phase number' });
    }
    
    // Return simplified phase data
    res.json({
      phase: {
        id: `${projectId}-phase-${phaseNumber}`,
        project_id: projectId,
        phase_number: parseInt(phaseNumber),
        phase_name: phaseNames[phaseIndex],
        phase_key: phaseNames[phaseIndex].toLowerCase().replace(/[^a-z0-9]/g, ''),
        status: phaseIndex === 0 ? 'in_progress' : 'pending',
        description: getPhaseDescription(phaseNames[phaseIndex])
      },
      actions: [],
      files: [],
      activity: [],
      deliverables: [],
      statistics: {
        total_actions: 0,
        completed_actions: 0,
        pending_actions: 0,
        file_count: 0
      }
    });
    
  } catch (error) {
    console.error('Phase endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch phase details' });
  }
});

function getPhaseDescription(phaseName) {
  const descriptions = {
    'Onboarding': 'Initial project setup and requirements gathering',
    'Ideation': 'Concept development and creative brainstorming',
    'Design': 'Creating initial designs and mockups',
    'Review & Feedback': 'Client review and feedback incorporation',
    'Production/Print': 'Final production and printing',
    'Payment': 'Payment collection and processing',
    'Sign-off & Docs': 'Final approvals and documentation',
    'Delivery': 'Final deliverables and handover'
  };
  return descriptions[phaseName] || '';
}

export default router;