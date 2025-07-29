# PeerBond Design System

This document outlines the unified design system for PeerBond, ensuring consistency across Member, Therapist, and Admin portals.

## Overview

The design system provides:
- **Unified Layout Structure**: Consistent headers, navigation, and spacing
- **Portal-Specific Theming**: Color schemes that differentiate portals while maintaining cohesion
- **Reusable Components**: Standardized components for common UI patterns
- **Design Tokens**: Centralized values for colors, typography, spacing, and more

## Core Principles

1. **Consistency**: Same patterns and components across all portals
2. **Accessibility**: WCAG 2.1 AA compliance built-in
3. **Portal Identity**: Distinct color themes for easy portal identification
4. **Responsive**: Mobile-first design approach
5. **Scalability**: Easy to extend and modify

## Portal Color Themes

### Member Portal (Blue Theme)
- **Primary**: Blue-600 (#2563eb)
- **Background**: Blue-50 (#eff6ff)
- **Text**: Blue-700 (#1d4ed8)
- **Use Case**: User-facing features, groups, messaging

### Therapist Portal (Green Theme)
- **Primary**: Green-600 (#16a34a)
- **Background**: Green-50 (#f0fdf4)
- **Text**: Green-700 (#15803d)
- **Use Case**: Clinical tools, client management, assessments

### Admin Portal (Purple Theme)
- **Primary**: Purple-600 (#9333ea)
- **Background**: Purple-50 (#faf5ff)
- **Text**: Purple-700 (#7c3aed)
- **Use Case**: System administration, analytics, user management

## Layout Structure

### PortalLayout Component
All portals should use the `PortalLayout` component for consistency:

```tsx
import PortalLayout from '@/components/ui/PortalLayout';

<PortalLayout
  portalType="therapist"
  title="Therapist Portal"
  subtitle="Manage your clients and therapeutic groups"
  navigationItems={[
    { key: 'overview', label: 'Overview', icon: Activity, onClick: () => setTab('overview') },
    { key: 'clients', label: 'Clients', icon: Users, onClick: () => setTab('clients') },
  ]}
  headerActions={<Button>Create Group</Button>}
>
  {content}
</PortalLayout>
```

### Key Features:
- **Portal Switcher**: Automatically shown for privileged users
- **Unified Header**: Consistent styling with portal-specific colors
- **Navigation Tabs**: Optional tabbed navigation for complex interfaces
- **Maya Integration**: Built-in Maya quick access
- **Responsive**: Adapts to mobile with bottom navigation for member portal

## Components

### StatsCard
Unified statistics display component:

```tsx
import StatsCard from '@/components/ui/StatsCard';

<StatsCard
  title="Total Clients"
  value={25}
  icon={Users}
  trend={{ value: 12, label: 'this month', isPositive: true }}
  portalType="therapist"
  size="base"
/>
```

### PageHeader
Consistent page headers with optional back navigation:

```tsx
import PageHeader from '@/components/ui/PageHeader';

<PageHeader
  title="Client Management"
  subtitle="Manage your assigned clients and their progress"
  backTo={{ label: 'Dashboard', path: '/therapist' }}
  actions={<Button>Add Client</Button>}
  portalType="therapist"
/>
```

## Usage Guidelines

### 1. Portal Layout Migration

**Before (Inconsistent)**:
```tsx
// TherapistDashboard.tsx
<div className="min-h-screen bg-gray-50">
  <div className="bg-white shadow-sm border-b">
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1>Therapist Portal</h1>
    </div>
  </div>
  {/* Custom navigation and content */}
</div>
```

**After (Unified)**:
```tsx
<PortalLayout
  portalType="therapist"
  title="Therapist Portal"
  subtitle="Manage your clients and therapeutic groups"
  navigationItems={tabItems}
>
  {content}
</PortalLayout>
```

### 2. Stats Cards Migration

**Before (Custom styling)**:
```tsx
<Card>
  <CardContent className="p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">Total Clients</p>
        <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
      </div>
      <Users className="text-blue-600" size={24} />
    </div>
  </CardContent>
</Card>
```

**After (Unified component)**:
```tsx
<StatsCard
  title="Total Clients"
  value={stats.totalClients}
  icon={Users}
  portalType="therapist"
/>
```

### 3. Design Tokens Usage

Use design tokens instead of hardcoded values:

```tsx
import { designTokens, getPortalTheme } from '@/lib/design-system';

// Get portal-specific theme
const theme = getPortalTheme('therapist');

// Use design tokens
<div className={`p-${designTokens.spacing.lg} bg-${theme.bg}`}>
  <h2 className={`text-${theme.text} text-${designTokens.typography.sizes['2xl']}`}>
    Section Title
  </h2>
</div>
```

## Implementation Plan

### Phase 1: Core Infrastructure ✅
- [x] Create PortalLayout component
- [x] Design tokens system
- [x] StatsCard component
- [x] PageHeader component

### Phase 2: Portal Migration
- [ ] Migrate TherapistDashboard to use PortalLayout
- [ ] Migrate AdminDashboard to use PortalLayout
- [ ] Update member portal Layout component
- [ ] Standardize all stats displays with StatsCard

### Phase 3: Component Standardization
- [ ] Unified form components
- [ ] Standardized modal/dialog patterns
- [ ] Consistent button and input styling
- [ ] Unified loading states

### Phase 4: Fine-tuning
- [ ] Accessibility audit and improvements
- [ ] Mobile responsiveness testing
- [ ] Performance optimization
- [ ] Documentation completion

## Best Practices

### Color Usage
- Always use portal-specific colors for accents and highlights
- Use gray scale for neutral elements
- Reserve red for destructive actions
- Use green for success states (not just therapist portal)

### Typography
- Use consistent heading hierarchy (h1 for page titles, h2 for sections)
- Maintain proper contrast ratios
- Use appropriate font weights (normal for body, medium for labels, bold for emphasis)

### Spacing
- Use design token spacing values consistently
- Maintain consistent margins and padding
- Use proper component spacing (gap classes)

### Components
- Always prefer design system components over custom styling
- Use proper component variants and sizes
- Maintain consistent interaction states (hover, focus, active)

## Breaking Changes

When migrating existing portals:

1. **Layout Changes**: Portals will get consistent headers and navigation
2. **Color Scheme**: Portal-specific colors will be applied automatically
3. **Component Props**: Some existing components may need prop updates
4. **CSS Classes**: Direct Tailwind classes should be replaced with design system utilities

## Support

For questions about the design system:
- Check this documentation first
- Review existing implementations in other portals
- Refer to design tokens in `/src/lib/design-system.ts`
- Check component source code in `/src/components/ui/`