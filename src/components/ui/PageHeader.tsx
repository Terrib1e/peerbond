import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { getPortalTheme } from '@/lib/design-system';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: {
    label: string;
    path: string;
  };
  actions?: React.ReactNode;
  portalType?: 'member' | 'therapist' | 'admin';
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  backTo,
  actions,
  portalType = 'member',
  className,
}) => {
  const theme = getPortalTheme(portalType);

  return (
    <div className={cn('mb-6', className)}>
      {backTo && (
        <Link 
          to={backTo.path}
          className={cn(
            'inline-flex items-center text-sm font-medium mb-4 transition-colors',
            'text-gray-600 hover:text-gray-900'
          )}
        >
          <ArrowLeft size={16} className="mr-2" />
          {backTo.label}
        </Link>
      )}
      
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg text-gray-600 max-w-4xl">
              {subtitle}
            </p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center gap-3 ml-6">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;