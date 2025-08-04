/**
 * Comprehensive Caching Manager
 * Provides multiple caching strategies for improved performance
 */
export class CacheManager {
  constructor(options = {}) {
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes
    this.maxSize = options.maxSize || 100; // Maximum number of cached items
    this.memoryCache = new Map();
    this.compressionEnabled = options.compression !== false;
    this.debugMode = options.debug || false;
    
    // Performance metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      compressionSavings: 0
    };

    // Setup cleanup interval
    this.setupCleanupInterval();
    
    // Storage adapters
    this.storageAdapters = {
      memory: this.memoryCache,
      localStorage: this.createLocalStorageAdapter(),
      sessionStorage: this.createSessionStorageAdapter(),
      indexedDB: null // Will be initialized if needed
    };

    if (this.debugMode) {
      console.log('🗄️ CacheManager initialized with options:', options);
    }
  }

  /**
   * Get cached data with multiple fallback strategies
   */
  async get(key, options = {}) {
    const cacheKey = this.generateKey(key, options.namespace);
    const storage = options.storage || 'memory';
    
    try {
      // Try primary storage first
      let cached = await this.getFromStorage(cacheKey, storage);
      
      // Fallback to other storage types if not found
      if (!cached && storage !== 'memory') {
        cached = await this.getFromStorage(cacheKey, 'memory');
      }
      
      if (!cached && storage !== 'localStorage') {
        cached = await this.getFromStorage(cacheKey, 'localStorage');
      }

      if (cached) {
        // Check if expired
        if (this.isExpired(cached)) {
          await this.delete(key, options);
          this.metrics.misses++;
          return null;
        }

        // Decompress if needed
        const data = await this.decompress(cached.data);
        this.metrics.hits++;
        
        if (this.debugMode) {
          console.log(`🎯 Cache HIT for ${cacheKey}`);
        }
        
        return data;
      }

      this.metrics.misses++;
      if (this.debugMode) {
        console.log(`❌ Cache MISS for ${cacheKey}`);
      }
      
      return null;
      
    } catch (error) {
      console.error('Cache get error:', error);
      this.metrics.misses++;
      return null;
    }
  }

  /**
   * Set cached data with automatic compression and TTL
   */
  async set(key, data, options = {}) {
    const cacheKey = this.generateKey(key, options.namespace);
    const ttl = options.ttl || this.defaultTTL;
    const storage = options.storage || 'memory';
    
    try {
      // Compress data if enabled
      const compressedData = await this.compress(data);
      
      const cacheEntry = {
        data: compressedData.data,
        compressed: compressedData.compressed,
        timestamp: Date.now(),
        ttl: ttl,
        expiresAt: Date.now() + ttl,
        size: this.calculateSize(data),
        compressedSize: this.calculateSize(compressedData.data)
      };

      // Track compression savings
      if (compressedData.compressed) {
        this.metrics.compressionSavings += cacheEntry.size - cacheEntry.compressedSize;
      }

      // Store in primary storage
      await this.setInStorage(cacheKey, cacheEntry, storage);
      
      // Also store in memory for fast access (if not already memory storage)
      if (storage !== 'memory') {
        await this.setInStorage(cacheKey, cacheEntry, 'memory');
      }

      this.metrics.sets++;
      
      // Enforce size limits
      await this.enforceSizeLimit(storage);
      
      if (this.debugMode) {
        console.log(`💾 Cache SET for ${cacheKey} (${storage}), TTL: ${ttl}ms`);
      }
      
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Get or set pattern - fetch if not cached
   */
  async getOrSet(key, fetchFunction, options = {}) {
    const cached = await this.get(key, options);
    
    if (cached !== null) {
      return cached;
    }

    try {
      const data = await fetchFunction();
      await this.set(key, data, options);
      return data;
    } catch (error) {
      console.error('Cache getOrSet fetch error:', error);
      throw error;
    }
  }

  /**
   * Delete cached item
   */
  async delete(key, options = {}) {
    const cacheKey = this.generateKey(key, options.namespace);
    
    try {
      // Remove from all storages
      for (const storageType of Object.keys(this.storageAdapters)) {
        await this.deleteFromStorage(cacheKey, storageType);
      }
      
      if (this.debugMode) {
        console.log(`🗑️ Cache DELETE for ${cacheKey}`);
      }
      
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Clear cache by namespace or pattern
   */
  async clear(options = {}) {
    const namespace = options.namespace;
    const pattern = options.pattern;
    
    try {
      if (namespace || pattern) {
        // Clear specific keys
        for (const storageType of Object.keys(this.storageAdapters)) {
          await this.clearByPattern(storageType, namespace, pattern);
        }
      } else {
        // Clear everything
        for (const storageType of Object.keys(this.storageAdapters)) {
          await this.clearStorage(storageType);
        }
      }
      
      if (this.debugMode) {
        console.log(`🧹 Cache CLEAR (namespace: ${namespace}, pattern: ${pattern})`);
      }
      
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Clear cache keys by pattern for a specific storage type
   */
  async clearByPattern(storageType, namespace, pattern) {
    const storage = this.storageAdapters[storageType];
    if (!storage) return;

    try {
      if (storageType === 'memory') {
        // Clear memory cache by pattern
        const keysToDelete = [];
        for (const [key] of this.memoryCache) {
          if (this.matchesPattern(key, namespace, pattern)) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach(key => this.memoryCache.delete(key));
      } else if (storageType === 'localStorage' || storageType === 'sessionStorage') {
        // Clear browser storage by pattern
        const keys = Object.keys(storage);
        keys.forEach(key => {
          if (this.matchesPattern(key, namespace, pattern)) {
            storage.removeItem(key);
          }
        });
      }
    } catch (error) {
      if (this.debugMode) {
        console.error(`Error clearing ${storageType} by pattern:`, error);
      }
    }
  }

  /**
   * Check if a key matches the namespace/pattern criteria
   */
  matchesPattern(key, namespace, pattern) {
    if (namespace && !key.startsWith(`${namespace}:`)) {
      return false;
    }
    if (pattern && !key.includes(pattern)) {
      return false;
    }
    return true;
  }

  /**
   * Invalidate cache entries by tags
   */
  async invalidate(tags = []) {
    if (!Array.isArray(tags)) {
      tags = [tags];
    }
    
    try {
      for (const storageType of Object.keys(this.storageAdapters)) {
        await this.invalidateByTags(storageType, tags);
      }
      
      if (this.debugMode) {
        console.log(`🚫 Cache INVALIDATE tags: ${tags.join(', ')}`);
      }
      
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.metrics.hits + this.metrics.misses > 0 
      ? (this.metrics.hits / (this.metrics.hits + this.metrics.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.metrics,
      hitRate: `${hitRate}%`,
      memorySize: this.memoryCache.size,
      compressionSavings: `${this.formatBytes(this.metrics.compressionSavings)} saved`
    };
  }

  /**
   * Warm up cache with data
   */
  async warmUp(warmUpData = []) {
    if (this.debugMode) {
      console.log('🔥 Starting cache warm-up...');
    }
    
    const promises = warmUpData.map(async ({ key, fetchFunction, options = {} }) => {
      try {
        const data = await fetchFunction();
        await this.set(key, data, options);
      } catch (error) {
        console.error(`Warm-up failed for ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
    
    if (this.debugMode) {
      console.log(`✅ Cache warm-up completed (${warmUpData.length} items)`);
    }
  }

  /**
   * Generate cache key
   */
  generateKey(key, namespace = 'default') {
    return `${namespace}:${key}`;
  }

  /**
   * Check if cache entry is expired
   */
  isExpired(cacheEntry) {
    return Date.now() > cacheEntry.expiresAt;
  }

  /**
   * Compress data
   */
  async compress(data) {
    if (!this.compressionEnabled) {
      return { data, compressed: false };
    }

    try {
      const jsonString = JSON.stringify(data);
      
      // Only compress if data is large enough to benefit
      if (jsonString.length < 1000) {
        return { data, compressed: false };
      }

      // Simple compression using browser's built-in compression
      if ('CompressionStream' in window) {
        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        await writer.write(new TextEncoder().encode(jsonString));
        await writer.close();
        
        const chunks = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }
        
        return {
          data: chunks,
          compressed: true
        };
      } else {
        // Fallback: no compression
        return { data, compressed: false };
      }
      
    } catch (error) {
      console.warn('Compression failed, storing uncompressed:', error);
      return { data, compressed: false };
    }
  }

  /**
   * Decompress data
   */
  async decompress(data, compressed = false) {
    if (!compressed) {
      return data;
    }

    try {
      if ('DecompressionStream' in window) {
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        // Write compressed data
        for (const chunk of data) {
          await writer.write(chunk);
        }
        await writer.close();
        
        // Read decompressed data
        const chunks = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }
        
        const decompressedString = new TextDecoder().decode(
          new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []))
        );
        
        return JSON.parse(decompressedString);
      } else {
        // Fallback: assume data is not compressed
        return data;
      }
      
    } catch (error) {
      console.error('Decompression failed:', error);
      return data;
    }
  }

  /**
   * Calculate data size in bytes
   */
  calculateSize(data) {
    return new Blob([JSON.stringify(data)]).size;
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get from storage adapter
   */
  async getFromStorage(key, storageType) {
    const adapter = this.storageAdapters[storageType];
    
    if (!adapter) return null;
    
    if (storageType === 'memory') {
      return adapter.get(key);
    } else {
      const item = adapter.getItem(key);
      return item ? JSON.parse(item) : null;
    }
  }

  /**
   * Set in storage adapter
   */
  async setInStorage(key, value, storageType) {
    const adapter = this.storageAdapters[storageType];
    
    if (!adapter) return;
    
    if (storageType === 'memory') {
      adapter.set(key, value);
    } else {
      try {
        adapter.setItem(key, JSON.stringify(value));
      } catch (error) {
        if (error.name === 'QuotaExceededError') {
          // Storage full, clear some old items
          await this.clearOldestItems(storageType, 10);
          try {
            adapter.setItem(key, JSON.stringify(value));
          } catch (retryError) {
            console.warn(`Storage ${storageType} still full after cleanup:`, retryError);
          }
        }
      }
    }
  }

  /**
   * Delete from storage adapter
   */
  async deleteFromStorage(key, storageType) {
    const adapter = this.storageAdapters[storageType];
    
    if (!adapter) return;
    
    if (storageType === 'memory') {
      adapter.delete(key);
    } else {
      adapter.removeItem(key);
    }
  }

  /**
   * Clear storage adapter
   */
  async clearStorage(storageType) {
    const adapter = this.storageAdapters[storageType];
    
    if (!adapter) return;
    
    if (storageType === 'memory') {
      adapter.clear();
    } else {
      // Clear only cache keys (preserve other app data)
      const keys = [];
      for (let i = 0; i < adapter.length; i++) {
        const key = adapter.key(i);
        if (key && key.includes(':')) { // Our cache keys have namespace
          keys.push(key);
        }
      }
      keys.forEach(key => adapter.removeItem(key));
    }
  }

  /**
   * Enforce size limits
   */
  async enforceSizeLimit(storageType) {
    if (storageType === 'memory' && this.memoryCache.size > this.maxSize) {
      const excess = this.memoryCache.size - this.maxSize;
      const oldestKeys = Array.from(this.memoryCache.keys()).slice(0, excess);
      
      oldestKeys.forEach(key => {
        this.memoryCache.delete(key);
        this.metrics.evictions++;
      });
    }
  }

  /**
   * Clear oldest items from storage
   */
  async clearOldestItems(storageType, count = 5) {
    const adapter = this.storageAdapters[storageType];
    if (!adapter || storageType === 'memory') return;

    const items = [];
    
    // Collect cache items with timestamps
    for (let i = 0; i < adapter.length; i++) {
      const key = adapter.key(i);
      if (key && key.includes(':')) {
        try {
          const item = JSON.parse(adapter.getItem(key));
          if (item && item.timestamp) {
            items.push({ key, timestamp: item.timestamp });
          }
        } catch (error) {
          // Invalid item, remove it
          adapter.removeItem(key);
        }
      }
    }

    // Sort by timestamp and remove oldest
    items.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = items.slice(0, count);
    
    toRemove.forEach(({ key }) => {
      adapter.removeItem(key);
      this.metrics.evictions++;
    });
  }

  /**
   * Setup cleanup interval for expired items
   */
  setupCleanupInterval() {
    setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Every minute
  }

  /**
   * Clean up expired items
   */
  async cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;

    // Clean memory cache
    for (const [key, value] of this.memoryCache.entries()) {
      if (value.expiresAt && now > value.expiresAt) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    // Clean localStorage and sessionStorage
    for (const storageType of ['localStorage', 'sessionStorage']) {
      const adapter = this.storageAdapters[storageType];
      if (!adapter) continue;

      const keysToRemove = [];
      
      for (let i = 0; i < adapter.length; i++) {
        const key = adapter.key(i);
        if (key && key.includes(':')) {
          try {
            const item = JSON.parse(adapter.getItem(key));
            if (item && item.expiresAt && now > item.expiresAt) {
              keysToRemove.push(key);
            }
          } catch (error) {
            // Invalid item, mark for removal
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach(key => {
        adapter.removeItem(key);
        cleaned++;
      });
    }

    if (this.debugMode && cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired cache items`);
    }
  }

  /**
   * Create localStorage adapter
   */
  createLocalStorageAdapter() {
    try {
      return {
        getItem: (key) => localStorage.getItem(key),
        setItem: (key, value) => localStorage.setItem(key, value),
        removeItem: (key) => localStorage.removeItem(key),
        get length() { return localStorage.length; },
        key: (index) => localStorage.key(index)
      };
    } catch (error) {
      console.warn('localStorage not available');
      return null;
    }
  }

  /**
   * Create sessionStorage adapter
   */
  createSessionStorageAdapter() {
    try {
      return {
        getItem: (key) => sessionStorage.getItem(key),
        setItem: (key, value) => sessionStorage.setItem(key, value),
        removeItem: (key) => sessionStorage.removeItem(key),
        get length() { return sessionStorage.length; },
        key: (index) => sessionStorage.key(index)
      };
    } catch (error) {
      console.warn('sessionStorage not available');
      return null;
    }
  }
}

// Create global cache manager instance
export const cacheManager = new CacheManager({
  defaultTTL: 300000, // 5 minutes
  maxSize: 200,
  compression: true,
  debug: false
});