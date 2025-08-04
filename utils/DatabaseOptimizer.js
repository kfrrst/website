/**
 * Database Optimization Utility
 * Provides tools for monitoring and optimizing database performance
 */
export class DatabaseOptimizer {
  constructor(dbConnection, options = {}) {
    this.db = dbConnection;
    this.options = {
      slowQueryThreshold: options.slowQueryThreshold || 1000, // 1 second
      enableQueryLogging: options.enableQueryLogging !== false,
      enableMetrics: options.enableMetrics !== false,
      vacuumInterval: options.vacuumInterval || 86400000, // 24 hours
      analyzeInterval: options.analyzeInterval || 3600000, // 1 hour
      ...options
    };

    this.metrics = {
      totalQueries: 0,
      slowQueries: 0,
      averageQueryTime: 0,
      queryTimes: [],
      connectionPoolStats: {},
      cacheHitRatio: 0
    };

    this.queryCache = new Map();
    this.preparedStatements = new Map();

    if (this.options.enableMetrics) {
      this.startMetricsCollection();
    }
  }

  /**
   * Execute optimized query with caching and monitoring
   */
  async executeQuery(sql, params = [], options = {}) {
    const startTime = performance.now();
    const queryKey = this.generateQueryKey(sql, params);
    
    try {
      // Check cache first (for SELECT queries)
      if (sql.trim().toUpperCase().startsWith('SELECT') && options.cache !== false) {
        const cached = this.queryCache.get(queryKey);
        if (cached && Date.now() - cached.timestamp < (options.cacheTTL || 300000)) {
          this.metrics.cacheHitRatio = 
            (this.metrics.cacheHitRatio * this.metrics.totalQueries + 1) / 
            (this.metrics.totalQueries + 1);
          return cached.result;
        }
      }

      // Use prepared statement if available
      let result;
      if (options.usePrepared !== false && this.preparedStatements.has(sql)) {
        const prepared = this.preparedStatements.get(sql);
        result = await prepared.execute(params);
      } else {
        result = await this.db.query(sql, params);
        
        // Cache prepared statement for reuse
        if (options.prepare === true) {
          const prepared = await this.db.prepare(sql);
          this.preparedStatements.set(sql, prepared);
        }
      }

      const executionTime = performance.now() - startTime;
      this.recordQueryMetrics(sql, executionTime, params);

      // Cache SELECT results
      if (sql.trim().toUpperCase().startsWith('SELECT') && options.cache !== false) {
        this.queryCache.set(queryKey, {
          result,
          timestamp: Date.now()
        });
      }

      return result;

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordQueryError(sql, error, executionTime, params);
      throw error;
    }
  }

  /**
   * Execute batch operations with transaction
   */
  async executeBatch(operations, options = {}) {
    const startTime = performance.now();
    
    try {
      await this.db.query('BEGIN');
      
      const results = [];
      for (const { sql, params } of operations) {
        const result = await this.executeQuery(sql, params, { 
          cache: false, 
          ...options 
        });
        results.push(result);
      }
      
      await this.db.query('COMMIT');
      
      const executionTime = performance.now() - startTime;
      console.log(`Batch operation completed in ${executionTime.toFixed(2)}ms (${operations.length} operations)`);
      
      return results;
      
    } catch (error) {
      await this.db.query('ROLLBACK');
      console.error('Batch operation failed, rolled back:', error);
      throw error;
    }
  }

  /**
   * Optimize table with VACUUM and ANALYZE
   */
  async optimizeTable(tableName) {
    try {
      console.log(`Optimizing table: ${tableName}`);
      
      // PostgreSQL optimization
      if (this.db.client?.config?.client === 'postgresql') {
        await this.db.query(`VACUUM ANALYZE ${tableName}`);
      }
      // MySQL optimization  
      else if (this.db.client?.config?.client === 'mysql') {
        await this.db.query(`OPTIMIZE TABLE ${tableName}`);
        await this.db.query(`ANALYZE TABLE ${tableName}`);
      }
      // SQLite optimization
      else if (this.db.client?.config?.client === 'sqlite3') {
        await this.db.query(`VACUUM`);
        await this.db.query(`ANALYZE ${tableName}`);
      }
      
      console.log(`✅ Table ${tableName} optimized`);
      
    } catch (error) {
      console.error(`Failed to optimize table ${tableName}:`, error);
    }
  }

