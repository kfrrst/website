/**
 * Form Module System
 * Handles JSON Schema-based forms with composition and validation
 */

import { query } from '../config/database.js';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

class FormModuleSystem {
  constructor() {
    // Initialize AJV for JSON Schema validation
    this.ajv = new Ajv({ 
      allErrors: true, 
      verbose: true,
      strict: false 
    });
    addFormats(this.ajv);
    
    // Add custom formats
    this.ajv.addFormat('phone', /^\+?[1-9]\d{1,14}$/);
    this.ajv.addFormat('color', /^#[0-9A-F]{6}$/i);
    
    this.compiledSchemas = new Map();
  }

  /**
   * Get form module by ID
   */
  async getFormModule(moduleId) {
    try {
      const result = await query(`
        SELECT * FROM form_modules 
        WHERE module_id = $1 AND is_active = true
      `, [moduleId]);

      if (result.rows.length === 0) {
        throw new Error(`Form module ${moduleId} not found`);
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error fetching form module:', error);
      throw error;
    }
  }

  /**
   * Get multiple form modules
   */
  async getFormModules(moduleIds) {
    if (!moduleIds || moduleIds.length === 0) return [];

    try {
      const result = await query(`
        SELECT * FROM form_modules 
        WHERE module_id = ANY($1) AND is_active = true
        ORDER BY name
      `, [moduleIds]);

      return result.rows;
    } catch (error) {
      console.error('Error fetching form modules:', error);
      throw error;
    }
  }

  /**
   * Merge multiple JSON schemas into one
   */
  mergeSchemas(schemas) {
    const merged = {
      type: 'object',
      title: 'Project Information',
      properties: {},
      required: [],
      additionalProperties: false
    };

    schemas.forEach((schema, index) => {
      // If schema has a wrapper object, unwrap it
      const schemaObj = typeof schema === 'string' ? JSON.parse(schema) : schema;
      
      // Merge properties
      if (schemaObj.properties) {
        Object.assign(merged.properties, schemaObj.properties);
      }

      // Merge required fields
      if (schemaObj.required && Array.isArray(schemaObj.required)) {
        schemaObj.required.forEach(field => {
          if (!merged.required.includes(field)) {
            merged.required.push(field);
          }
        });
      }

      // Merge title (use first non-empty)
      if (schemaObj.title && !merged.title) {
        merged.title = schemaObj.title;
      }
    });

    return merged;
  }

  /**
   * Merge UI schemas (for form rendering hints)
   */
  mergeUISchemas(uiSchemas) {
    const merged = {};

    uiSchemas.forEach(uiSchema => {
      const uiObj = typeof uiSchema === 'string' ? JSON.parse(uiSchema) : uiSchema;
      Object.assign(merged, uiObj);
    });

    return merged;
  }

  /**
   * Build composite form schema for a phase
   */
  async buildCompositeSchema(phaseKey, projectServices, moduleIds = null) {
    try {
      let modules;
      
      if (moduleIds) {
        // Use specific module IDs if provided
        modules = await this.getFormModules(moduleIds);
      } else {
        // Get all applicable modules for the phase
        // For now, just get modules that match the phase key
        const result = await query(`
          SELECT fm.* 
          FROM form_modules fm
          WHERE fm.is_active = true
            AND $1 = ANY(fm.phase_filters)
          ORDER BY fm.name
        `, [phaseKey]);
        
        modules = result.rows;
      }

      if (modules.length === 0) {
        return {
          schema: { type: 'object', properties: {} },
          uiSchema: {},
          modules: []
        };
      }

      // Extract schemas and UI schemas
      const schemas = modules.map(m => m.schema);
      const uiSchemas = modules.map(m => m.ui_schema || {});

      // Merge them
      const mergedSchema = this.mergeSchemas(schemas);
      const mergedUISchema = this.mergeUISchemas(uiSchemas);

      return {
        schema: mergedSchema,
        uiSchema: mergedUISchema,
        modules: modules.map(m => ({
          id: m.module_id,
          name: m.name,
          description: m.description
        }))
      };
    } catch (error) {
      console.error('Error building composite schema:', error);
      throw error;
    }
  }

  /**
   * Validate form data against schema
   */
  validateFormData(schema, data) {
    // Get or compile validator
    const schemaStr = JSON.stringify(schema);
    let validate = this.compiledSchemas.get(schemaStr);
    
    if (!validate) {
      validate = this.ajv.compile(schema);
      this.compiledSchemas.set(schemaStr, validate);
    }

    const valid = validate(data);
    
    return {
      valid,
      errors: validate.errors || []
    };
  }

  /**
   * Save form data
   */
  async saveFormData(projectId, phaseKey, moduleId, data, userId) {
    try {
      // Validate the data first
      const module = await this.getFormModule(moduleId);
      const validation = this.validateFormData(module.schema, data);
      
      if (!validation.valid) {
        throw new Error(`Validation failed: ${JSON.stringify(validation.errors)}`);
      }

      // Save or update the form data
      const result = await query(`
        INSERT INTO forms_data (
          project_id, phase_key, module_id, payload, submitted_by
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (project_id, phase_key, module_id) 
        DO UPDATE SET 
          payload = $4,
          submitted_by = $5,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [projectId, phaseKey, moduleId, data, userId]);

      return result.rows[0];
    } catch (error) {
      console.error('Error saving form data:', error);
      throw error;
    }
  }

  /**
   * Get form data for a project phase
   */
  async getFormData(projectId, phaseKey, moduleId = null) {
    try {
      let queryStr = `
        SELECT fd.*, fm.name as module_name, fm.schema
        FROM forms_data fd
        JOIN form_modules fm ON fd.module_id = fm.module_id
        WHERE fd.project_id = $1 AND fd.phase_key = $2
      `;
      const params = [projectId, phaseKey];

      if (moduleId) {
        queryStr += ' AND fd.module_id = $3';
        params.push(moduleId);
      }

      const result = await query(queryStr, params);
      return result.rows;
    } catch (error) {
      console.error('Error fetching form data:', error);
      throw error;
    }
  }

  /**
   * Create a new form module
   */
  async createFormModule(moduleData) {
    const {
      module_id,
      name,
      description,
      schema,
      ui_schema = {},
      service_filters = null,
      phase_filters = null
    } = moduleData;

    try {
      // Validate the schema
      this.ajv.compile(schema); // This will throw if invalid

      const result = await query(`
        INSERT INTO form_modules (
          module_id, name, description, schema, ui_schema,
          service_filters, phase_filters
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        module_id, name, description, schema, ui_schema,
        service_filters, phase_filters
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating form module:', error);
      throw error;
    }
  }

  /**
   * Update form module (creates new version)
   */
  async updateFormModule(moduleId, updates) {
    try {
      // First, increment version of current module
      await query(`
        UPDATE form_modules 
        SET is_active = false 
        WHERE module_id = $1 AND is_active = true
      `, [moduleId]);

      // Get the latest version number
      const versionResult = await query(`
        SELECT MAX(version) as max_version 
        FROM form_modules 
        WHERE module_id = $1
      `, [moduleId]);

      const newVersion = (versionResult.rows[0].max_version || 0) + 1;

      // Create new version
      const result = await query(`
        INSERT INTO form_modules (
          module_id, name, description, schema, ui_schema,
          service_filters, phase_filters, version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        moduleId,
        updates.name,
        updates.description,
        updates.schema,
        updates.ui_schema,
        updates.service_filters,
        updates.phase_filters,
        newVersion
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error updating form module:', error);
      throw error;
    }
  }

  /**
   * Get form submission history
   */
  async getFormHistory(projectId, phaseKey = null) {
    try {
      let queryStr = `
        SELECT 
          fd.*,
          fm.name as module_name,
          u.first_name || ' ' || u.last_name as submitted_by_name
        FROM forms_data fd
        JOIN form_modules fm ON fd.module_id = fm.module_id
        JOIN users u ON fd.submitted_by = u.id
        WHERE fd.project_id = $1
      `;
      const params = [projectId];

      if (phaseKey) {
        queryStr += ' AND fd.phase_key = $2';
        params.push(phaseKey);
      }

      queryStr += ' ORDER BY fd.submitted_at DESC';

      const result = await query(queryStr, params);
      return result.rows;
    } catch (error) {
      console.error('Error fetching form history:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new FormModuleSystem();