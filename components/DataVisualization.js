/**
 * Data Visualization System
 * Interactive charts and data visualizations for the project management system
 */
export class DataVisualization {
  constructor(options = {}) {
    this.options = {
      // Chart settings
      theme: options.theme || 'light',
      primaryColor: options.primaryColor || '#0057FF',
      accentColor: options.accentColor || '#F7C600',
      successColor: options.successColor || '#27AE60',
      errorColor: options.errorColor || '#E63946',
      
      // Animation settings
      enableAnimations: options.enableAnimations !== false,
      animationDuration: options.animationDuration || 800,
      
      // Responsive settings
      responsive: options.responsive !== false,
      breakpoints: options.breakpoints || {
        mobile: 480,
        tablet: 768,
        desktop: 1024
      },
      
      // Accessibility
      enableA11y: options.enableA11y !== false,
      
      // Debug
      debug: options.debug || false,
      
      ...options
    };

    this.charts = new Map();
    this.resizeObserver = null;
    this.reducedMotion = false;

    this.init();
  }

  /**
   * Initialize data visualization system
   */
  init() {
    if (this.options.debug) {
      console.log('📊 DataVisualization initializing...');
    }

    // Check for reduced motion
    this.checkReducedMotion();

    // Setup visualization styles
    this.setupVisualizationStyles();

    // Setup resize observer for responsive charts
    if (this.options.responsive) {
      this.setupResizeObserver();
    }

    // Auto-initialize charts with data-chart attribute
    this.initializeAutoCharts();

    if (this.options.debug) {
      console.log('✅ DataVisualization initialized');
    }
  }

  /**
   * Check for reduced motion preference
   */
  checkReducedMotion() {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addListener((e) => {
      this.reducedMotion = e.matches;
      this.updateAnimationSettings();
    });
  }

