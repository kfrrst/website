# Legacy Monolithic Files

This directory contains the original monolithic JavaScript files that were replaced with a modular component architecture on 2025-08-04.

## Archived Files

- **portal.js** - Original client portal code (3000+ lines)
- **admin.js** - Original admin portal code (3000+ lines)

## Why These Were Replaced

1. **Size** - Both files were over 3000 lines, making them difficult to maintain
2. **Organization** - All functionality was mixed together in one file
3. **Testing** - Impossible to unit test individual features
4. **Performance** - Entire file had to load even if only using one feature
5. **Collaboration** - Multiple developers couldn't work on different features without conflicts

## New Architecture

The functionality has been split into modular components:

### Portal Components (`/components/portal/`)
- `Portal.js` - Main entry point and orchestrator
- `AuthModule.js` - Authentication handling
- `DashboardModule.js` - Dashboard functionality
- `ProjectsModule.js` - Project management
- `InvoicesModule.js` - Invoice handling
- `FilesModule.js` - File management
- `MessagingModule.js` - Messaging system
- `NavigationModule.js` - Navigation handling
- `BaseModule.js` - Base class for all modules

### Admin Components (`/components/admin/`)
- `AdminPortal.js` - Main admin entry point
- `AdminAuthModule.js` - Admin authentication
- `AdminDashboardModule.js` - Admin dashboard
- `AdminClientsModule.js` - Client management
- `BaseAdminModule.js` - Base class for admin modules

### Shared Components (`/components/`)
- Various UI components (ProgressTracker, PhaseCard, etc.)
- All with corresponding Storybook stories

## Migration Notes

- Global variables `window.portal` and `window.adminPortal` are still available for backward compatibility
- All onclick handlers in HTML files have been mapped to the new module methods
- The modular system auto-initializes when DOM is ready

## DO NOT USE THESE FILES

These files are archived for reference only. All new development should use the modular component system.