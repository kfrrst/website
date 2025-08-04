/**
 * Touch Interactions Manager
 * Handles advanced touch gestures, haptic feedback, and touch-friendly interactions
 */
export class TouchInteractions {
  constructor(options = {}) {
    this.options = {
      hapticFeedback: options.hapticFeedback !== false,
      gestureRecognition: options.gestureRecognition !== false,
      touchRipples: options.touchRipples !== false,
      pressAndHold: options.pressAndHold !== false,
      dragAndDrop: options.dragAndDrop !== false,
      multiTouch: options.multiTouch !== false,
      debug: options.debug || false,
      ...options
    };

    this.activeGestures = new Map();
    this.touchPoints = new Map();
    this.gestureHandlers = new Map();
    this.rippleElements = new WeakSet();
    
    // Gesture thresholds
    this.thresholds = {
      tap: { maxDistance: 10, maxDuration: 300 },
      longPress: { maxDistance: 10, minDuration: 500 },
      swipe: { minDistance: 50, maxDuration: 300 },
      pinch: { minScale: 0.1, maxScale: 10 },
      pan: { minDistance: 10 }
    };

    this.init();
  }

  /**
   * Initialize touch interactions
   */
  init() {
    if (this.options.debug) {
      console.log('👆 TouchInteractions initializing...');
    }

    // Check for touch support
    if (!('ontouchstart' in window)) {
      if (this.options.debug) {
        console.log('Touch not supported, using mouse events as fallback');
      }
      this.setupMouseFallback();
      return;
    }

    // Setup core touch handling
    this.setupTouchHandling();
    
    // Setup gesture recognition
    if (this.options.gestureRecognition) {
      this.setupGestureRecognition();
    }
    
    // Setup haptic feedback
    if (this.options.hapticFeedback) {
      this.setupHapticFeedback();
    }
    
    // Setup touch ripples
    if (this.options.touchRipples) {
      this.setupTouchRipples();
    }
    
    // Setup drag and drop
    if (this.options.dragAndDrop) {
      this.setupDragAndDrop();
    }

    if (this.options.debug) {
      console.log('✅ TouchInteractions initialized');
    }
  }

