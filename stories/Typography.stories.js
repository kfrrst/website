import { BRAND } from '../config/brand.js';

export default {
  title: 'Design System/Typography',
  parameters: {
    docs: {
      description: {
        component: 'Typography system for [RE]Print Studios using Montserrat font family',
      },
    },
  },
};

export const TypeScale = () => {
  const container = document.createElement('div');
  container.style.padding = '20px';
  container.style.fontFamily = BRAND.typography.fontFamily;
  
  const title = document.createElement('h1');
  title.textContent = 'Typography Scale';
  title.style.marginBottom = '40px';
  container.appendChild(title);
  
  const scales = [
    { tag: 'h1', size: '2.5rem', weight: 700, label: 'Heading 1' },
    { tag: 'h2', size: '2rem', weight: 600, label: 'Heading 2' },
    { tag: 'h3', size: '1.5rem', weight: 600, label: 'Heading 3' },
    { tag: 'h4', size: '1.25rem', weight: 600, label: 'Heading 4' },
    { tag: 'h5', size: '1.125rem', weight: 500, label: 'Heading 5' },
    { tag: 'p', size: '1rem', weight: 400, label: 'Body Text' },
    { tag: 'p', size: '0.875rem', weight: 400, label: 'Small Text' },
    { tag: 'p', size: '0.75rem', weight: 400, label: 'Caption Text' },
  ];
  
  scales.forEach(scale => {
    const row = document.createElement('div');
    row.style.marginBottom = '30px';
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '150px 1fr';
    row.style.alignItems = 'baseline';
    row.style.gap = '20px';
    
    const label = document.createElement('div');
    label.style.fontSize = '0.875rem';
    label.style.color = BRAND.colors.textSecondary;
    label.innerHTML = `
      <div>${scale.label}</div>
      <div style="font-family: monospace; font-size: 0.75rem; margin-top: 5px;">
        ${scale.size} / ${scale.weight}
      </div>
    `;
    
    const example = document.createElement(scale.tag);
    example.textContent = 'The quick brown fox jumps over the lazy dog';
    example.style.margin = '0';
    example.style.fontSize = scale.size;
    example.style.fontWeight = scale.weight;
    example.style.lineHeight = '1.5';
    
    row.appendChild(label);
    row.appendChild(example);
    container.appendChild(row);
  });
  
  return container;
};

export const FontWeights = () => {
  const container = document.createElement('div');
  container.style.padding = '20px';
  container.style.fontFamily = BRAND.typography.fontFamily;
  
  const title = document.createElement('h1');
  title.textContent = 'Font Weights';
  title.style.marginBottom = '40px';
  container.appendChild(title);
  
  Object.entries(BRAND.typography.weights).forEach(([name, weight]) => {
    const row = document.createElement('div');
    row.style.marginBottom = '20px';
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '20px';
    
    const label = document.createElement('div');
    label.style.width = '120px';
    label.style.fontSize = '0.875rem';
    label.style.color = BRAND.colors.textSecondary;
    label.textContent = `${name} (${weight})`;
    
    const example = document.createElement('div');
    example.textContent = 'Empowering Creative Journeys';
    example.style.fontSize = '1.5rem';
    example.style.fontWeight = weight;
    
    row.appendChild(label);
    row.appendChild(example);
    container.appendChild(row);
  });
  
  return container;
};

export const TextStyles = () => {
  const container = document.createElement('div');
  container.style.padding = '20px';
  container.style.fontFamily = BRAND.typography.fontFamily;
  container.style.maxWidth = '800px';
  
  const examples = [
    {
      title: 'Page Title',
      style: {
        fontSize: '2.5rem',
        fontWeight: 700,
        lineHeight: '1.2',
        marginBottom: '0.5rem'
      },
      text: '[RE]Print Studios'
    },
    {
      title: 'Section Heading',
      style: {
        fontSize: '1.5rem',
        fontWeight: 600,
        lineHeight: '1.3',
        marginBottom: '1rem'
      },
      text: 'Your Creative Journey Starts Here'
    },
    {
      title: 'Paragraph',
      style: {
        fontSize: '1rem',
        fontWeight: 400,
        lineHeight: '1.6',
        color: BRAND.colors.textSecondary,
        marginBottom: '1rem'
      },
      text: 'We are a vibrant and energetic design studio that caters to aspiring creatives and young adults embarking on their creative journey. Our mission is to empower individuals through innovative design solutions.'
    },
    {
      title: 'Button Text',
      style: {
        fontSize: '0.875rem',
        fontWeight: 500,
        letterSpacing: '0.02em',
        textTransform: 'uppercase'
      },
      text: 'Get Started'
    },
    {
      title: 'Label',
      style: {
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: BRAND.colors.textSecondary
      },
      text: 'Project Phase'
    },
    {
      title: 'Link',
      style: {
        fontSize: '1rem',
        fontWeight: 500,
        color: BRAND.colors.blue,
        textDecoration: 'underline',
        cursor: 'pointer'
      },
      text: 'View Project Details'
    }
  ];
  
  examples.forEach(example => {
    const section = document.createElement('div');
    section.style.marginBottom = '40px';
    
    const label = document.createElement('div');
    label.style.fontSize = '0.875rem';
    label.style.color = BRAND.colors.textSecondary;
    label.style.marginBottom = '10px';
    label.textContent = example.title;
    
    const text = document.createElement('div');
    Object.assign(text.style, example.style);
    text.textContent = example.text;
    
    section.appendChild(label);
    section.appendChild(text);
    container.appendChild(section);
  });
  
  return container;
};

export const BrandConcepts = () => {
  const container = document.createElement('div');
  container.style.padding = '20px';
  container.style.fontFamily = BRAND.typography.fontFamily;
  
  const title = document.createElement('h1');
  title.textContent = 'The [RE] Brand Concepts';
  title.style.marginBottom = '40px';
  container.appendChild(title);
  
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
  grid.style.gap = '20px';
  
  Object.entries(BRAND.concepts).forEach(([abbr, full]) => {
    const card = document.createElement('div');
    card.style.padding = '20px';
    card.style.backgroundColor = BRAND.colors.base;
    card.style.border = `2px solid ${BRAND.colors.blue}`;
    card.style.borderRadius = '8px';
    card.style.textAlign = 'center';
    
    const abbrDiv = document.createElement('div');
    abbrDiv.style.fontSize = '2rem';
    abbrDiv.style.fontWeight = 700;
    abbrDiv.style.color = BRAND.colors.blue;
    abbrDiv.style.marginBottom = '10px';
    abbrDiv.textContent = `[${abbr}]`;
    
    const fullDiv = document.createElement('div');
    fullDiv.style.fontSize = '1.125rem';
    fullDiv.style.fontWeight = '500';
    fullDiv.style.color = BRAND.colors.text;
    fullDiv.textContent = full;
    
    card.appendChild(abbrDiv);
    card.appendChild(fullDiv);
    grid.appendChild(card);
  });
  
  container.appendChild(grid);
  return container;
};