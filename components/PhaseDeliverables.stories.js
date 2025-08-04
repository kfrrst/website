import { PhaseDeliverables } from './PhaseDeliverables.js';

export default {
  title: 'Components/PhaseDeliverables',
  parameters: {
    docs: {
      description: {
        component: 'Production-ready component for displaying and managing project phase deliverables with file preview, download, and organization.',
      },
    },
  },
};

// Mock file data for stories
const createMockFiles = (count = 5) => {
  const fileTypes = [
    { type: 'image/jpeg', name: 'logo_concepts_v2.jpg', size: 2048000 },
    { type: 'application/pdf', name: 'brand_guidelines.pdf', size: 5120000 },
    { type: 'image/png', name: 'hero_banner.png', size: 3072000 },
    { type: 'application/zip', name: 'source_files.zip', size: 15360000 },
    { type: 'text/plain', name: 'project_notes.txt', size: 12800 },
    { type: 'video/mp4', name: 'intro_animation.mp4', size: 25600000 },
    { type: 'application/vnd.ms-excel', name: 'project_timeline.xlsx', size: 512000 }
  ];
  
  return Array.from({ length: count }, (_, i) => {
    const fileType = fileTypes[i % fileTypes.length];
    return {
      id: `file-${i + 1}`,
      name: fileType.name,
      type: fileType.type,
      size: fileType.size,
      upload_timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
      uploaded_by_name: i % 2 === 0 ? 'Kendrick Forrest' : 'John Doe',
      version: i < 2 ? 2 : 1,
      description: i < 3 ? 'Updated version with client feedback incorporated' : null
    };
  });
};

// Helper function to create deliverables container
const createDeliverablesStory = (args) => {
  const container = document.createElement('div');
  container.style.padding = '20px';
  container.style.maxWidth = '1000px';
  container.style.margin = '0 auto';
  
  const deliverables = new PhaseDeliverables(args);
  deliverables.render();
  
  return container;
};

export const GridView = {
  args: {
    deliverables: createMockFiles(6),
    phaseId: 'phase-3',
    phaseName: 'Design Review',
    viewMode: 'grid',
    authToken: 'mock-auth-token',
    isAdmin: false,
    allowUploads: false,
    onFileDownload: async (fileId) => {
      console.log('Downloading file:', fileId);
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert(`Downloaded file: ${fileId}`);
    },
    onFilePreview: async (fileId, file) => {
      console.log('Previewing file:', fileId, file);
      alert(`Previewing: ${file.name}`);
    }
  },
  render: (args) => createDeliverablesStory(args),
};

export const ListView = {
  args: {
    ...GridView.args,
    viewMode: 'list'
  },
  render: (args) => createDeliverablesStory(args),
};

export const EmptyState = {
  args: {
    deliverables: [],
    phaseId: 'phase-1',
    phaseName: 'Project Onboarding',
    viewMode: 'grid',
    authToken: 'mock-auth-token',
    isAdmin: false,
    allowUploads: false
  },
  render: (args) => createDeliverablesStory(args),
};

export const EmptyStateWithUpload = {
  args: {
    deliverables: [],
    phaseId: 'phase-2',
    phaseName: 'Initial Concepts',
    viewMode: 'grid',
    authToken: 'mock-auth-token',
    isAdmin: true,
    allowUploads: true,
    onFileUpload: async (files) => {
      console.log('Uploading files:', files);
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert(`Uploaded ${files.length} files successfully!`);
    }
  },
  render: (args) => createDeliverablesStory(args),
};

export const WithUploadArea = {
  args: {
    deliverables: createMockFiles(3),
    phaseId: 'phase-4',
    phaseName: 'Production Files',
    viewMode: 'grid',
    authToken: 'mock-auth-token',
    isAdmin: true,
    allowUploads: true,
    onFileDownload: async (fileId) => {
      console.log('Downloading file:', fileId);
      await new Promise(resolve => setTimeout(resolve, 500));
    },
    onFilePreview: async (fileId, file) => {
      console.log('Previewing file:', fileId, file);
    },
    onFileDelete: async (fileId) => {
      console.log('Deleting file:', fileId);
      if (confirm('Are you sure you want to delete this file?')) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert(`File ${fileId} deleted successfully`);
      }
    },
    onFileUpload: async (files) => {
      console.log('Uploading files:', files);
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert(`${files.length} files uploaded!`);
    }
  },
  render: (args) => createDeliverablesStory(args),
};

export const LargeFileSet = {
  args: {
    deliverables: createMockFiles(12),
    phaseId: 'phase-5',
    phaseName: 'Final Deliverables',
    viewMode: 'grid',
    authToken: 'mock-auth-token',
    isAdmin: false,
    allowUploads: false,
    onFileDownload: async (fileId) => {
      console.log('Downloading file:', fileId);
      // Simulate download
      const link = document.createElement('a');
      link.href = '#';
      link.download = `file-${fileId}.pdf`;
      link.textContent = 'Download';
      link.click();
    },
    onFilePreview: async (fileId, file) => {
      console.log('Opening preview for:', file.name);
      // Simulate image preview
      if (file.type.startsWith('image/')) {
        const modal = document.createElement('div');
        modal.style.cssText = `
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.9); z-index: 10000;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
        `;
        modal.innerHTML = `
          <div style="background: white; padding: 20px; border-radius: 8px; max-width: 90%; max-height: 90%;">
            <h3 style="margin: 0 0 15px 0;">${file.name}</h3>
            <div style="width: 400px; height: 300px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; border-radius: 4px;">
              <span style="color: #666; font-size: 48px;">🖼️</span>
            </div>
            <p style="margin: 15px 0 0 0; text-align: center; color: #666; font-size: 14px;">Click to close</p>
          </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', () => modal.remove());
      }
    }
  },
  render: (args) => createDeliverablesStory(args),
};

export const LoadingState = {
  args: {
    deliverables: createMockFiles(4),
    phaseId: 'phase-6',
    phaseName: 'Website Development',
    viewMode: 'grid',
    authToken: 'mock-auth-token',
    isAdmin: false,
    allowUploads: false
  },
  render: (args) => {
    const container = createDeliverablesStory(args);
    
    // Simulate loading state
    setTimeout(() => {
      const deliverables = new PhaseDeliverables({
        ...args,
        container: container.querySelector('.phase-deliverables-container')
      });
      deliverables.isLoading = true;
      deliverables.render();
    }, 100);
    
    return container;
  },
};

export const ErrorState = {
  args: {
    deliverables: createMockFiles(2),
    phaseId: 'phase-7',
    phaseName: 'Error Demo',
    viewMode: 'grid',
    authToken: 'mock-auth-token',
    isAdmin: false,
    allowUploads: false
  },
  render: (args) => {
    const container = createDeliverablesStory(args);
    
    // Simulate error state
    setTimeout(() => {
      const deliverables = new PhaseDeliverables({
        ...args,
        container: container.querySelector('.phase-deliverables-container')
      });
      deliverables.error = 'Failed to load deliverables. Please try again.';
      deliverables.render();
    }, 100);
    
    return container;
  },
};