  /**
   * Get query execution plan
   */
  async getExecutionPlan(sql, params = []) {
    try {
      // PostgreSQL
      if (this.db.client?.config?.client === 'postgresql') {
        const result = await this.db.query(`EXPLAIN ANALYZE ${sql}`, params);
        return result.rows;
      }
      // MySQL
      else if (this.db.client?.config?.client === 'mysql') {
        const result = await this.db.query(`EXPLAIN ${sql}`, params);
        return result[0];
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get execution plan:', error);
      return null;
    }
  }

  /**
   * Analyze query performance and suggest optimizations
   */
  async analyzeQuery(sql, params = []) {
    const suggestions = [];
    
    try {
      const plan = await this.getExecutionPlan(sql, params);
      
      if (plan) {
        // Analyze execution plan for common issues
        const planText = JSON.stringify(plan).toLowerCase();
        
        if (planText.includes('seq scan') || planText.includes('table scan')) {
          suggestions.push({
            type: 'index',
            message: 'Query is using sequential scan. Consider adding indexes.',
            priority: 'high'
          });
        }
        
        if (planText.includes('nested loop')) {
          suggestions.push({
            type: 'join',
            message: 'Nested loop detected. Consider optimizing JOIN conditions.',
            priority: 'medium'
          });
        }
        
        if (planText.includes('sort') && planText.includes('disk')) {
          suggestions.push({
            type: 'memory',
            message: 'Sort operation spilling to disk. Consider increasing work_mem.',
            priority: 'medium'
          });
        }
      }
      
      // Analyze SQL structure
      const sqlUpper = sql.toUpperCase();
      
      if (sqlUpper.includes('SELECT *')) {
        suggestions.push({
          type: 'columns',
          message: 'Avoid SELECT *. Specify only needed columns.',
          priority: 'low'
        });
      }
      
      if (sqlUpper.includes('LIKE \'%') && !sqlUpper.includes('ILIKE')) {
        suggestions.push({
          type: 'search',
          message: 'Leading wildcard in LIKE prevents index usage. Consider full-text search.',
          priority: 'medium'
        });
      }
      
      if (!sqlUpper.includes('LIMIT') && sqlUpper.startsWith('SELECT')) {
        suggestions.push({
          type: 'pagination',
          message: 'Consider adding LIMIT to prevent large result sets.',
          priority: 'low'
        });
      }
      
    } catch (error) {
      console.error('Query analysis failed:', error);
    }
    
    return {
      query: sql,
      suggestions,
      executionPlan: plan
    };
  }

  /**
   * Monitor database health
   */
  async checkDatabaseHealth() {
    const health = {
      status: 'healthy',
      checks: [],
      metrics: { ...this.metrics },
      recommendations: []
    };

    try {
      // Check connection
      await this.db.query('SELECT 1');
      health.checks.push({ name: 'connection', status: 'ok' });

      // Check slow queries
      if (this.metrics.slowQueries > this.metrics.totalQueries * 0.1) {
        health.status = 'warning';
        health.recommendations.push('High number of slow queries detected. Review query performance.');
      }

      // Check cache hit ratio
      if (this.metrics.cacheHitRatio < 0.8) {
        health.recommendations.push('Query cache hit ratio is low. Consider optimizing caching strategy.');
      }

      // Database-specific checks
      if (this.db.client?.config?.client === 'postgresql') {
        await this.checkPostgreSQLHealth(health);
      } else if (this.db.client?.config?.client === 'mysql') {
        await this.checkMySQLHealth(health);
      }

    } catch (error) {
      health.status = 'error';
      health.checks.push({ name: 'connection', status: 'error', error: error.message });
    }

    return health;
  }

  /**
   * Check PostgreSQL specific health metrics
   */
  async checkPostgreSQLHealth(health) {
    try {
      // Check database size
      const sizeResult = await this.db.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      health.metrics.databaseSize = sizeResult.rows[0]?.size;

      // Check active connections
      const connectionsResult = await this.db.query(`
        SELECT count(*) as active_connections 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `);
      health.metrics.activeConnections = parseInt(connectionsResult.rows[0]?.active_connections || 0);

      // Check for long-running queries
      const longQueriesResult = await this.db.query(`
        SELECT count(*) as long_queries
        FROM pg_stat_activity 
        WHERE state = 'active' 
        AND query_start < now() - interval '30 seconds'
        AND query NOT LIKE '%pg_stat_activity%'
      `);
      
      const longQueries = parseInt(longQueriesResult.rows[0]?.long_queries || 0);
      if (longQueries > 0) {
        health.status = 'warning';
        health.recommendations.push(`${longQueries} long-running queries detected`);
      }

    } catch (error) {
      console.error('PostgreSQL health check failed:', error);
    }
  }

  /**
   * Check MySQL specific health metrics
   */
  async checkMySQLHealth(health) {
    try {
      // Check processlist for long queries
      const processResult = await this.db.query(`
        SELECT COUNT(*) as long_queries
        FROM information_schema.processlist 
        WHERE command != 'Sleep' 
        AND time > 30
      `);
      
      const longQueries = parseInt(processResult[0]?.long_queries || 0);
      if (longQueries > 0) {
        health.status = 'warning';
        health.recommendations.push(`${longQueries} long-running queries detected`);
      }

    } catch (error) {
      console.error('MySQL health check failed:', error);
    }
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: { ...this.metrics },
      topSlowQueries: this.getTopSlowQueries(10),
      recommendations: this.generateRecommendations(),
      cacheStats: {
        size: this.queryCache.size,
        hitRatio: this.metrics.cacheHitRatio
      }
    };

    return report;
  }

