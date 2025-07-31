# PeerBond Portal System

## Overview
PeerBond now has three dedicated portals for different member types, each with role-based access controls and specialized functionality.

## Portal Types

### 1. **User Portal** (`/app`)
- **Roles**: `member`, `facilitator`
- **Features**:
  - Personal dashboard with group activity
  - Group browsing and participation
  - AI-powered tools and insights
  - Profile management
  - Real-time chat in support groups

### 2. **Therapist Portal** (`/therapist`)
- **Roles**: `therapist`, `admin`
- **Features**:
  - Patient overview and progress tracking
  - Group dynamics monitoring
  - AI-generated insights and alerts
  - Crisis intervention tools
  - Progress reports and analytics
  - Professional supervision features

### 3. **Admin Portal** (`/admin`)
- **Roles**: `admin`
- **Features**:
  - Platform-wide analytics
  - User and group management
  - System health monitoring
  - HIPAA compliance tracking
  - AI model performance metrics
  - Configuration and settings

## Role-Based Access

### Access Matrix
| Portal | Member | Facilitator | Therapist | Admin |
|--------|--------|-------------|-----------|-------|
| User Portal | ✅ | ✅ | ✅* | ✅* |
| Therapist Portal | ❌ | ❌ | ✅ | ✅ |
| Admin Portal | ❌ | ❌ | ❌ | ✅ |

*Via portal switcher

### Automatic Redirects
- Users are automatically redirected to their primary portal after login
- Unauthorized access attempts redirect to appropriate portal
- Session management maintains portal preferences

## Portal Switching

### For Privileged Users
- **Therapists** can switch between User and Therapist portals
- **Admins** can access all three portals
- Portal switcher available in navigation bars
- Current portal clearly indicated

### Navigation
- User Portal: Bottom navigation (mobile-first)
- Therapist Portal: Tab-based navigation with time filtering
- Admin Portal: Sidebar navigation with advanced features

## Database Integration

### User Roles
```typescript
type UserRole = 'member' | 'facilitator' | 'therapist' | 'admin';
```

### Role Assignment
- Members: Regular members seeking support
- Facilitators: Experienced members who can help guide groups
- Therapists: Licensed professionals providing oversight
- Admins: Platform administrators with full access

## Security Features

### Authentication
- Role-based route protection
- Automatic session validation
- Protected route components prevent unauthorized access

### Authorization
- Portal-specific permissions
- Feature flags based on member role
- API endpoint protection by role

### Audit Trail
- Portal access logging
- Role change tracking
- Administrative action logging

## Implementation Details

### Key Components
- `ProtectedRoute`: Role-based route protection
- `RoleBasedRedirect`: Automatic portal routing
- `PortalLayout`: Shared layout for portal consistency
- `Navigation`: Portal-aware navigation

### Route Structure
```
/app/*          - User Portal (members, facilitators)
/therapist/*    - Therapist Portal (therapists, admins)
/admin/*        - Admin Portal (admins only)
/portal         - Auto-redirect to member's default portal
```

### Database Schema Considerations
- User table includes `role` field
- Role changes require admin approval
- Session management tracks portal usage
- Audit logs for security compliance

## Future Enhancements

### Planned Features
1. **Role Requests**: Users can request role upgrades
2. **Multi-tenancy**: Organization-specific portals
3. **Custom Dashboards**: Configurable portal layouts
4. **Mobile Apps**: Native portal applications
5. **SSO Integration**: Enterprise authentication

### Scalability
- Portal-specific microservices
- Role-based data partitioning
- Caching strategies per portal type
- Performance monitoring by portal usage

## Getting Started

### For Developers
1. User roles are defined in the database
2. Routes are automatically protected based on member role
3. Portal switching is handled by the navigation components
4. New features should respect role-based permissions

### For Users
1. Log in with your credentials
2. You'll be automatically directed to your appropriate portal
3. Use the portal switcher (if available) to access other portals
4. Each portal has specialized tools for your role

## Support
- User support: Available in User Portal
- Professional support: Contact your supervisor
- Technical issues: Admin Portal system health monitoring