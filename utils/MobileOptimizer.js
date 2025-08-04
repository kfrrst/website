/**
 * Mobile Optimizer
 * Handles mobile-specific optimizations and enhancements
 */
export class MobileOptimizer {
  constructor(options = {}) {
    this.options = {
      touchGestures: options.touchGestures !== false,
      performanceOptimization: options.performanceOptimization !== false,
      batteryOptimization: options.batteryOptimization !== false,
      networkOptimization: options.networkOptimization !== false,
      viewportOptimization: options.viewportOptimization !== false,
      orientationHandling: options.orientationHandling !== false,
      hardwareAcceleration: options.hardwareAcceleration !== false,
      debug: options.debug || false,
      ...options
    };

    this.deviceCapabilities = {};
    this.networkInfo = {};
    this.batteryInfo = {};
    this.performanceMetrics = {
      touchLatency: [],
      scrollPerformance: [],
      renderTime: []
    };

    this.touchHandlers = new Map();
    this.gestureRecognizers = new Map();
    this.intersectionObservers = new Map();

    this.init();
  }

  /**
   * Initialize mobile optimizations
   */
  init() {
    if (this.options.debug) {
      console.log('📱 MobileOptimizer initializing...');
    }

    // Detect device capabilities
    this.detectDeviceCapabilities();

    // Core optimizations
    this.setupViewportOptimization();
    this.setupTouchOptimizations();
    this.setupPerformanceOptimizations();
    this.setupNetworkOptimizations();
    this.setupBatteryOptimizations();
    this.setupOrientationHandling();
    this.setupHardwareAcceleration();

    // Event listeners
    this.setupEventListeners();

    if (this.options.debug) {
      console.log('✅ MobileOptimizer initialized');
      this.logDeviceInfo();
    }
  }