  /**
   * Setup visualization styles
   */
  setupVisualizationStyles() {
    if (document.getElementById('data-visualization-styles')) return;

    const style = document.createElement('style');
    style.id = 'data-visualization-styles';
    style.textContent = `
      /* Data Visualization System Styles */
      
      /* Chart containers */
      .chart-container {
        position: relative;
        width: 100%;
        height: 300px;
        background: #ffffff;
        border-radius: 12px;
        border: 1px solid #e5e7eb;
        padding: 20px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }
      
      .chart-container-sm { height: 200px; }
      .chart-container-lg { height: 400px; }
      .chart-container-xl { height: 500px; }
      
      .chart-title {
        font-size: 18px;
        font-weight: 600;
        color: #111827;
        margin: 0 0 16px 0;
        text-align: center;
      }
      
      .chart-subtitle {
        font-size: 14px;
        color: #6b7280;
        margin: -12px 0 16px 0;
        text-align: center;
      }
      
      /* SVG charts */
      .chart-svg {
        width: 100%;
        height: 100%;
        overflow: visible;
      }
      
      /* Progress charts */
      .progress-chart {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .progress-item {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .progress-label {
        min-width: 80px;
        font-size: 14px;
        font-weight: 500;
        color: #374151;
      }
      
      .progress-bar-container {
        flex: 1;
        height: 8px;
        background: #f3f4f6;
        border-radius: 4px;
        overflow: hidden;
        position: relative;
      }
      
      .progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, ${this.options.primaryColor}, ${this.options.accentColor});
        border-radius: inherit;
        transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
      }
      
      .progress-bar-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
        animation: progressShimmer 2s infinite;
      }
      
      @keyframes progressShimmer {
        to { left: 100%; }
      }
      
      .progress-value {
        min-width: 40px;
        font-size: 14px;
        font-weight: 600;
        color: #111827;
        text-align: right;
      }
      
      /* Donut chart */
      .donut-chart {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .donut-center {
        position: absolute;
        text-align: center;
        pointer-events: none;
      }
      
      .donut-value {
        font-size: 32px;
        font-weight: 700;
        color: #111827;
        line-height: 1;
      }
      
      .donut-label {
        font-size: 14px;
        color: #6b7280;
        margin-top: 4px;
      }
      
      /* Line chart */
      .line-chart-grid {
        stroke: #f3f4f6;
        stroke-width: 1;
        fill: none;
      }
      
      .line-chart-axis {
        stroke: #d1d5db;
        stroke-width: 1;
      }
      
      .line-chart-line {
        fill: none;
        stroke: ${this.options.primaryColor};
        stroke-width: 3;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      
      .line-chart-area {
        fill: url(#lineGradient);
        opacity: 0.3;
      }
      
      .line-chart-point {
        fill: ${this.options.primaryColor};
        stroke: #ffffff;
        stroke-width: 2;
        r: 4;
        transition: r 0.2s ease;
      }
      
      .line-chart-point:hover {
        r: 6;
        cursor: pointer;
      }
      
      /* Bar chart */
      .bar-chart-bar {
        fill: ${this.options.primaryColor};
        transition: fill 0.2s ease, opacity 0.2s ease;
      }
      
      .bar-chart-bar:hover {
        fill: ${this.options.accentColor};
        opacity: 0.8;
        cursor: pointer;
      }
      
      .bar-chart-label {
        font-size: 12px;
        fill: #6b7280;
        text-anchor: middle;
      }
      
      /* Pie chart */
      .pie-segment {
        transition: transform 0.2s ease;
        transform-origin: center;
      }
      
      .pie-segment:hover {
        transform: scale(1.05);
        cursor: pointer;
      }
      
      /* Chart legend */
      .chart-legend {
        display: flex;
        justify-content: center;
        gap: 16px;
        margin-top: 16px;
        flex-wrap: wrap;
      }
      
      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #6b7280;
      }
      
      .legend-color {
        width: 12px;
        height: 12px;
        border-radius: 2px;
        flex-shrink: 0;
      }
      
      /* Statistics cards */
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }
      
      .stat-card {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      
      .stat-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
      
      .stat-value {
        font-size: 28px;
        font-weight: 700;
        color: #111827;
        margin-bottom: 4px;
      }
      
      .stat-label {
        font-size: 14px;
        color: #6b7280;
        margin-bottom: 8px;
      }
      
      .stat-change {
        font-size: 12px;
        font-weight: 500;
        padding: 2px 6px;
        border-radius: 4px;
      }
      
      .stat-change-positive {
        background: #dcfce7;
        color: #166534;
      }
      
      .stat-change-negative {
        background: #fef2f2;
        color: #991b1b;
      }
      
      .stat-change-neutral {
        background: #f3f4f6;
        color: #374151;
      }
      
      /* Tooltip */
      .chart-tooltip {
        position: absolute;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        pointer-events: none;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.2s ease;
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
      }
      
      .chart-tooltip.show {
        opacity: 1;
      }
      
      .chart-tooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        border: 4px solid transparent;
        border-top-color: rgba(0, 0, 0, 0.9);
        transform: translateX(-50%);
      }
      
      /* Loading state */
      .chart-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #6b7280;
      }
      
      .chart-loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #e5e7eb;
        border-top: 3px solid ${this.options.primaryColor};
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 12px;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      /* Error state */
      .chart-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #ef4444;
        text-align: center;
      }
      
      .chart-error-icon {
        font-size: 48px;
        margin-bottom: 12px;
      }
      
      .chart-error-message {
        font-size: 14px;
        margin-bottom: 16px;
      }
      
      .chart-error-retry {
        background: ${this.options.primaryColor};
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }
      
      .chart-error-retry:hover {
        background: ${this.options.accentColor};
      }
      
      /* Responsive design */
      @media (max-width: 640px) {
        .chart-container {
          padding: 16px;
          height: 250px;
        }
        
        .chart-title {
          font-size: 16px;
        }
        
        .stats-grid {
          grid-template-columns: 1fr;
        }
        
        .chart-legend {
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
      }
      
      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .chart-container,
        .stat-card {
          background: #1f2937;
          border-color: #374151;
        }
        
        .chart-title,
        .stat-value {
          color: #f9fafb;
        }
        
        .chart-subtitle,
        .stat-label,
        .progress-label {
          color: #d1d5db;
        }
        
        .progress-bar-container {
          background: #374151;
        }
        
        .line-chart-grid {
          stroke: #374151;
        }
        
        .line-chart-axis {
          stroke: #4b5563;
        }
        
        .bar-chart-label {
          fill: #d1d5db;
        }
        
        .legend-item {
          color: #d1d5db;
        }
      }
      
      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .progress-bar-fill,
        .line-chart-point,
        .bar-chart-bar,
        .pie-segment,
        .stat-card {
          transition: none;
        }
        
        .progress-bar-fill::after,
        .chart-loading-spinner {
          animation: none;
        }
        
        .stat-card:hover {
          transform: none;
        }
      }
      
      /* High contrast mode */
      @media (prefers-contrast: high) {
        .chart-container,
        .stat-card {
          border-width: 2px;
          border-color: #000000;
        }
        
        .progress-bar-fill {
          background: #000000;
        }
        
        .line-chart-line,
        .bar-chart-bar {
          stroke: #000000;
          fill: #000000;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Setup resize observer
   */
  setupResizeObserver() {
    if (!window.ResizeObserver) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      entries.forEach(entry => {
        const chartId = entry.target.dataset.chartId;
        if (chartId && this.charts.has(chartId)) {
          this.resizeChart(chartId);
        }
      });
    });
  }

  /**
   * Initialize auto charts
   */
  initializeAutoCharts() {
    document.querySelectorAll('[data-chart]').forEach(element => {
      const chartType = element.dataset.chart;
      const chartData = element.dataset.chartData;
      
      if (chartData) {
        try {
          const data = JSON.parse(chartData);
          this.createChart(element, chartType, data);
        } catch (error) {
          console.error('Invalid chart data:', error);
          this.showError(element, 'Invalid chart data');
        }
      }
    });
  }

  /**
   * Create chart
   */
  createChart(container, type, data, options = {}) {
    const chartId = `chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    container.dataset.chartId = chartId;

    // Show loading state
    this.showLoading(container);

    // Setup container
    if (!container.classList.contains('chart-container')) {
      container.classList.add('chart-container');
    }

    const config = {
      id: chartId,
      container,
      type,
      data,
      options: { ...this.options, ...options }
    };

    try {
      let chart;
      switch (type) {
        case 'progress':
          chart = this.createProgressChart(config);
          break;
        case 'donut':
          chart = this.createDonutChart(config);
          break;
        case 'line':
          chart = this.createLineChart(config);
          break;
        case 'bar':
          chart = this.createBarChart(config);
          break;
        case 'pie':
          chart = this.createPieChart(config);
          break;
        case 'stats':
          chart = this.createStatsCards(config);
          break;
        default:
          throw new Error(`Unknown chart type: ${type}`);
      }

      this.charts.set(chartId, chart);

      // Setup resize observer
      if (this.resizeObserver) {
        this.resizeObserver.observe(container);
      }

      return chartId;
    } catch (error) {
      console.error('Failed to create chart:', error);
      this.showError(container, error.message);
      return null;
    }
  }

