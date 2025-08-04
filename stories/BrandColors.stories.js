import { BRAND } from '../config/brand.js';

export default {
  title: 'Design System/Brand Colors',
  parameters: {
    docs: {
      description: {
        component: '[RE]Print Studios brand color palette and usage guidelines',
      },
    },
  },
};

export const ColorPalette = () => {
  const container = document.createElement('div');
  container.style.padding = '20px';
  
  // Title
  const title = document.createElement('h1');
  title.textContent = '[RE]Print Studios Color Palette';
  title.style.marginBottom = '30px';
  container.appendChild(title);
  
  // Color sections
  const sections = [
    {
      title: 'Base Colors',
      colors: {
        'Base (Bone White)': BRAND.colors.base,
        'Text Primary': BRAND.colors.text,
        'Text Secondary': BRAND.colors.textSecondary,
      }
    },
    {
      title: 'Primary Colors',
      colors: {
        'Blue (Primary)': BRAND.colors.blue,
        'Yellow (Hover/Highlight)': BRAND.colors.yellow,
        'Red (Error/Warning)': BRAND.colors.red,
        'Green (Success)': BRAND.colors.green,
      }
    },
    {
      title: 'Hover States',
      colors: {
        'Blue Hover': BRAND.colors.blueHover,
        'Yellow Hover': BRAND.colors.yellowHover,
        'Red Hover': BRAND.colors.redHover,
        'Green Hover': BRAND.colors.greenHover,
      }
    }
  ];
  
  sections.forEach(section => {
    const sectionDiv = document.createElement('div');
    sectionDiv.style.marginBottom = '40px';
    
    const sectionTitle = document.createElement('h2');
    sectionTitle.textContent = section.title;
    sectionTitle.style.fontSize = '1.5rem';
    sectionTitle.style.marginBottom = '20px';
    sectionDiv.appendChild(sectionTitle);
    
    const colorGrid = document.createElement('div');
    colorGrid.style.display = 'grid';
    colorGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
    colorGrid.style.gap = '20px';
    
    Object.entries(section.colors).forEach(([name, color]) => {
      const colorCard = document.createElement('div');
      colorCard.style.borderRadius = '8px';
      colorCard.style.overflow = 'hidden';
      colorCard.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      
      const colorSwatch = document.createElement('div');
      colorSwatch.style.height = '100px';
      colorSwatch.style.backgroundColor = color;
      
      const colorInfo = document.createElement('div');
      colorInfo.style.padding = '15px';
      colorInfo.style.backgroundColor = 'white';
      
      const colorName = document.createElement('div');
      colorName.textContent = name;
      colorName.style.fontWeight = '600';
      colorName.style.marginBottom = '5px';
      
      const colorValue = document.createElement('div');
      colorValue.textContent = color;
      colorValue.style.fontFamily = 'monospace';
      colorValue.style.fontSize = '0.9rem';
      colorValue.style.color = '#666';
      
      colorInfo.appendChild(colorName);
      colorInfo.appendChild(colorValue);
      colorCard.appendChild(colorSwatch);
      colorCard.appendChild(colorInfo);
      colorGrid.appendChild(colorCard);
    });
    
    sectionDiv.appendChild(colorGrid);
    container.appendChild(sectionDiv);
  });
  
  return container;
};

export const ColorUsage = () => {
  const container = document.createElement('div');
  container.style.padding = '20px';
  container.style.maxWidth = '800px';
  
  const examples = [
    {
      title: 'Primary Actions',
      description: 'Use blue for primary buttons and important CTAs',
      html: `
        <button style="background: ${BRAND.colors.blue}; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; cursor: pointer; transition: all 0.2s;">
          Primary Action
        </button>
        <button style="background: ${BRAND.colors.blueHover}; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; cursor: pointer; margin-left: 10px;">
          Hover State
        </button>
      `
    },
    {
      title: 'Success States',
      description: 'Use green for success messages and completed states',
      html: `
        <div style="background: rgba(39, 174, 96, 0.1); border: 1px solid ${BRAND.colors.green}; padding: 15px; border-radius: 6px; color: ${BRAND.colors.green};">
          ✓ Success! Your changes have been saved.
        </div>
      `
    },
    {
      title: 'Warning/Error States',
      description: 'Use red for errors and important warnings',
      html: `
        <div style="background: rgba(230, 57, 70, 0.1); border: 1px solid ${BRAND.colors.red}; padding: 15px; border-radius: 6px; color: ${BRAND.colors.red}; margin-top: 10px;">
          ⚠️ Error: Please check your input and try again.
        </div>
      `
    },
    {
      title: 'Highlight/Hover',
      description: 'Use yellow for hover states and highlights',
      html: `
        <div style="display: inline-block; padding: 8px 16px; background: ${BRAND.colors.yellow}; color: ${BRAND.colors.text}; border-radius: 4px; font-weight: 500;">
          Featured Content
        </div>
      `
    },
    {
      title: 'Text Hierarchy',
      description: 'Use text colors to create visual hierarchy',
      html: `
        <h3 style="color: ${BRAND.colors.text}; margin: 10px 0;">Primary Heading</h3>
        <p style="color: ${BRAND.colors.textSecondary}; margin: 5px 0;">Secondary text for descriptions and supporting content.</p>
      `
    }
  ];
  
  examples.forEach(example => {
    const section = document.createElement('div');
    section.style.marginBottom = '40px';
    
    const title = document.createElement('h3');
    title.textContent = example.title;
    title.style.marginBottom = '10px';
    
    const description = document.createElement('p');
    description.textContent = example.description;
    description.style.color = BRAND.colors.textSecondary;
    description.style.marginBottom = '15px';
    
    const demoDiv = document.createElement('div');
    demoDiv.innerHTML = example.html;
    
    section.appendChild(title);
    section.appendChild(description);
    section.appendChild(demoDiv);
    container.appendChild(section);
  });
  
  return container;
};