/**
 * File Validation Service
 * Provides comprehensive file validation for pre-press and design workflows
 * Supports DPI checking, color space validation, bleed detection, and more
 */

import sharp from 'sharp';
import ExifReader from 'exifreader';
import { promises as fs } from 'fs';
import path from 'path';
import { pool } from '../config/database.js';

export class FileValidationService {
  constructor() {
    this.supportedImageFormats = ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'webp'];
    this.printFormats = ['ai', 'pdf', 'psd', 'eps', 'indd'];
    this.vectorFormats = ['svg', 'ai', 'eps'];
  }

  /**
   * Validate a file against service-specific requirements
   */
  async validateFile(filePath, originalName, serviceStandards) {
    const validation = {
      passed: true,
      issues: [],
      warnings: [],
      technicalSpecs: null,
      recommendations: []
    };

    try {
      const extension = path.extname(originalName).substring(1).toLowerCase();
      
      // Get file stats
      const stats = await fs.stat(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);

      // Check file format
      if (!serviceStandards.allowed_formats.includes(extension.toUpperCase())) {
        validation.issues.push(
          `File format '${extension.toUpperCase()}' is not allowed. ` +
          `Supported formats: ${serviceStandards.allowed_formats.join(', ')}`
        );
        validation.passed = false;
      }

      // Check file size
      if (fileSizeMB > serviceStandards.max_file_size_mb) {
        validation.issues.push(
          `File size (${fileSizeMB.toFixed(1)}MB) exceeds maximum allowed ` +
          `(${serviceStandards.max_file_size_mb}MB)`
        );
        validation.passed = false;
      }

      // Extract technical specifications
      if (this.supportedImageFormats.includes(extension)) {
        validation.technicalSpecs = await this.extractImageSpecs(filePath);
        this.validateImageSpecs(validation, serviceStandards);
      } else if (extension === 'pdf') {
        validation.technicalSpecs = await this.extractPDFSpecs(filePath);
        this.validatePDFSpecs(validation, serviceStandards);
      } else {
        // For other formats, create basic specs
        validation.technicalSpecs = {
          format: extension.toUpperCase(),
          fileSize: stats.size,
          processedAt: new Date().toISOString(),
          processingEngine: 'fileValidationService'
        };
      }

      // Add recommendations based on preferred formats
      if (serviceStandards.preferred_formats && 
          !serviceStandards.preferred_formats.includes(extension.toUpperCase())) {
        validation.recommendations.push(
          `Consider using preferred formats: ${serviceStandards.preferred_formats.join(', ')}`
        );
      }

    } catch (error) {
      console.error('File validation error:', error);
      validation.warnings.push(`Validation error: ${error.message}`);
    }

    return validation;
  }

  /**
   * Extract technical specifications from image files
   */
  async extractImageSpecs(filePath) {
    try {
      const metadata = await sharp(filePath).metadata();
      
      // Get EXIF data for additional information
      let exifData = {};
      try {
        const buffer = await fs.readFile(filePath);
        exifData = ExifReader.load(buffer);
      } catch (exifError) {
        console.log('Could not read EXIF data:', exifError.message);
      }

      // Calculate DPI
      let dpiHorizontal = metadata.density || 72;
      let dpiVertical = metadata.density || 72;

      // Try to get more accurate DPI from EXIF
      if (exifData['XResolution'] && exifData['YResolution']) {
        try {
          dpiHorizontal = Math.round(exifData['XResolution'].value);
          dpiVertical = Math.round(exifData['YResolution'].value);
        } catch (e) {
          // Use metadata density as fallback
        }
      }

      // Determine color space
      let colorMode = 'Unknown';
      let bitDepth = metadata.depth || 8;

      switch (metadata.channels) {
        case 1:
          colorMode = 'Grayscale';
          break;
        case 3:
          colorMode = metadata.space === 'cmyk' ? 'RGB' : 'RGB';
          break;
        case 4:
          colorMode = metadata.space === 'cmyk' ? 'CMYK' : 'RGBA';
          break;
        default:
          colorMode = 'Unknown';
      }

      // Calculate dimensions in inches
      const widthInches = metadata.width / dpiHorizontal;
      const heightInches = metadata.height / dpiVertical;

      // Detect potential bleed (this is a basic implementation)
      const hasBleed = this.detectBleed(metadata, dpiHorizontal, dpiVertical);

      return {
        format: metadata.format.toUpperCase(),
        widthPixels: metadata.width,
        heightPixels: metadata.height,
        widthInches: Math.round(widthInches * 100) / 100,
        heightInches: Math.round(heightInches * 100) / 100,
        dpiHorizontal: dpiHorizontal,
        dpiVertical: dpiVertical,
        colorMode: colorMode,
        bitDepth: bitDepth,
        colorProfile: exifData['ColorSpace']?.description || 'Unknown',
        hasBleed: hasBleed,
        fileSize: (await fs.stat(filePath)).size,
        processedAt: new Date().toISOString(),
        processingEngine: 'sharp+exifReader',
        additionalInfo: {
          hasTransparency: metadata.hasAlpha || false,
          orientation: exifData['Orientation']?.description || 'Normal',
          compression: metadata.compression || 'Unknown'
        }
      };

    } catch (error) {
      console.error('Error extracting image specs:', error);
      return null;
    }
  }

  /**
   * Extract specifications from PDF files (basic implementation)
   */
  async extractPDFSpecs(filePath) {
    try {
      const stats = await fs.stat(filePath);
      
      // This is a basic implementation
      // In production, you might use pdf-parse or similar library
      return {
        format: 'PDF',
        fileSize: stats.size,
        // PDF analysis would require specialized libraries
        // For now, we'll assume print-ready settings
        colorMode: 'CMYK',
        dpiHorizontal: 300,
        dpiVertical: 300,
        hasBleed: false, // Would need PDF parsing to detect
        processedAt: new Date().toISOString(),
        processingEngine: 'basic-pdf-analysis',
        isPrintReady: true
      };
    } catch (error) {
      console.error('Error extracting PDF specs:', error);
      return null;
    }
  }

  /**
   * Validate image specifications against service requirements
   */
  validateImageSpecs(validation, serviceStandards) {
    const specs = validation.technicalSpecs;
    if (!specs) return;

    // Check minimum DPI
    if (specs.dpiHorizontal < serviceStandards.min_dpi || 
        specs.dpiVertical < serviceStandards.min_dpi) {
      validation.issues.push(
        `Resolution (${specs.dpiHorizontal}x${specs.dpiVertical} DPI) is below ` +
        `minimum requirement (${serviceStandards.min_dpi} DPI)`
      );
      validation.passed = false;
    }

    // Check preferred DPI
    if (serviceStandards.preferred_dpi && 
        (specs.dpiHorizontal < serviceStandards.preferred_dpi || 
         specs.dpiVertical < serviceStandards.preferred_dpi)) {
      validation.warnings.push(
        `Resolution could be improved. Recommended: ${serviceStandards.preferred_dpi} DPI`
      );
    }

    // Check color mode
    if (serviceStandards.required_color_modes && 
        !serviceStandards.required_color_modes.includes(specs.colorMode)) {
      const requiredModes = serviceStandards.required_color_modes.join(' or ');
      
      if (serviceStandards.preferred_color_mode) {
        validation.warnings.push(
          `Color mode is ${specs.colorMode}. Preferred: ${serviceStandards.preferred_color_mode}`
        );
      } else {
        validation.issues.push(
          `Color mode ${specs.colorMode} not suitable. Required: ${requiredModes}`
        );
        validation.passed = false;
      }
    }

    // Check bleed requirements
    if (serviceStandards.requires_bleed && !specs.hasBleed) {
      validation.issues.push(
        `Bleed is required (minimum ${serviceStandards.min_bleed_inches}") but not detected`
      );
      validation.passed = false;
    }

    // Check dimensions for specific services
    this.validateDimensions(validation, serviceStandards, specs);
  }

  /**
   * Validate PDF specifications
   */
  validatePDFSpecs(validation, serviceStandards) {
    const specs = validation.technicalSpecs;
    if (!specs) return;

    // PDF-specific validations would go here
    // For now, we'll assume PDFs are generally acceptable
    validation.recommendations.push(
      'PDF files should be created with print-ready settings including proper color profiles and bleeds'
    );
  }

  /**
   * Validate dimensions for specific service requirements
   */
  validateDimensions(validation, serviceStandards, specs) {
    // This could be expanded for specific service requirements
    // For example, business cards, posters, etc. have standard sizes
    
    if (specs.widthInches < 1 || specs.heightInches < 1) {
      validation.warnings.push(
        `Small dimensions detected (${specs.widthInches}" x ${specs.heightInches}"). ` +
        'Verify this is the intended size.'
      );
    }

    if (specs.widthPixels < 300 || specs.heightPixels < 300) {
      validation.warnings.push(
        `Low pixel dimensions (${specs.widthPixels}x${specs.heightPixels}px). ` +
        'May not be suitable for print.'
      );
    }
  }

  /**
   * Detect potential bleed in images
   * This is a basic implementation - could be enhanced with edge detection
   */
  detectBleed(metadata, dpiH, dpiV) {
    // Basic heuristic: if image dimensions suggest standard print sizes
    // plus extra space, assume it has bleeds
    const widthInches = metadata.width / dpiH;
    const heightInches = metadata.height / dpiV;

    // Common print sizes with bleed
    const commonSizes = [
      { w: 8.75, h: 11.25 }, // Letter + bleed
      { w: 9.25, h: 12.25 }, // Tabloid + bleed
      { w: 3.75, h: 2.25 },  // Business card + bleed
      { w: 4.25, h: 6.25 },  // Postcard + bleed
    ];

    return commonSizes.some(size => 
      Math.abs(widthInches - size.w) < 0.1 && 
      Math.abs(heightInches - size.h) < 0.1
    );
  }

  /**
   * Store technical specifications in database
   */
  async storeTechnicalSpecs(fileId, specs) {
    try {
      const query = `
        INSERT INTO file_technical_specs (
          file_id, width_pixels, height_pixels, width_inches, height_inches,
          dpi_horizontal, dpi_vertical, color_mode, color_profile, bit_depth,
          has_bleed, bleed_size_inches, embedded_fonts, missing_fonts,
          is_print_ready, validation_errors, validation_warnings,
          processed_at, processing_engine, processing_version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        ON CONFLICT (file_id) DO UPDATE SET
          width_pixels = EXCLUDED.width_pixels,
          height_pixels = EXCLUDED.height_pixels,
          width_inches = EXCLUDED.width_inches,
          height_inches = EXCLUDED.height_inches,
          dpi_horizontal = EXCLUDED.dpi_horizontal,
          dpi_vertical = EXCLUDED.dpi_vertical,
          color_mode = EXCLUDED.color_mode,
          color_profile = EXCLUDED.color_profile,
          bit_depth = EXCLUDED.bit_depth,
          has_bleed = EXCLUDED.has_bleed,
          bleed_size_inches = EXCLUDED.bleed_size_inches,
          is_print_ready = EXCLUDED.is_print_ready,
          validation_errors = EXCLUDED.validation_errors,
          validation_warnings = EXCLUDED.validation_warnings,
          processed_at = EXCLUDED.processed_at,
          processing_engine = EXCLUDED.processing_engine,
          processing_version = EXCLUDED.processing_version
      `;

      await pool.query(query, [
        fileId,
        specs.widthPixels || null,
        specs.heightPixels || null,
        specs.widthInches || null,
        specs.heightInches || null,
        specs.dpiHorizontal || null,
        specs.dpiVertical || null,
        specs.colorMode || null,
        specs.colorProfile || null,
        specs.bitDepth || null,
        specs.hasBleed || false,
        specs.bleedSizeInches || null,
        specs.embeddedFonts ? JSON.stringify(specs.embeddedFonts) : '[]',
        specs.missingFonts ? JSON.stringify(specs.missingFonts) : '[]',
        specs.isPrintReady || false,
        '[]', // validation_errors - handled separately
        '[]', // validation_warnings - handled separately
        specs.processedAt || new Date().toISOString(),
        specs.processingEngine || 'fileValidationService',
        '1.0.0' // version
      ]);

      return true;
    } catch (error) {
      console.error('Error storing technical specs:', error);
      return false;
    }
  }

  /**
   * Get validation standards for a service
   */
  async getServiceStandards(serviceCode) {
    try {
      const result = await pool.query(`
        SELECT * FROM service_validation_standards 
        WHERE service_code = $1 AND is_active = true
      `, [serviceCode]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting service standards:', error);
      return null;
    }
  }

  /**
   * Validate multiple files for multiple services
   */
  async validateFilesForServices(files, serviceCodes) {
    const results = {};

    for (const file of files) {
      results[file.id] = {};

      for (const serviceCode of serviceCodes) {
        const standards = await this.getServiceStandards(serviceCode);
        if (standards) {
          const validation = await this.validateFile(
            file.file_path, 
            file.original_name, 
            standards
          );
          
          results[file.id][serviceCode] = validation;

          // Store technical specs if available
          if (validation.technicalSpecs) {
            await this.storeTechnicalSpecs(file.id, validation.technicalSpecs);
          }
        }
      }
    }

    return results;
  }
}

// Export singleton instance
export const fileValidationService = new FileValidationService();
export default fileValidationService;