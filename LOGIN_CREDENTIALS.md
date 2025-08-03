# Login Credentials

## Admin Panel Access
**URL:** `/admin.html` or `http://localhost:3000/admin.html`

**Admin Account:**
- Email: `kendrick@reprintstudios.com`
- Password: `admin123`

## Client Portal Access
**URL:** `/portal.html` or `http://localhost:3000/portal.html`

**Test Client Account:**
- Email: `client@example.com`
- Password: `client123`

## Additional Test Client
- Email: `sarah@techsolutions.com`
- Password: Reset required (use reset-passwords.js)

## Notes
- These are the default test credentials created during database setup
- The passwords are hashed using bcrypt in the database
- Make sure your backend server is running on port 3000
- Ensure the database is properly initialized with the migration files

## Troubleshooting
If login fails:
1. Check that the server is running (`npm start`)
2. Verify the database is connected (`node test-db.js`)
3. Check browser console for any API errors
4. Ensure cookies are enabled for JWT token storage