  /**
   * Create progress chart
   */
  createProgressChart(config) {
    const { container, data, options } = config;
    
    const progressChart = document.createElement('div');
    progressChart.className = 'progress-chart';

    if (options.title) {
      const title = document.createElement('h3');
      title.className = 'chart-title';
      title.textContent = options.title;
      progressChart.appendChild(title);
    }

    data.forEach(item => {
      const progressItem = document.createElement('div');
      progressItem.className = 'progress-item';

      progressItem.innerHTML = `
        <div class="progress-label">${item.label}</div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: 0%;" data-target="${item.value}"></div>
        </div>
        <div class="progress-value">${item.value}%</div>
      `;

      progressChart.appendChild(progressItem);
    });

    container.innerHTML = '';
    container.appendChild(progressChart);

    // Animate progress bars
    if (!this.reducedMotion) {
      setTimeout(() => {
        progressChart.querySelectorAll('.progress-bar-fill').forEach(bar => {
          const target = parseInt(bar.dataset.target);
          bar.style.width = `${target}%`;
        });
      }, 100);
    } else {
      progressChart.querySelectorAll('.progress-bar-fill').forEach(bar => {
        const target = parseInt(bar.dataset.target);
        bar.style.width = `${target}%`;
      });
    }

    return { type: 'progress', element: progressChart, data };
  }

