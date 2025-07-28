# Admin API Debugging Guide

## Issue
Users are not showing up in the admin portal user management section.

## API Endpoints Added
✅ `GET /api/admin/users` - Get users with admin filtering
✅ `GET /api/admin/groups` - Get groups with admin filtering  

## Backend Changes Made
1. **Added admin user endpoints** in `server/src/routes/admin.ts`:
   - `/users` with pagination, search, role, status filtering
   - `/groups` with pagination, search, type, status filtering

2. **Updated DatabaseService** in `server/src/services/database.ts`:
   - Added `role` filter support to `getUsers()` method

3. **Fixed UserManagement component** in `src/components/admin/UserManagement.tsx`:
   - Correctly extracts `response.data` from API response
   - Properly handles the admin API response structure

## Testing Steps

### 1. Check if Admin Routes are Working
```bash
# Test the admin users endpoint directly (replace YOUR_TOKEN with actual token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     http://localhost:3001/api/admin/users
```

### 2. Check Authentication
```bash
# Check if you're properly authenticated as admin
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     http://localhost:3001/api/admin/dashboard
```

### 3. Check Database Data
Make sure you have users in the database:
```sql
SELECT id, firstName, lastName, email, role, isActive FROM User;
```

### 4. Browser Network Tab
1. Open admin portal in browser
2. Go to Network tab in DevTools
3. Navigate to Users tab in admin portal
4. Check the API request to `/api/admin/users`
5. Look for:
   - Request status (200, 401, 403, 404?)
   - Response body content
   - Authorization header present?

## Expected API Response Format
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-id",
        "firstName": "John",
        "lastName": "Doe", 
        "email": "john@example.com",
        "role": "member",
        "isActive": true,
        "experienceLevel": "beginner",
        "isPremium": false,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "lastActive": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 1
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Common Issues & Solutions

### Issue: 401 Unauthorized
**Cause**: User not authenticated or token expired
**Solution**: Re-login to get fresh token

### Issue: 403 Forbidden  
**Cause**: User authenticated but not admin role
**Solution**: Check user role in database, ensure they have 'admin' role

### Issue: 404 Not Found
**Cause**: Admin routes not registered or incorrect URL
**Solution**: Verify routes are registered in server/src/index.ts

### Issue: Empty Users Array
**Cause**: Database has no users or filtering too strict
**Solution**: Check database content, try without filters

### Issue: Network Error
**Cause**: Backend server not running or wrong URL
**Solution**: Ensure server running on port 3001, check baseURL in api.ts

## Quick Debug Commands

### Check Server Logs
Look for these log messages when accessing admin users:
```
[Server] Incoming request: GET /api/admin/users
```

### Check Database Content
```sql
-- Check if users exist
SELECT COUNT(*) FROM User;

-- Check user roles
SELECT role, COUNT(*) FROM User GROUP BY role;

-- Check specific admin user
SELECT * FROM User WHERE role = 'admin';
```

### Test Authentication
```javascript
// In browser console on admin page
console.log('Token:', localStorage.getItem('peerbond_token'));
console.log('API Base:', window.location.origin);
```

## Next Steps
1. Test API endpoint directly with curl/Postman
2. Check browser network tab for actual API calls
3. Verify database has users and admin user exists
4. Check server logs for any errors
5. Verify JWT token is valid and user has admin role