  /**
   * Setup core touch handling
   */
  setupTouchHandling() {
    // Passive event listeners for better performance
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    document.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: true });

    // Prevent default behaviors where needed
    this.setupTouchPrevention();
  }

  /**
   * Handle touch start
   */
  handleTouchStart(event) {
    const touches = Array.from(event.touches);
    
    touches.forEach(touch => {
      const touchId = touch.identifier;
      const touchData = {
        id: touchId,
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        startTime: Date.now(),
        target: document.elementFromPoint(touch.clientX, touch.clientY),
        moved: false,
        distance: 0
      };
      
      this.touchPoints.set(touchId, touchData);
      
      // Start gesture recognition
      this.startGestureRecognition(touchData);
      
      // Trigger haptic feedback
      this.triggerHapticFeedback('light');
      
      // Create ripple effect
      this.createRipple(touchData.target, touch.clientX, touch.clientY);
    });

    // Handle multi-touch gestures
    if (touches.length > 1 && this.options.multiTouch) {
      this.handleMultiTouchStart(touches);
    }
  }

  /**
   * Handle touch move
   */
  handleTouchMove(event) {
    const touches = Array.from(event.touches);
    
    touches.forEach(touch => {
      const touchId = touch.identifier;
      const touchData = this.touchPoints.get(touchId);
      
      if (!touchData) return;
      
      // Update touch data
      touchData.currentX = touch.clientX;
      touchData.currentY = touch.clientY;
      touchData.distance = this.calculateDistance(
        touchData.startX, touchData.startY,
        touchData.currentX, touchData.currentY
      );
      
      if (touchData.distance > 5) {
        touchData.moved = true;
      }
      
      // Update gesture recognition
      this.updateGestureRecognition(touchData);
    });

    // Handle multi-touch gestures
    if (touches.length > 1 && this.options.multiTouch) {
      this.handleMultiTouchMove(touches);
    }
  }

  /**
   * Handle touch end
   */
  handleTouchEnd(event) {
    const changedTouches = Array.from(event.changedTouches);
    
    changedTouches.forEach(touch => {
      const touchId = touch.identifier;
      const touchData = this.touchPoints.get(touchId);
      
      if (!touchData) return;
      
      // Calculate final gesture data
      touchData.endTime = Date.now();
      touchData.duration = touchData.endTime - touchData.startTime;
      
      // Recognize and handle gesture
      this.recognizeGesture(touchData);
      
      // Cleanup
      this.touchPoints.delete(touchId);
      this.endGestureRecognition(touchData);
    });

    // Handle multi-touch end
    if (this.options.multiTouch) {
      this.handleMultiTouchEnd(changedTouches);
    }
  }

  /**
   * Handle touch cancel
   */
  handleTouchCancel(event) {
    const changedTouches = Array.from(event.changedTouches);
    
    changedTouches.forEach(touch => {
      const touchId = touch.identifier;
      this.touchPoints.delete(touchId);
    });
    
    // Clear all active gestures
    this.activeGestures.clear();
  }

  /**
   * Setup gesture recognition
   */
  setupGestureRecognition() {
    // Register built-in gesture recognizers
    this.registerGesture('tap', this.recognizeTap.bind(this));
    this.registerGesture('longpress', this.recognizeLongPress.bind(this));
    this.registerGesture('swipe', this.recognizeSwipe.bind(this));
    this.registerGesture('pan', this.recognizePan.bind(this));
    
    if (this.options.multiTouch) {
      this.registerGesture('pinch', this.recognizePinch.bind(this));
      this.registerGesture('rotate', this.recognizeRotate.bind(this));
    }
  }

  /**
   * Register gesture recognizer
   */
  registerGesture(name, recognizer) {
    this.gestureHandlers.set(name, recognizer);
  }

  /**
   * Start gesture recognition
   */
  startGestureRecognition(touchData) {
    // Start long press timer
    if (this.options.pressAndHold) {
      touchData.longPressTimer = setTimeout(() => {
        if (!touchData.moved && this.touchPoints.has(touchData.id)) {
          this.handleLongPress(touchData);
        }
      }, this.thresholds.longPress.minDuration);
    }
  }

  /**
   * Update gesture recognition
   */
  updateGestureRecognition(touchData) {
    // Cancel long press if moved too much
    if (touchData.longPressTimer && touchData.distance > this.thresholds.longPress.maxDistance) {
      clearTimeout(touchData.longPressTimer);
      touchData.longPressTimer = null;
    }
  }

  /**
   * End gesture recognition
   */
  endGestureRecognition(touchData) {
    // Clear timers
    if (touchData.longPressTimer) {
      clearTimeout(touchData.longPressTimer);
    }
  }

  /**
   * Recognize gesture from touch data
   */
  recognizeGesture(touchData) {
    // Try each registered gesture recognizer
    for (const [gestureName, recognizer] of this.gestureHandlers) {
      const gestureData = recognizer(touchData);
      if (gestureData) {
        this.handleGesture(gestureName, gestureData, touchData);
        break;
      }
    }
  }

  /**
   * Recognize tap gesture
   */
  recognizeTap(touchData) {
    if (touchData.duration <= this.thresholds.tap.maxDuration &&
        touchData.distance <= this.thresholds.tap.maxDistance) {
      return {
        type: 'tap',
        x: touchData.startX,
        y: touchData.startY,
        duration: touchData.duration
      };
    }
    return null;
  }

  /**
   * Recognize long press gesture
   */
  recognizeLongPress(touchData) {
    if (touchData.duration >= this.thresholds.longPress.minDuration &&
        touchData.distance <= this.thresholds.longPress.maxDistance) {
      return {
        type: 'longpress',
        x: touchData.startX,
        y: touchData.startY,
        duration: touchData.duration
      };
    }
    return null;
  }

  /**
   * Recognize swipe gesture
   */
  recognizeSwipe(touchData) {
    if (touchData.duration <= this.thresholds.swipe.maxDuration &&
        touchData.distance >= this.thresholds.swipe.minDistance) {
      
      const deltaX = touchData.currentX - touchData.startX;
      const deltaY = touchData.currentY - touchData.startY;
      
      let direction;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }
      
      const velocity = touchData.distance / touchData.duration;
      
      return {
        type: 'swipe',
        direction,
        distance: touchData.distance,
        velocity,
        deltaX,
        deltaY
      };
    }
    return null;
  }

  /**
   * Recognize pan gesture
   */
  recognizePan(touchData) {
    if (touchData.distance >= this.thresholds.pan.minDistance) {
      const deltaX = touchData.currentX - touchData.startX;
      const deltaY = touchData.currentY - touchData.startY;
      
      return {
        type: 'pan',
        deltaX,
        deltaY,
        distance: touchData.distance,
        angle: Math.atan2(deltaY, deltaX) * 180 / Math.PI
      };
    }
    return null;
  }

  /**
   * Handle gesture
   */
  handleGesture(gestureName, gestureData, touchData) {
    // Create custom event
    const gestureEvent = new CustomEvent(`gesture:${gestureName}`, {
      detail: {
        gesture: gestureData,
        touch: touchData,
        target: touchData.target
      },
      bubbles: true,
      cancelable: true
    });

    // Dispatch event
    touchData.target.dispatchEvent(gestureEvent);

    // Built-in gesture handling
    this.handleBuiltInGesture(gestureName, gestureData, touchData);

    if (this.options.debug) {
      console.log(`👆 Gesture recognized: ${gestureName}`, gestureData);
    }
  }

  /**
   * Handle built-in gesture behaviors
   */
  handleBuiltInGesture(gestureName, gestureData, touchData) {
    const target = touchData.target;
    
    switch (gestureName) {
      case 'tap':
        this.handleTap(target, gestureData);
        break;
        
      case 'longpress':
        this.handleLongPress(touchData);
        break;
        
      case 'swipe':
        this.handleSwipe(target, gestureData);
        break;
        
      case 'pan':
        this.handlePan(target, gestureData);
        break;
    }
  }

  /**
   * Handle tap gesture
   */
  handleTap(target, gestureData) {
    // Trigger haptic feedback
    this.triggerHapticFeedback('light');
    
    // Handle button-like elements
    if (this.isInteractiveElement(target)) {
      target.click();
    }
  }

  /**
   * Handle long press gesture
   */
  handleLongPress(touchData) {
    // Trigger haptic feedback
    this.triggerHapticFeedback('medium');
    
    const target = touchData.target;
    
    // Show context menu for elements with data-context-menu
    if (target.dataset.contextMenu) {
      this.showContextMenu(target, touchData.startX, touchData.startY);
    }
    
    // Handle long press actions
    const longPressAction = target.dataset.longPress;
    if (longPressAction) {
      this.executeLongPressAction(longPressAction, target);
    }
  }

  /**
   * Handle swipe gesture
   */
  handleSwipe(target, gestureData) {
    // Trigger haptic feedback
    this.triggerHapticFeedback('light');
    
    // Handle swipe actions
    const swipeAction = target.closest('[data-swipe]')?.dataset.swipe;
    if (swipeAction) {
      this.executeSwipeAction(swipeAction, gestureData.direction, target);
    }
  }

  /**
   * Setup haptic feedback
   */
  setupHapticFeedback() {
    // Check for haptic feedback support
    this.hasHapticFeedback = 'vibrate' in navigator;
    
    if (this.options.debug && !this.hasHapticFeedback) {
      console.log('Haptic feedback not supported');
    }
  }

  /**
   * Trigger haptic feedback
   */
  triggerHapticFeedback(intensity = 'light') {
    if (!this.hasHapticFeedback || !this.options.hapticFeedback) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [40],
      double: [20, 50, 20],
      success: [10, 50, 10],
      error: [100, 50, 100, 50, 100]
    };
    
    const pattern = patterns[intensity] || patterns.light;
    navigator.vibrate(pattern);
  }

  /**
   * Setup touch ripples
   */
  setupTouchRipples() {
    // Add ripple styles
    this.addRippleStyles();
    
    // Auto-add ripples to interactive elements
    this.autoAddRipples();
  }

  /**
   * Add ripple styles
   */
  addRippleStyles() {
    if (document.getElementById('touch-ripple-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'touch-ripple-styles';
    style.textContent = `
      .touch-ripple {
        position: relative;
        overflow: hidden;
      }
      
      .touch-ripple::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: translate(-50%, -50%);
        pointer-events: none;
        opacity: 0;
        transition: width 0.6s ease, height 0.6s ease, opacity 0.6s ease;
      }
      
      .touch-ripple.ripple-active::before {
        width: 200px;
        height: 200px;
        opacity: 1;
      }
      
      .touch-ripple.ripple-fade::before {
        opacity: 0;
      }
      
      /* Dark theme ripples */
      @media (prefers-color-scheme: dark) {
        .touch-ripple::before {
          background: rgba(255, 255, 255, 0.1);
        }
      }
      
      /* Custom ripple colors */
      .touch-ripple-primary::before {
        background: rgba(59, 130, 246, 0.3);
      }
      
      .touch-ripple-success::before {
        background: rgba(34, 197, 94, 0.3);
      }
      
      .touch-ripple-danger::before {
        background: rgba(239, 68, 68, 0.3);
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Auto-add ripples to interactive elements
   */
  autoAddRipples() {
    const selectors = [
      'button:not([data-no-ripple])',
      '.btn:not([data-no-ripple])',
      '[role="button"]:not([data-no-ripple])',
      '.card:not([data-no-ripple])',
      '.list-item:not([data-no-ripple])'
    ];
    
    const elements = document.querySelectorAll(selectors.join(', '));
    elements.forEach(element => {
      this.addRippleToElement(element);
    });
    
    // Monitor for dynamically added elements
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            const newElements = node.matches && node.matches(selectors.join(', ')) 
              ? [node] 
              : Array.from(node.querySelectorAll ? node.querySelectorAll(selectors.join(', ')) : []);
            
            newElements.forEach(element => {
              this.addRippleToElement(element);
            });
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Add ripple to element
   */
  addRippleToElement(element) {
    if (this.rippleElements.has(element)) return;
    
    element.classList.add('touch-ripple');
    this.rippleElements.add(element);
  }

  /**
   * Create ripple effect
   */
  createRipple(target, x, y) {
    if (!this.options.touchRipples) return;
    
    const rippleElement = target.closest('.touch-ripple');
    if (!rippleElement) return;
    
    // Calculate ripple position relative to element
    const rect = rippleElement.getBoundingClientRect();
    const rippleX = x - rect.left;
    const rippleY = y - rect.top;
    
    // Set ripple position
    rippleElement.style.setProperty('--ripple-x', `${rippleX}px`);
    rippleElement.style.setProperty('--ripple-y', `${rippleY}px`);
    
    // Trigger ripple animation
    rippleElement.classList.add('ripple-active');
    
    // Remove ripple after animation
    setTimeout(() => {
      rippleElement.classList.add('ripple-fade');
      setTimeout(() => {
        rippleElement.classList.remove('ripple-active', 'ripple-fade');
      }, 300);
    }, 300);
  }

  /**
   * Setup drag and drop
   */
  setupDragAndDrop() {
    // Handle draggable elements
    document.addEventListener('touchstart', this.handleDragStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleDragMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleDragEnd.bind(this), { passive: false });
  }

  /**
   * Handle drag start
   */
  handleDragStart(event) {
    const target = event.target.closest('[draggable], [data-draggable]');
    if (!target) return;
    
    const touch = event.touches[0];
    const dragData = {
      element: target,
      startX: touch.clientX,
      startY: touch.clientY,
      offsetX: touch.clientX - target.getBoundingClientRect().left,
      offsetY: touch.clientY - target.getBoundingClientRect().top,
      originalTransform: target.style.transform,
      isDragging: false
    };
    
    this.currentDrag = dragData;
    
    // Add dragging class
    target.classList.add('dragging');
    
    // Trigger haptic feedback
    this.triggerHapticFeedback('medium');
    
    // Prevent default to avoid scrolling
    event.preventDefault();
  }

  /**
   * Handle drag move
   */
  handleDragMove(event) {
    if (!this.currentDrag) return;
    
    const touch = event.touches[0];
    const { element, startX, startY, offsetX, offsetY } = this.currentDrag;
    
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    
    // Check if we should start dragging
    if (!this.currentDrag.isDragging && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      this.currentDrag.isDragging = true;
      element.classList.add('is-dragging');
    }
    
    if (this.currentDrag.isDragging) {
      // Update element position
      element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      
      // Find drop target
      const dropTarget = this.findDropTarget(touch.clientX, touch.clientY, element);
      this.updateDropTarget(dropTarget);
    }
    
    event.preventDefault();
  }

  /**
   * Handle drag end
   */
  handleDragEnd(event) {
    if (!this.currentDrag) return;
    
    const { element } = this.currentDrag;
    const touch = event.changedTouches[0];
    
    // Find final drop target
    const dropTarget = this.findDropTarget(touch.clientX, touch.clientY, element);
    
    if (dropTarget && this.currentDrag.isDragging) {
      this.handleDrop(element, dropTarget);
    } else {
      // Animate back to original position
      this.animateToOriginalPosition(element);
    }
    
    // Cleanup
    element.classList.remove('dragging', 'is-dragging');
    this.clearDropTargets();
    this.currentDrag = null;
  }

  /**
   * Find drop target
   */
  findDropTarget(x, y, dragElement) {
    // Temporarily hide drag element to get element underneath
    dragElement.style.pointerEvents = 'none';
    const elementBelow = document.elementFromPoint(x, y);
    dragElement.style.pointerEvents = '';
    
    // Find droppable target
    return elementBelow ? elementBelow.closest('[data-droppable], .droppable') : null;
  }

  /**
   * Setup mouse fallback for non-touch devices
   */
  setupMouseFallback() {
    // Map mouse events to touch events
    document.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  /**
   * Handle mouse down (touch start fallback)
   */
  handleMouseDown(event) {
    const touch = {
      identifier: 0,
      clientX: event.clientX,
      clientY: event.clientY
    };
    
    this.handleTouchStart({
      touches: [touch],
      changedTouches: [touch],
      preventDefault: () => event.preventDefault()
    });
  }

  /**
   * Utility methods
   */
  calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  isInteractiveElement(element) {
    const interactiveTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'];
    const interactiveRoles = ['button', 'link', 'tab', 'menuitem'];
    
    return interactiveTags.includes(element.tagName) ||
           interactiveRoles.includes(element.getAttribute('role')) ||
           element.hasAttribute('onclick') ||
           element.classList.contains('btn') ||
           element.hasAttribute('tabindex');
  }

  /**
   * Get touch interaction metrics
   */
  getMetrics() {
    return {
      activeTouches: this.touchPoints.size,
      activeGestures: this.activeGestures.size,
      hasHapticFeedback: this.hasHapticFeedback,
      gestureHandlers: Array.from(this.gestureHandlers.keys())
    };
  }

  /**
   * Add custom gesture recognizer
   */
  addGestureRecognizer(name, recognizer) {
    this.registerGesture(name, recognizer);
  }

  /**
   * Remove gesture recognizer
   */
  removeGestureRecognizer(name) {
    this.gestureHandlers.delete(name);
  }

  /**
   * Enable/disable haptic feedback
   */
  setHapticFeedback(enabled) {
    this.options.hapticFeedback = enabled;
  }

  /**
   * Enable/disable touch ripples
   */
  setTouchRipples(enabled) {
    this.options.touchRipples = enabled;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Clear all touch points and gestures
    this.touchPoints.clear();
    this.activeGestures.clear();
    this.gestureHandlers.clear();
    
    // Remove ripple elements
    this.rippleElements = new WeakSet();
    
    // Remove styles
    const rippleStyles = document.getElementById('touch-ripple-styles');
    if (rippleStyles) {
      rippleStyles.remove();
    }
    
    console.log('👆 TouchInteractions destroyed');
  }
}

// Create global touch interactions instance
export const touchInteractions = new TouchInteractions({
  debug: process.env.NODE_ENV !== 'production'
});