  /**
   * Create donut chart
   */
  createDonutChart(config) {
    const { container, data, options } = config;
    
    const size = Math.min(container.clientWidth, container.clientHeight) - 40;
    const radius = size / 2 - 10;
    const innerRadius = radius * 0.6;
    
    const svg = this.createSVG(size, size);
    const donutGroup = this.createSVGElement('g');
    donutGroup.setAttribute('transform', `translate(${size/2}, ${size/2})`);

    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = -90; // Start from top

    const colors = this.generateColors(data.length);

    data.forEach((item, index) => {
      const percentage = (item.value / total) * 100;
      const angle = (item.value / total) * 360;
      
      const path = this.createDonutSegment(0, 0, radius, innerRadius, currentAngle, angle);
      path.setAttribute('fill', colors[index]);
      path.setAttribute('class', 'pie-segment');
      path.setAttribute('data-label', item.label);
      path.setAttribute('data-value', item.value);
      path.setAttribute('data-percentage', percentage.toFixed(1));

      this.addTooltip(path, `${item.label}: ${item.value} (${percentage.toFixed(1)}%)`);

      donutGroup.appendChild(path);
      currentAngle += angle;
    });

    svg.appendChild(donutGroup);

    // Create center content
    const centerDiv = document.createElement('div');
    centerDiv.className = 'donut-center';
    centerDiv.innerHTML = `
      <div class="donut-value">${total}</div>
      <div class="donut-label">${options.centerLabel || 'Total'}</div>
    `;

    const donutContainer = document.createElement('div');
    donutContainer.className = 'donut-chart';
    donutContainer.appendChild(svg);
    donutContainer.appendChild(centerDiv);

    if (options.title) {
      const title = document.createElement('h3');
      title.className = 'chart-title';
      title.textContent = options.title;
      container.appendChild(title);
    }

    container.innerHTML = '';
    if (options.title) {
      const title = document.createElement('h3');
      title.className = 'chart-title';
      title.textContent = options.title;
      container.appendChild(title);
    }
    container.appendChild(donutContainer);

    // Add legend
    this.addLegend(container, data, colors);

    return { type: 'donut', element: donutContainer, data, svg };
  }

