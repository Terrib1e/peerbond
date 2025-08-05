import * as React from 'react';
import { cn } from '@/utils/cn';
import { getPortalComponentClasses } from '@/lib/design-system';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'primary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  portalType?: 'member' | 'therapist' | 'admin';
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', portalType, asChild = false, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background';
    
    // Use portal theming if portalType is provided and variant is compatible
    if (portalType && ['primary', 'secondary', 'outline', 'ghost'].includes(variant)) {
      const portalClasses = getPortalComponentClasses(portalType);
      const portalSize = size === 'default' ? 'base' : size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'base';
      const portalVariant = variant === 'default' || variant === 'primary' ? 'primary' : variant;
      
      if (portalVariant !== 'icon') {
        const classes = cn(
          portalClasses.button(portalVariant as 'primary' | 'secondary' | 'outline' | 'ghost', portalSize as 'sm' | 'base' | 'lg'),
          size === 'icon' && 'h-10 w-10 p-0',
          className
        );

        return (
          <button
            className={classes}
            ref={ref}
            {...props}
          />
        );
      }
    }

    // Fallback to original button styling
    const variantClasses = {
      default: 'bg-gray-900 text-white hover:bg-gray-800',
      primary: 'bg-blue-600 text-white hover:bg-blue-700',
      destructive: 'bg-red-600 text-white hover:bg-red-700',
      outline: 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
      ghost: 'hover:bg-gray-100 hover:text-gray-900',
      link: 'underline-offset-4 hover:underline text-blue-600',
    };
    
    const sizeClasses = {
      default: 'h-10 py-2 px-4',
      sm: 'h-9 px-3 rounded-md',
      lg: 'h-11 px-8 rounded-md',
      icon: 'h-10 w-10',
    };

    const classes = cn(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      className
    );

    return (
      <button
        className={classes}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };