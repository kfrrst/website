import { BRAND } from '../config/brand.js';

export default {
  title: 'Components/UI Elements',
  parameters: {
    docs: {
      description: {
        component: 'Common UI components used throughout the [RE]Print Studios portal',
      },
    },
  },
};

export const Buttons = () => {
  const container = document.createElement('div');
  container.style.padding = '20px';
  
  const buttonTypes = [
    {
      title: 'Primary Buttons',
      buttons: [
        { text: 'Primary Action', class: 'btn-primary' },
        { text: 'Hover State', class: 'btn-primary', style: `background: ${BRAND.colors.blueHover};` },
        { text: 'Disabled', class: 'btn-primary', disabled: true },
      ]
    },
    {
      title: 'Secondary Buttons', 
      buttons: [
        { text: 'Secondary Action', class: 'btn-secondary' },
        { text: 'Cancel', class: 'btn-secondary' },
      ]
    },
    {
      title: 'Icon Buttons',
      buttons: [
        { text: '📎 Attach File', class: 'btn-icon' },
        { text: '✉️ Send Message', class: 'btn-primary' },
        { text: '⬇️ Download', class: 'btn-secondary' },
      ]
    },
    {
      title: 'Button Sizes',
      buttons: [
        { text: 'Small', class: 'btn-small' },
        { text: 'Medium', class: 'btn-primary' },
        { text: 'Large', class: 'btn-primary', style: 'padding: 16px 32px; font-size: 1.125rem;' },
      ]
    }
  ];
  
  buttonTypes.forEach(section => {
    const sectionDiv = document.createElement('div');
    sectionDiv.style.marginBottom = '30px';
    
    const title = document.createElement('h3');
    title.textContent = section.title;
    title.style.marginBottom = '15px';
    sectionDiv.appendChild(title);
    
    const buttonGroup = document.createElement('div');
    buttonGroup.style.display = 'flex';
    buttonGroup.style.gap = '10px';
    buttonGroup.style.flexWrap = 'wrap';
    
    section.buttons.forEach(btnConfig => {
      const button = document.createElement('button');
      button.textContent = btnConfig.text;
      button.className = btnConfig.class || '';
      if (btnConfig.style) button.style.cssText = btnConfig.style;
      if (btnConfig.disabled) button.disabled = true;
      
      // Add default button styles if not already styled
      if (!button.style.cssText && !btnConfig.class) {
        button.style.cssText = `
          padding: 10px 20px;
          border: 1px solid ${BRAND.colors.blue};
          background: white;
          color: ${BRAND.colors.blue};
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        `;
      }
      
      buttonGroup.appendChild(button);
    });
    
    sectionDiv.appendChild(buttonGroup);
    container.appendChild(sectionDiv);
  });
  
  return container;
};

export const FormElements = () => {
  const container = document.createElement('div');
  container.style.padding = '20px';
  container.style.maxWidth = '600px';
  
  container.innerHTML = `
    <h2 style="margin-bottom: 30px;">Form Elements</h2>
    
    <div class="form-group" style="margin-bottom: 20px;">
      <label for="text-input" style="display: block; margin-bottom: 5px; font-weight: 500;">Text Input</label>
      <input type="text" id="text-input" placeholder="Enter text..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
    </div>
    
    <div class="form-group" style="margin-bottom: 20px;">
      <label for="email-input" style="display: block; margin-bottom: 5px; font-weight: 500;">Email Input</label>
      <input type="email" id="email-input" placeholder="your@email.com" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
    </div>
    
    <div class="form-group" style="margin-bottom: 20px;">
      <label for="select-input" style="display: block; margin-bottom: 5px; font-weight: 500;">Select Dropdown</label>
      <select id="select-input" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
        <option>Select an option...</option>
        <option>Option 1</option>
        <option>Option 2</option>
        <option>Option 3</option>
      </select>
    </div>
    
    <div class="form-group" style="margin-bottom: 20px;">
      <label for="textarea-input" style="display: block; margin-bottom: 5px; font-weight: 500;">Textarea</label>
      <textarea id="textarea-input" rows="4" placeholder="Enter your message..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; resize: vertical;"></textarea>
    </div>
    
    <div class="form-group" style="margin-bottom: 20px;">
      <label style="display: flex; align-items: center; cursor: pointer;">
        <input type="checkbox" style="margin-right: 8px;">
        <span>I agree to the terms and conditions</span>
      </label>
    </div>
    
    <div class="form-group" style="margin-bottom: 20px;">
      <label style="font-weight: 500; display: block; margin-bottom: 10px;">Radio Options</label>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="radio" name="radio-group" style="margin-right: 8px;">
          <span>Option A</span>
        </label>
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="radio" name="radio-group" style="margin-right: 8px;">
          <span>Option B</span>
        </label>
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="radio" name="radio-group" style="margin-right: 8px;">
          <span>Option C</span>
        </label>
      </div>
    </div>
  `;
  
  return container;
};