  /**
   * Detect device capabilities
   */
  detectDeviceCapabilities() {
    this.deviceCapabilities = {
      // Device type
      isMobile: this.isMobileDevice(),
      isTablet: this.isTabletDevice(),
      isTouch: 'ontouchstart' in window,
      
      // Screen info
      screenSize: {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        pixelRatio: window.devicePixelRatio || 1
      },
      
      // Hardware features
      hasAccelerometer: 'DeviceMotionEvent' in window,
      hasGyroscope: 'DeviceOrientationEvent' in window,
      hasVibration: 'vibrate' in navigator,
      hasCamera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      
      // Performance capabilities
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      memory: navigator.deviceMemory || 4,
      
      // Browser features
      hasIntersectionObserver: 'IntersectionObserver' in window,
      hasResizeObserver: 'ResizeObserver' in window,
      hasServiceWorker: 'serviceWorker' in navigator,
      hasWebGL: this.hasWebGLSupport(),
      
      // Network
      hasNetworkInfo: 'connection' in navigator,
      hasOnlineOffline: 'onLine' in navigator
    };

    // Get network information
    if (this.deviceCapabilities.hasNetworkInfo) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      this.networkInfo = {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }

    // Get battery information
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        this.batteryInfo = {
          level: battery.level,
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        };
        
        // Listen for battery changes
        battery.addEventListener('levelchange', () => {
          this.batteryInfo.level = battery.level;
          this.adaptToBatteryLevel();
        });
        
        battery.addEventListener('chargingchange', () => {
          this.batteryInfo.charging = battery.charging;
          this.adaptToBatteryLevel();
        });
      });
    }
  }

  /**
   * Check if device is mobile
   */
  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.screen.width < 768 && 'ontouchstart' in window);
  }

  /**
   * Check if device is tablet
   */
  isTabletDevice() {
    return /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent) ||
           (window.screen.width >= 768 && window.screen.width < 1024 && 'ontouchstart' in window);
  }

  /**
   * Check WebGL support
   */
  hasWebGLSupport() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && canvas.getContext('webgl'));
    } catch (e) {
      return false;
    }
  }

  /**
   * Setup viewport optimization
   */
  setupViewportOptimization() {
    if (!this.options.viewportOptimization) return;

    // Set optimal viewport meta tag
    this.setViewportMeta();
    
    // Handle safe area insets
    this.handleSafeAreaInsets();
    
    // Optimize for different orientations
    this.optimizeForOrientation();
    
    // Prevent zoom on input focus (iOS)
    this.preventInputZoom();
  }

  /**
   * Set optimal viewport meta tag
   */
  setViewportMeta() {
    let viewport = document.querySelector('meta[name="viewport"]');
    
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }

    // Optimal viewport settings
    const viewportContent = [
      'width=device-width',
      'initial-scale=1.0',
      'viewport-fit=cover', // For iPhone X and newer
      'shrink-to-fit=no'
    ];

    // Prevent zoom on low-power devices
    if (this.batteryInfo.level < 0.2 && !this.batteryInfo.charging) {
      viewportContent.push('user-scalable=no');
    }

    viewport.content = viewportContent.join(', ');
  }

  /**
   * Handle safe area insets for iPhone X and newer
   */
  handleSafeAreaInsets() {
    if (!CSS.supports('padding: env(safe-area-inset-top)')) return;

    const style = document.createElement('style');
    style.textContent = `
      /* Safe area adjustments */
      .safe-area-inset-top {
        padding-top: max(var(--safe-area-top, 0px), env(safe-area-inset-top));
      }
      
      .safe-area-inset-bottom {
        padding-bottom: max(var(--safe-area-bottom, 0px), env(safe-area-inset-bottom));
      }
      
      .safe-area-inset-left {
        padding-left: max(var(--safe-area-left, 0px), env(safe-area-inset-left));
      }
      
      .safe-area-inset-right {
        padding-right: max(var(--safe-area-right, 0px), env(safe-area-inset-right));
      }
      
      .safe-area-insets {
        padding-top: max(var(--safe-area-top, 0px), env(safe-area-inset-top));
        padding-bottom: max(var(--safe-area-bottom, 0px), env(safe-area-inset-bottom));
        padding-left: max(var(--safe-area-left, 0px), env(safe-area-inset-left));
        padding-right: max(var(--safe-area-right, 0px), env(safe-area-inset-right));
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Prevent input zoom on iOS
   */
  preventInputZoom() {
    if (!/iPad|iPhone|iPod/.test(navigator.userAgent)) return;

    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (parseFloat(getComputedStyle(input).fontSize) < 16) {
        input.style.fontSize = '16px';
      }
    });

    // Monitor for dynamically added inputs
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            const inputs = node.querySelectorAll ? node.querySelectorAll('input, select, textarea') : [];
            inputs.forEach(input => {
              if (parseFloat(getComputedStyle(input).fontSize) < 16) {
                input.style.fontSize = '16px';
              }
            });
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Setup touch optimizations
   */
  setupTouchOptimizations() {
    if (!this.options.touchGestures || !this.deviceCapabilities.isTouch) return;

    // Optimize touch events
    this.optimizeTouchEvents();
    
    // Setup gesture recognition
    this.setupGestureRecognition();
    
    // Optimize scroll performance
    this.optimizeScrollPerformance();
    
    // Setup touch feedback
    this.setupTouchFeedback();
  }

  /**
   * Optimize touch events
   */
  optimizeTouchEvents() {
    // Use passive listeners for better performance
    const passiveEvents = ['touchstart', 'touchmove', 'touchend', 'scroll', 'wheel'];
    
    passiveEvents.forEach(eventType => {
      document.addEventListener(eventType, (e) => {
        // Track performance
        if (eventType.startsWith('touch')) {
          const now = performance.now();
          this.performanceMetrics.touchLatency.push(now);
          
          // Keep only last 50 measurements
          if (this.performanceMetrics.touchLatency.length > 50) {
            this.performanceMetrics.touchLatency.shift();
          }
        }
      }, { passive: true });
    });

    // Optimize touch-action for better performance
    this.optimizeTouchAction();
  }

  /**
   * Optimize touch-action CSS property
   */
  optimizeTouchAction() {
    const style = document.createElement('style');
    style.textContent = `
      /* Touch action optimizations */
      .scroll-container {
        touch-action: pan-y;
        -webkit-overflow-scrolling: touch;
      }
      
      .horizontal-scroll {
        touch-action: pan-x;
        -webkit-overflow-scrolling: touch;
      }
      
      .no-touch-action {
        touch-action: none;
      }
      
      .manipulation-only {
        touch-action: manipulation;
      }
      
      /* Prevent touch callouts on iOS */
      .no-touch-callout {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
      }
      
      /* Optimize button touch targets */
      button, .btn, [role="button"] {
        touch-action: manipulation;
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Setup gesture recognition
   */
  setupGestureRecognition() {
    // Swipe gesture recognition
    this.setupSwipeGestures();
    
    // Pinch/zoom gesture recognition
    this.setupPinchGestures();
    
    // Long press gesture recognition
    this.setupLongPressGestures();
  }

  /**
   * Setup swipe gestures
   */
  setupSwipeGestures() {
    let startX, startY, startTime;
    
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
      }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!startX || !startY) return;
      
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const endTime = Date.now();
      
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const deltaTime = endTime - startTime;
      
      // Minimum swipe distance and maximum time
      const minSwipeDistance = 50;
      const maxSwipeTime = 300;
      
      if (Math.abs(deltaX) > minSwipeDistance && deltaTime < maxSwipeTime) {
        const direction = deltaX > 0 ? 'right' : 'left';
        this.handleSwipe(e.target, direction, deltaX, deltaTime);
      } else if (Math.abs(deltaY) > minSwipeDistance && deltaTime < maxSwipeTime) {
        const direction = deltaY > 0 ? 'down' : 'up';
        this.handleSwipe(e.target, direction, deltaY, deltaTime);
      }
      
      startX = startY = startTime = null;
    }, { passive: true });
  }

  /**
   * Handle swipe gesture
   */
  handleSwipe(target, direction, distance, duration) {
    const swipeEvent = new CustomEvent('swipe', {
      detail: { direction, distance, duration, target },
      bubbles: true
    });
    
    target.dispatchEvent(swipeEvent);
    
    // Handle common swipe patterns
    const swipeContainer = target.closest('[data-swipe]');
    if (swipeContainer) {
      const swipeAction = swipeContainer.dataset.swipe;
      this.executeSwipeAction(swipeAction, direction, swipeContainer);
    }
  }

  /**
   * Execute swipe action
   */
  executeSwipeAction(action, direction, container) {
    switch (action) {
      case 'navigate':
        if (direction === 'left') {
          history.forward();
        } else if (direction === 'right') {
          history.back();
        }
        break;
        
      case 'carousel':
        const carousel = container.querySelector('.carousel');
        if (carousel) {
          if (direction === 'left') {
            carousel.scrollLeft += carousel.clientWidth;
          } else if (direction === 'right') {
            carousel.scrollLeft -= carousel.clientWidth;
          }
        }
        break;
        
      case 'dismiss':
        if (direction === 'up' || direction === 'down') {
          container.classList.add('dismissed');
          setTimeout(() => container.remove(), 300);
        }
        break;
    }
  }

  /**
   * Setup performance optimizations
   */
  setupPerformanceOptimizations() {
    if (!this.options.performanceOptimization) return;

    // Optimize image loading
    this.optimizeImageLoading();
    
    // Setup lazy loading
    this.setupLazyLoading();
    
    // Optimize animations
    this.optimizeAnimations();
    
    // Setup frame rate monitoring
    this.setupFrameRateMonitoring();
  }

  /**
   * Optimize image loading
   */
  optimizeImageLoading() {
    // Use WebP format when supported
    const supportsWebP = this.supportsWebP();
    
    if (supportsWebP) {
      document.body.classList.add('webp-support');
      
      const style = document.createElement('style');
      style.textContent = `
        .webp-support .webp-fallback {
          display: none;
        }
      `;
      document.head.appendChild(style);
    }

    // Optimize image sizes based on device pixel ratio
    const images = document.querySelectorAll('img[data-src]');
    images.forEach(img => {
      this.optimizeImageForDevice(img);
    });
  }

  /**
   * Check WebP support
   */
  supportsWebP() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
  }

  /**
   * Optimize image for device
   */
  optimizeImageForDevice(img) {
    const pixelRatio = this.deviceCapabilities.screenSize.pixelRatio;
    const baseSrc = img.dataset.src;
    
    if (pixelRatio > 1 && img.dataset.srcset) {
      img.srcset = img.dataset.srcset;
    } else {
      img.src = baseSrc;
    }
    
    // Add loading attribute for native lazy loading
    if ('loading' in HTMLImageElement.prototype) {
      img.loading = 'lazy';
    }
  }

  /**
   * Setup lazy loading
   */
  setupLazyLoading() {
    if (!this.deviceCapabilities.hasIntersectionObserver) return;

    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          this.loadImage(img);
          imageObserver.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });

    // Observe all images with data-src
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => imageObserver.observe(img));

    this.intersectionObservers.set('images', imageObserver);
  }

  /**
   * Load image
   */
  loadImage(img) {
    if (img.dataset.src) {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    }
    
    if (img.dataset.srcset) {
      img.srcset = img.dataset.srcset;
      img.removeAttribute('data-srcset');
    }
    
    img.classList.add('loaded');
  }

  /**
   * Setup network optimizations
   */
  setupNetworkOptimizations() {
    if (!this.options.networkOptimization) return;

    // Adapt to connection quality
    this.adaptToConnectionQuality();
    
    // Setup resource hints
    this.setupResourceHints();
    
    // Optimize for data saver mode
    this.optimizeForDataSaver();
  }

  /**
   * Adapt to connection quality
   */
  adaptToConnectionQuality() {
    if (!this.networkInfo.effectiveType) return;

    const connectionQuality = this.networkInfo.effectiveType;
    
    switch (connectionQuality) {
      case 'slow-2g':
      case '2g':
        this.enableLowBandwidthMode();
        break;
      case '3g':
        this.enableMediumBandwidthMode();
        break;
      case '4g':
        this.enableHighBandwidthMode();
        break;
    }
  }

  /**
   * Enable low bandwidth mode
   */
  enableLowBandwidthMode() {
    document.body.classList.add('low-bandwidth');
    
    // Disable auto-playing videos
    const videos = document.querySelectorAll('video[autoplay]');
    videos.forEach(video => {
      video.removeAttribute('autoplay');
      video.setAttribute('data-autoplay-disabled', 'true');
    });
    
    // Use smaller images
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.dataset.lowQuality) {
        img.src = img.dataset.lowQuality;
      }
    });
  }

  /**
   * Setup battery optimizations
   */
  setupBatteryOptimizations() {
    if (!this.options.batteryOptimization) return;

    this.adaptToBatteryLevel();
    
    // Monitor battery changes
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        battery.addEventListener('levelchange', () => {
          this.adaptToBatteryLevel();
        });
      });
    }
  }

  /**
   * Adapt to battery level
   */
  adaptToBatteryLevel() {
    const level = this.batteryInfo.level;
    const charging = this.batteryInfo.charging;
    
    if (level < 0.2 && !charging) {
      this.enablePowerSaveMode();
    } else if (level > 0.5 || charging) {
      this.disablePowerSaveMode();
    }
  }

  /**
   * Enable power save mode
   */
  enablePowerSaveMode() {
    document.body.classList.add('power-save-mode');
    
    // Reduce animation frame rate
    this.reduceAnimationFrameRate();
    
    // Disable non-essential animations
    this.disableNonEssentialAnimations();
    
    // Reduce update frequency
    this.reduceUpdateFrequency();
  }

  /**
   * Setup orientation handling
   */
  setupOrientationHandling() {
    if (!this.options.orientationHandling) return;

    window.addEventListener('orientationchange', () => {
      this.handleOrientationChange();
    });

    // Initial setup
    this.handleOrientationChange();
  }

  /**
   * Handle orientation change
   */
  handleOrientationChange() {
    const orientation = window.screen.orientation?.angle ?? window.orientation;
    const isLandscape = Math.abs(orientation) === 90;
    
    document.body.classList.toggle('landscape', isLandscape);
    document.body.classList.toggle('portrait', !isLandscape);
    
    // Adjust viewport height for mobile browsers
    this.adjustViewportHeight();
    
    // Trigger custom event
    const orientationEvent = new CustomEvent('orientationchange', {
      detail: { orientation, isLandscape }
    });
    window.dispatchEvent(orientationEvent);
  }

  /**
   * Adjust viewport height for mobile browsers
   */
  adjustViewportHeight() {
    // Fix for mobile browsers where 100vh includes address bar
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  /**
   * Setup hardware acceleration
   */
  setupHardwareAcceleration() {
    if (!this.options.hardwareAcceleration) return;

    const style = document.createElement('style');
    style.textContent = `
      /* Hardware acceleration for smooth animations */
      .accelerated,
      .animate,
      .transition {
        will-change: transform;
        transform: translateZ(0);
        backface-visibility: hidden;
        perspective: 1000px;
      }
      
      /* Optimize scroll containers */
      .scroll-container {
        will-change: scroll-position;
        -webkit-overflow-scrolling: touch;
      }
      
      /* Optimize transforms */
      .transform-optimized {
        will-change: transform;
        transform: translate3d(0, 0, 0);
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Connection change
    if (this.deviceCapabilities.hasNetworkInfo) {
      const connection = navigator.connection;
      connection.addEventListener('change', () => {
        this.networkInfo.effectiveType = connection.effectiveType;
        this.adaptToConnectionQuality();
      });
    }

    // Online/offline status
    window.addEventListener('online', () => {
      document.body.classList.remove('offline');
      document.body.classList.add('online');
    });

    window.addEventListener('offline', () => {
      document.body.classList.remove('online');
      document.body.classList.add('offline');
    });

    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseNonEssentialOperations();
      } else {
        this.resumeNonEssentialOperations();
      }
    });
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const touchLatency = this.performanceMetrics.touchLatency;
    const avgTouchLatency = touchLatency.length > 0 
      ? touchLatency.reduce((a, b) => a + b, 0) / touchLatency.length 
      : 0;

    return {
      deviceCapabilities: this.deviceCapabilities,
      networkInfo: this.networkInfo,
      batteryInfo: this.batteryInfo,
      averageTouchLatency: avgTouchLatency.toFixed(2) + 'ms',
      totalTouchEvents: touchLatency.length
    };
  }

  /**
   * Log device information
   */
  logDeviceInfo() {
    console.group('📱 Mobile Device Information');
    console.log('Device Type:', {
      mobile: this.deviceCapabilities.isMobile,
      tablet: this.deviceCapabilities.isTablet,
      touch: this.deviceCapabilities.isTouch
    });
    console.log('Screen:', this.deviceCapabilities.screenSize);
    console.log('Hardware:', {
      cores: this.deviceCapabilities.hardwareConcurrency,
      memory: this.deviceCapabilities.memory + 'GB'
    });
    console.log('Network:', this.networkInfo);
    console.log('Battery:', this.batteryInfo);
    console.groupEnd();
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Clear observers
    this.intersectionObservers.forEach(observer => observer.disconnect());
    this.intersectionObservers.clear();

    // Clear handlers
    this.touchHandlers.clear();
    this.gestureRecognizers.clear();

    // Clear metrics
    this.performanceMetrics = {
      touchLatency: [],
      scrollPerformance: [],
      renderTime: []
    };

    console.log('📱 MobileOptimizer destroyed');
  }
}

// Create global mobile optimizer instance
export const mobileOptimizer = new MobileOptimizer({
  debug: process.env.NODE_ENV !== 'production'
});