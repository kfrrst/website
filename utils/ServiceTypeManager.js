/**
 * Service Type Manager
 * Handles all service type operations and phase resolution
 */

import { query } from '../config/database.js';

class ServiceTypeManager {
  constructor() {
    this.serviceTypes = null;
    this.phaseLibrary = null;
    this.lastFetch = null;
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get all service types from database (with caching)
   */
  async getServiceTypes() {
    // Check cache
    if (this.serviceTypes && this.lastFetch && 
        Date.now() - this.lastFetch < this.cacheDuration) {
      return this.serviceTypes;
    }

    try {
      const result = await query(`
        SELECT * FROM service_types 
        WHERE is_active = true 
        ORDER BY sort_order ASC
      `);
      
      this.serviceTypes = result.rows;
      this.lastFetch = Date.now();
      return this.serviceTypes;
    } catch (error) {
      console.error('Error fetching service types:', error);
      throw error;
    }
  }

  /**
   * Get service type by code
   */
  async getServiceByCode(code) {
    const services = await this.getServiceTypes();
    return services.find(s => s.code === code);
  }

  /**
   * Get all phases from the phase library
   */
  async getPhaseLibrary() {
    if (this.phaseLibrary && this.lastFetch && 
        Date.now() - this.lastFetch < this.cacheDuration) {
      return this.phaseLibrary;
    }

    try {
      const result = await query(`
        SELECT * FROM phase_library 
        ORDER BY sort_order ASC
      `);
      
      this.phaseLibrary = result.rows;
      return this.phaseLibrary;
    } catch (error) {
      console.error('Error fetching phase library:', error);
      throw error;
    }
  }

  /**
   * Get phase by key
   */
  async getPhaseByKey(key) {
    const phases = await this.getPhaseLibrary();
    return phases.find(p => p.key === key);
  }

  /**
   * Get applicable phases for a project based on its services
   */
  async getProjectPhases(services) {
    if (!services || !Array.isArray(services) || services.length === 0) {
      throw new Error('Services array is required');
    }

    const serviceTypes = await this.getServiceTypes();
    const phaseSet = new Set();
    
    // Collect all phases from each service
    services.forEach(serviceCode => {
      const service = serviceTypes.find(s => s.code === serviceCode);
      if (service && service.default_phase_keys) {
        service.default_phase_keys.forEach(phaseKey => {
          phaseSet.add(phaseKey);
        });
      }
    });

    // Always include ONB and WRAP
    phaseSet.add('ONB');
    phaseSet.add('WRAP');

    // Convert to array and get full phase details
    const phaseKeys = Array.from(phaseSet);
    const phaseLibrary = await this.getPhaseLibrary();
    
    // Map phase keys to full phase objects and sort
    const phases = phaseKeys
      .map(key => phaseLibrary.find(p => p.key === key))
      .filter(Boolean)
      .sort((a, b) => a.sort_order - b.sort_order);

    return phases;
  }

  /**
   * Get form modules for a specific phase and services
   */
  async getPhaseFormModules(phaseKey, services) {
    try {
      const result = await query(`
        SELECT fm.* 
        FROM form_modules fm
        WHERE fm.is_active = true
          AND ($1 = ANY(fm.phase_filters) OR fm.phase_filters IS NULL)
          AND (fm.service_filters && $2 OR fm.service_filters IS NULL)
        ORDER BY fm.name
      `, [phaseKey, services]);

      return result.rows;
    } catch (error) {
      console.error('Error fetching form modules:', error);
      throw error;
    }
  }

  /**
   * Get document modules for a specific phase and services
   */
  async getPhaseDocumentModules(phaseKey, services) {
    try {
      const result = await query(`
        SELECT dm.* 
        FROM document_modules dm
        WHERE dm.is_active = true
          AND ($1 = ANY(dm.phase_filters) OR dm.phase_filters IS NULL)
          AND (dm.service_filters && $2 OR dm.service_filters IS NULL)
        ORDER BY dm.name
      `, [phaseKey, services]);

      return result.rows;
    } catch (error) {
      console.error('Error fetching document modules:', error);
      throw error;
    }
  }

  /**
   * Build complete phase definition for a project
   */
  async buildProjectPhaseDefinition(services) {
    const phases = await this.getProjectPhases(services);
    const phaseDefinition = {
      services,
      phases: [],
      generatedAt: new Date().toISOString()
    };

    // Build detailed phase info
    for (const phase of phases) {
      const formModules = await this.getPhaseFormModules(phase.key, services);
      const docModules = await this.getPhaseDocumentModules(phase.key, services);

      phaseDefinition.phases.push({
        key: phase.key,
        label: phase.label,
        description: phase.description,
        icon: phase.icon,
        ui_components: phase.ui_components || [],
        form_modules: formModules.map(fm => ({
          id: fm.module_id,
          name: fm.name,
          schema: fm.schema,
          ui_schema: fm.ui_schema
        })),
        doc_modules: docModules.map(dm => ({
          id: dm.module_id,
          name: dm.name,
          template_type: dm.template_type
        })),
        permissions: phase.permissions || {},
        sort_order: phase.sort_order
      });
    }

    return phaseDefinition;
  }

  /**
   * Create or update a project's phase definition
   */
  async updateProjectPhaseDefinition(projectId, services) {
    const phaseDefinition = await this.buildProjectPhaseDefinition(services);
    
    try {
      await query(`
        UPDATE projects 
        SET 
          services = $1,
          phase_definition = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [services, phaseDefinition, projectId]);

      return phaseDefinition;
    } catch (error) {
      console.error('Error updating project phase definition:', error);
      throw error;
    }
  }

  /**
   * Get service permissions for a role
   */
  async getServicePermissions(serviceType, role) {
    try {
      const result = await query(`
        SELECT * FROM service_permissions
        WHERE service_type = $1 AND role = $2
      `, [serviceType, role]);

      return result.rows;
    } catch (error) {
      console.error('Error fetching service permissions:', error);
      throw error;
    }
  }

  /**
   * Clear cache (useful after updates)
   */
  clearCache() {
    this.serviceTypes = null;
    this.phaseLibrary = null;
    this.lastFetch = null;
  }
}

// Export singleton instance
export default new ServiceTypeManager();