export const Cards = () => {
  const container = document.createElement('div');
  container.style.padding = '20px';
  
  const cardTypes = [
    {
      title: 'Project Card',
      html: `
        <div class="project-card" style="padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 350px;">
          <div class="project-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h4 style="margin: 0;">Brand Identity Redesign</h4>
            <span class="project-status in-progress" style="padding: 4px 12px; background: ${BRAND.colors.yellow}; color: ${BRAND.colors.text}; border-radius: 4px; font-size: 0.75rem; font-weight: 500;">In Progress</span>
          </div>
          <div class="progress-bar" style="height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; margin-bottom: 10px;">
            <div class="progress-fill" style="width: 65%; height: 100%; background: ${BRAND.colors.blue};"></div>
          </div>
          <p class="progress-text" style="font-size: 0.875rem; color: ${BRAND.colors.textSecondary}; margin-bottom: 15px;">65% Complete</p>
          <div class="project-meta" style="display: flex; gap: 10px; font-size: 0.75rem; color: ${BRAND.colors.textSecondary};">
            <span>Due: Feb 15, 2025</span>
            <span>•</span>
            <span>12 files</span>
          </div>
        </div>
      `
    },
    {
      title: 'Stat Card',
      html: `
        <div class="stat-card" style="padding: 30px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; max-width: 200px;">
          <h3 style="margin: 0 0 10px 0; font-size: 2.5rem; color: ${BRAND.colors.blue};">24</h3>
          <p style="margin: 0; color: ${BRAND.colors.textSecondary};">Files Shared</p>
        </div>
      `
    },
    {
      title: 'Message Card',
      html: `
        <div class="message-card" style="display: flex; gap: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px; max-width: 500px;">
          <div class="message-avatar" style="width: 40px; height: 40px; background: ${BRAND.colors.blue}; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; flex-shrink: 0;">KF</div>
          <div class="message-content" style="flex: 1;">
            <div class="message-header" style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span class="sender-name" style="font-weight: 600;">Kendrick Forrest</span>
              <span class="message-time" style="font-size: 0.75rem; color: ${BRAND.colors.textSecondary};">2 hours ago</span>
            </div>
            <p style="margin: 0; font-size: 0.875rem; color: ${BRAND.colors.text};">I've uploaded the latest logo concepts. Please review when you have a chance.</p>
          </div>
        </div>
      `
    }
  ];
  
  cardTypes.forEach(card => {
    const section = document.createElement('div');
    section.style.marginBottom = '40px';
    
    const title = document.createElement('h3');
    title.textContent = card.title;
    title.style.marginBottom = '15px';
    section.appendChild(title);
    
    const cardContainer = document.createElement('div');
    cardContainer.innerHTML = card.html;
    section.appendChild(cardContainer);
    
    container.appendChild(section);
  });
  
  return container;
};

export const Alerts = () => {
  const container = document.createElement('div');
  container.style.padding = '20px';
  container.style.maxWidth = '600px';
  
  const alerts = [
    {
      type: 'Success',
      icon: '✓',
      message: 'Your changes have been saved successfully!',
      color: BRAND.colors.green,
      bg: 'rgba(39, 174, 96, 0.1)'
    },
    {
      type: 'Info',
      icon: 'ℹ',
      message: 'New files have been uploaded to your project.',
      color: BRAND.colors.blue,
      bg: 'rgba(0, 87, 255, 0.1)'
    },
    {
      type: 'Warning',
      icon: '⚠',
      message: 'Your session will expire in 5 minutes.',
      color: BRAND.colors.yellow,
      bg: 'rgba(247, 198, 0, 0.1)'
    },
    {
      type: 'Error',
      icon: '✕',
      message: 'Failed to upload file. Please try again.',
      color: BRAND.colors.red,
      bg: 'rgba(230, 57, 70, 0.1)'
    }
  ];
  
  alerts.forEach(alert => {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 15px;
      margin-bottom: 15px;
      background: ${alert.bg};
      border: 1px solid ${alert.color};
      border-radius: 6px;
      color: ${alert.color};
    `;
    
    const icon = document.createElement('span');
    icon.textContent = alert.icon;
    icon.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: ${alert.color};
      color: white;
      border-radius: 50%;
      font-weight: bold;
      flex-shrink: 0;
    `;
    
    const message = document.createElement('div');
    message.style.flex = '1';
    message.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 2px;">${alert.type}</div>
      <div style="font-size: 0.875rem;">${alert.message}</div>
    `;
    
    alertDiv.appendChild(icon);
    alertDiv.appendChild(message);
    container.appendChild(alertDiv);
  });
  
  return container;
};