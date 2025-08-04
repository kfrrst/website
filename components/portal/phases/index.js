/**
 * Phase Components Index
 * Export all phase-specific UI components
 */

// Core phase components
export { IntakeWizard } from './IntakeWizard.js';
export { MoodboardModule as Moodboard } from './MoodboardModule.js';
export { FigmaPreview } from './FigmaPreview.js';
export { AnnotationBoard } from './AnnotationBoard.js';
export { LaunchGallery } from './LaunchGallery.js';
export { MiroEmbed } from './MiroEmbed.js';
export { ResearchList } from './ResearchList.js';

// Placeholder components (to be enhanced)
export { 
  NotionEmbed,
  ModelViewer,
  ProofChecklist,
  BatchStatus,
  StagingLink,
  DeployCard,
  LinearList,
  FabricationLog,
  FinishChecklist,
  LaunchChecklist,
  WrapUp
} from './PlaceholderComponents.js';

// Phase component mapping for dynamic loading
export const PHASE_COMPONENTS = {
  // Onboarding
  'IntakeWizard': IntakeWizard,
  
  // Collaboration
  'MiroEmbed': MiroEmbed,
  
  // Ideation
  'Moodboard': MoodboardModule,
  
  // Research
  'ResearchList': ResearchList,
  
  // Discovery
  'NotionEmbed': NotionEmbed,
  
  // Design
  'FigmaPreview': FigmaPreview,
  
  // 3D/CAD
  'ModelViewer': ModelViewer,
  
  // Pre-Press
  'ProofChecklist': ProofChecklist,
  
  // Production
  'BatchStatus': BatchStatus,
  
  // MVP
  'StagingLink': StagingLink,
  
  // Development
  'DeployCard': DeployCard,
  
  // QA Testing
  'LinearList': LinearList,
  
  // Fabrication
  'FabricationLog': FabricationLog,
  
  // Finishing
  'FinishChecklist': FinishChecklist,
  
  // Deployment
  'LaunchChecklist': LaunchChecklist,
  
  // Review
  'AnnotationBoard': AnnotationBoard,
  
  // Launch
  'LaunchGallery': LaunchGallery,
  
  // Wrap-up
  'WrapUp': WrapUp
};

/**
 * Get component for a specific phase
 * @param {string} phaseKey - The phase key (e.g., 'ONB', 'IDEA')
 * @param {Array} componentNames - Array of component names for this phase
 * @returns {Array} Array of component classes
 */
export function getPhaseComponents(phaseKey, componentNames = []) {
  return componentNames
    .map(name => PHASE_COMPONENTS[name])
    .filter(component => component !== undefined);
}

/**
 * Load and render phase components
 * @param {Object} portal - Portal instance
 * @param {string} projectId - Current project ID
 * @param {Object} phaseData - Phase configuration data
 * @param {HTMLElement} container - Container to render components
 */
export async function renderPhaseComponents(portal, projectId, phaseData, container) {
  const components = getPhaseComponents(phaseData.key, phaseData.ui_components);
  
  if (components.length === 0) {
    container.innerHTML = `
      <div class="no-components">
        <p>No interactive components available for this phase.</p>
      </div>
    `;
    return;
  }

  // Create instances and render each component
  for (const ComponentClass of components) {
    const componentContainer = document.createElement('div');
    componentContainer.className = 'phase-component-container';
    
    try {
      const instance = new ComponentClass(portal, projectId, phaseData);
      
      // Store instance for global access if needed
      if (!portal.modules.phases) {
        portal.modules.phases = {};
      }
      portal.modules.phases[ComponentClass.name.toLowerCase()] = instance;
      
      // Render the component
      await instance.render(componentContainer);
      container.appendChild(componentContainer);
    } catch (error) {
      console.error(`Error rendering ${ComponentClass.name}:`, error);
      componentContainer.innerHTML = `
        <div class="component-error">
          <p>Failed to load ${ComponentClass.name}</p>
        </div>
      `;
      container.appendChild(componentContainer);
    }
  }
}