  /**
   * Create line chart
   */
  createLineChart(config) {
    const { container, data, options } = config;
    
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom - (options.title ? 40 : 0);

    const svg = this.createSVG(container.clientWidth, container.clientHeight);
    
    // Create gradient
    const defs = this.createSVGElement('defs');
    const gradient = this.createSVGElement('linearGradient');
    gradient.setAttribute('id', 'lineGradient');
    gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
    gradient.setAttribute('x1', '0');
    gradient.setAttribute('y1', '0');
    gradient.setAttribute('x2', '0');
    gradient.setAttribute('y2', height);

    const stop1 = this.createSVGElement('stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('style', `stop-color:${this.options.primaryColor};stop-opacity:0.8`);

    const stop2 = this.createSVGElement('stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('style', `stop-color:${this.options.primaryColor};stop-opacity:0.1`);

    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    svg.appendChild(defs);

    const chartGroup = this.createSVGElement('g');
    chartGroup.setAttribute('transform', `translate(${margin.left}, ${margin.top})`);

    // Scale functions
    const xScale = this.createLinearScale([0, data.length - 1], [0, width]);
    const yScale = this.createLinearScale([0, Math.max(...data.map(d => d.value))], [height, 0]);

    // Draw grid
    this.drawGrid(chartGroup, width, height, 5, 5);

    // Draw line and area
    const line = this.createLinePath(data, xScale, yScale);
    const area = this.createAreaPath(data, xScale, yScale, height);

    const areaPath = this.createSVGElement('path');
    areaPath.setAttribute('d', area);
    areaPath.setAttribute('class', 'line-chart-area');
    chartGroup.appendChild(areaPath);

    const linePath = this.createSVGElement('path');
    linePath.setAttribute('d', line);
    linePath.setAttribute('class', 'line-chart-line');
    chartGroup.appendChild(linePath);

    // Draw points
    data.forEach((point, index) => {
      const circle = this.createSVGElement('circle');
      circle.setAttribute('cx', xScale(index));
      circle.setAttribute('cy', yScale(point.value));
      circle.setAttribute('class', 'line-chart-point');
      circle.setAttribute('data-label', point.label);
      circle.setAttribute('data-value', point.value);

      this.addTooltip(circle, `${point.label}: ${point.value}`);
      chartGroup.appendChild(circle);
    });

    svg.appendChild(chartGroup);

    if (options.title) {
      const title = document.createElement('h3');
      title.className = 'chart-title';
      title.textContent = options.title;
      container.appendChild(title);
    }

    container.innerHTML = '';
    if (options.title) {
      const title = document.createElement('h3');
      title.className = 'chart-title';
      title.textContent = options.title;
      container.appendChild(title);
    }
    container.appendChild(svg);

    return { type: 'line', element: svg, data };
  }

  /**
   * Create stats cards
   */
  createStatsCards(config) {
    const { container, data, options } = config;

    const statsGrid = document.createElement('div');
    statsGrid.className = 'stats-grid';

    data.forEach(stat => {
      const card = document.createElement('div');
      card.className = 'stat-card';

      let changeHtml = '';
      if (stat.change !== undefined) {
        const changeClass = stat.change > 0 ? 'positive' : stat.change < 0 ? 'negative' : 'neutral';
        const changeSymbol = stat.change > 0 ? '+' : '';
        changeHtml = `<div class="stat-change stat-change-${changeClass}">${changeSymbol}${stat.change}%</div>`;
      }

      card.innerHTML = `
        <div class="stat-value">${stat.value}</div>
        <div class="stat-label">${stat.label}</div>
        ${changeHtml}
      `;

      statsGrid.appendChild(card);
    });

    if (options.title) {
      const title = document.createElement('h3');
      title.className = 'chart-title';
      title.textContent = options.title;
      container.appendChild(title);
    }

    container.innerHTML = '';
    if (options.title) {
      const title = document.createElement('h3');
      title.className = 'chart-title';
      title.textContent = options.title;
      container.appendChild(title);
    }
    container.appendChild(statsGrid);

    return { type: 'stats', element: statsGrid, data };
  }

  /**
   * Utility methods for SVG creation
   */
  createSVG(width, height) {
    const svg = this.createSVGElement('svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('class', 'chart-svg');
    return svg;
  }

  createSVGElement(tag) {
    return document.createElementNS('http://www.w3.org/2000/svg', tag);
  }

  createLinearScale(domain, range) {
    const [d0, d1] = domain;
    const [r0, r1] = range;
    const scale = (value) => r0 + (value - d0) * (r1 - r0) / (d1 - d0);
    return scale;
  }

  createLinePath(data, xScale, yScale) {
    return data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.value)}`).join(' ');
  }

  createAreaPath(data, xScale, yScale, height) {
    const line = this.createLinePath(data, xScale, yScale);
    const lastIndex = data.length - 1;
    return `${line} L ${xScale(lastIndex)} ${height} L ${xScale(0)} ${height} Z`;
  }

  createDonutSegment(x, y, radius, innerRadius, startAngle, sweepAngle) {
    const start = this.polarToCartesian(x, y, radius, startAngle);
    const end = this.polarToCartesian(x, y, radius, startAngle + sweepAngle);
    const innerStart = this.polarToCartesian(x, y, innerRadius, startAngle);
    const innerEnd = this.polarToCartesian(x, y, innerRadius, startAngle + sweepAngle);

    const largeArcFlag = sweepAngle <= 180 ? "0" : "1";

    const path = [
      "M", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 1, end.x, end.y,
      "L", innerEnd.x, innerEnd.y,
      "A", innerRadius, innerRadius, 0, largeArcFlag, 0, innerStart.x, innerStart.y,
      "Z"
    ].join(" ");

    const pathElement = this.createSVGElement('path');
    pathElement.setAttribute('d', path);
    return pathElement;
  }

  polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  }

  drawGrid(container, width, height, xLines, yLines) {
    for (let i = 0; i <= xLines; i++) {
      const x = (width / xLines) * i;
      const line = this.createSVGElement('line');
      line.setAttribute('x1', x);
      line.setAttribute('y1', 0);
      line.setAttribute('x2', x);
      line.setAttribute('y2', height);
      line.setAttribute('class', 'line-chart-grid');
      container.appendChild(line);
    }

    for (let i = 0; i <= yLines; i++) {
      const y = (height / yLines) * i;
      const line = this.createSVGElement('line');
      line.setAttribute('x1', 0);
      line.setAttribute('y1', y);
      line.setAttribute('x2', width);
      line.setAttribute('y2', y);
      line.setAttribute('class', 'line-chart-grid');
      container.appendChild(line);
    }
  }

  /**
   * Add tooltip to element
   */
  addTooltip(element, text) {
    let tooltip = null;

    element.addEventListener('mouseenter', (e) => {
      tooltip = document.createElement('div');
      tooltip.className = 'chart-tooltip';
      tooltip.textContent = text;
      document.body.appendChild(tooltip);

      const rect = element.getBoundingClientRect();
      tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
      tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
      
      requestAnimationFrame(() => {
        tooltip.classList.add('show');
      });
    });

    element.addEventListener('mouseleave', () => {
      if (tooltip) {
        tooltip.classList.remove('show');
        setTimeout(() => {
          if (tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
          }
        }, 200);
      }
    });
  }

  /**
   * Add legend to chart
   */
  addLegend(container, data, colors) {
    const legend = document.createElement('div');
    legend.className = 'chart-legend';

    data.forEach((item, index) => {
      const legendItem = document.createElement('div');
      legendItem.className = 'legend-item';
      legendItem.innerHTML = `
        <div class="legend-color" style="background-color: ${colors[index]}"></div>
        ${item.label}
      `;
      legend.appendChild(legendItem);
    });

    container.appendChild(legend);
  }

  /**
   * Generate colors for chart
   */
  generateColors(count) {
    const colors = [
      this.options.primaryColor,
      this.options.accentColor,
      this.options.successColor,
      this.options.errorColor,
      '#8B5CF6',
      '#F59E0B',
      '#EF4444',
      '#10B981',
      '#3B82F6',
      '#8B5A2B'
    ];

    if (count <= colors.length) {
      return colors.slice(0, count);
    }

    // Generate additional colors using HSL
    const additionalColors = [];
    const baseHue = 210; // Blue hue
    for (let i = colors.length; i < count; i++) {
      const hue = (baseHue + (i * 360 / count)) % 360;
      additionalColors.push(`hsl(${hue}, 70%, 50%)`);
    }

    return [...colors, ...additionalColors];
  }

  /**
   * Show loading state
   */
  showLoading(container) {
    container.innerHTML = `
      <div class="chart-loading">
        <div class="chart-loading-spinner"></div>
        Loading chart...
      </div>
    `;
  }

  /**
   * Show error state
   */
  showError(container, message) {
    container.innerHTML = `
      <div class="chart-error">
        <div class="chart-error-icon">📊</div>
        <div class="chart-error-message">${message}</div>
        <button class="chart-error-retry" data-action="retry">
          Retry
        </button>
      </div>
    `;

    // Add event listener for retry button
    const retryButton = container.querySelector('.chart-error-retry');
    if (retryButton) {
      retryButton.addEventListener('click', () => {
        location.reload();
      });
    }
  }

  /**
   * Update chart data
   */
  updateChart(chartId, newData) {
    const chart = this.charts.get(chartId);
    if (!chart) return;

    chart.data = newData;
    
    // Recreate chart with new data
    const config = {
      id: chartId,
      container: chart.element.parentNode,
      type: chart.type,
      data: newData,
      options: chart.options || {}
    };

    this.createChart(config.container, config.type, newData, config.options);
  }

  /**
   * Resize chart
   */
  resizeChart(chartId) {
    const chart = this.charts.get(chartId);
    if (!chart) return;

    // For SVG charts, update dimensions
    if (chart.svg) {
      const container = chart.svg.parentNode;
      chart.svg.setAttribute('width', container.clientWidth);
      chart.svg.setAttribute('height', container.clientHeight);
    }

    // Recreate chart for better responsiveness
    setTimeout(() => {
      this.updateChart(chartId, chart.data);
    }, 100);
  }

  /**
   * Update animation settings
   */
  updateAnimationSettings() {
    this.charts.forEach(chart => {
      const elements = chart.element.querySelectorAll('.progress-bar-fill, .line-chart-point, .bar-chart-bar, .pie-segment');
      elements.forEach(element => {
        if (this.reducedMotion) {
          element.style.transition = 'none';
        } else {
          element.style.transition = '';
        }
      });
    });
  }

  /**
   * Destroy chart
   */
  destroyChart(chartId) {
    const chart = this.charts.get(chartId);
    if (!chart) return;

    if (this.resizeObserver && chart.container) {
      this.resizeObserver.unobserve(chart.container);
    }

    this.charts.delete(chartId);
  }

  /**
   * Get chart statistics
   */
  getStats() {
    return {
      totalCharts: this.charts.size,
      chartTypes: Array.from(this.charts.values()).reduce((acc, chart) => {
        acc[chart.type] = (acc[chart.type] || 0) + 1;
        return acc;
      }, {}),
      reducedMotion: this.reducedMotion
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Destroy all charts
    Array.from(this.charts.keys()).forEach(chartId => {
      this.destroyChart(chartId);
    });

    // Disconnect resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // Remove styles
    const styles = document.getElementById('data-visualization-styles');
    if (styles) {
      styles.remove();
    }

    console.log('📊 DataVisualization destroyed');
  }
}

// Create global data visualization instance
export const dataVisualization = new DataVisualization({
  debug: process.env.NODE_ENV !== 'production'
});