  /**
   * Start periodic optimization tasks
   */
  startPeriodicOptimization() {
    // Vacuum and analyze tables periodically
    setInterval(() => {
      this.optimizeAllTables();
    }, this.options.vacuumInterval);

    // Clear query cache periodically
    setInterval(() => {
      this.clearQueryCache();
    }, this.options.analyzeInterval);

    console.log('Periodic database optimization started');
  }

  /**
   * Record query metrics
   */
  recordQueryMetrics(sql, executionTime, params) {
    this.metrics.totalQueries++;
    this.metrics.queryTimes.push(executionTime);
    
    // Keep only last 1000 query times for average calculation
    if (this.metrics.queryTimes.length > 1000) {
      this.metrics.queryTimes = this.metrics.queryTimes.slice(-1000);
    }
    
    this.metrics.averageQueryTime = 
      this.metrics.queryTimes.reduce((a, b) => a + b, 0) / 
      this.metrics.queryTimes.length;

    if (executionTime > this.options.slowQueryThreshold) {
      this.metrics.slowQueries++;
      
      if (this.options.enableQueryLogging) {
        console.warn(`Slow query detected (${executionTime.toFixed(2)}ms):`, {
          sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
          params,
          executionTime
        });
      }
    }
  }

  /**
   * Record query error
   */
  recordQueryError(sql, error, executionTime, params) {
    console.error('Query failed:', {
      sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
      params,
      error: error.message,
      executionTime
    });
  }

  /**
   * Generate query key for caching
   */
  generateQueryKey(sql, params) {
    return `${sql}:${JSON.stringify(params)}`;
  }

  /**
   * Clear query cache
   */
  clearQueryCache() {
    const size = this.queryCache.size;
    this.queryCache.clear();
    console.log(`Query cache cleared (${size} entries)`);
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    setInterval(() => {
      // Could integrate with monitoring systems here
      const report = this.generatePerformanceReport();
      console.log('Database performance metrics:', {
        totalQueries: report.metrics.totalQueries,
        averageQueryTime: `${report.metrics.averageQueryTime.toFixed(2)}ms`,
        slowQueries: report.metrics.slowQueries,
        cacheHitRatio: `${(report.metrics.cacheHitRatio * 100).toFixed(1)}%`
      });
    }, 300000); // Every 5 minutes
  }

  /**
   * Get top slow queries
   */
  getTopSlowQueries(limit = 10) {
    // This would require query logging to be implemented
    return [];
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.metrics.slowQueries > this.metrics.totalQueries * 0.05) {
      recommendations.push('Consider adding database indexes for slow queries');
    }

    if (this.metrics.cacheHitRatio < 0.9) {
      recommendations.push('Query cache hit ratio could be improved');
    }

    if (this.metrics.averageQueryTime > 100) {
      recommendations.push('Average query time is high, review query optimization');
    }

    return recommendations;
  }

  /**
   * Optimize all tables
   */
  async optimizeAllTables() {
    const tables = [
      'users', 'clients', 'projects', 'invoices', 
      'messages', 'conversations', 'files', 
      'sessions', 'admin_sessions', 'activity_logs'
    ];

    for (const table of tables) {
      await this.optimizeTable(table);
    }
  }
}

// Export singleton instance
export const dbOptimizer = new DatabaseOptimizer(null, {
  slowQueryThreshold: 1000,
  enableQueryLogging: process.env.NODE_ENV !== 'production',
  enableMetrics: true
});