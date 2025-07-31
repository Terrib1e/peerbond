import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { getComponentClasses, getPortalTheme } from '@/lib/design-system';
import { cn } from '@/utils/cn';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  portalType?: 'member' | 'therapist' | 'admin';
  size?: 'sm' | 'base' | 'lg';
  className?: string;
  isLoading?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  portalType = 'member',
  size = 'base',
  className,
  isLoading = false,
}) => {

  const sizeClasses = {
    sm: 'p-4',
    base: 'p-6',
    lg: 'p-8',
  };

  const iconSizes = {
    sm: 20,
    base: 24,
    lg: 32,
  };

  const valueSizes = {
    sm: 'text-xl',
    base: 'text-2xl',
    lg: 'text-3xl',
  };

  if (isLoading) {
    return (
      <Card className={cn(getComponentClasses.card('hover'), className)}>
        <CardContent className={sizeClasses[size]}>
          <div className="animate-pulse">
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-6 w-6 bg-gray-200 rounded"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
            {trend && <div className="h-3 bg-gray-200 rounded w-24"></div>}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(getComponentClasses.card('hover'), className)}>
      <CardContent className={sizeClasses[size]}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className={cn(
              'font-bold text-gray-900 mb-1',
              valueSizes[size]
            )}>
              {value}
            </p>
            {trend && (
              <div className="flex items-center">
                <span className={cn(
                  'text-xs font-medium',
                  trend.isPositive !== false ? 'text-green-600' : 'text-red-600'
                )}>
                  {trend.isPositive !== false ? '+' : ''}{trend.value}%
                </span>
                <span className="text-xs text-gray-500 ml-1">
                  {trend.label}
                </span>
              </div>
            )}
          </div>
          <div className={cn(
            'flex-shrink-0 p-2 rounded-full',
            `bg-${portalType === 'member' ? 'blue' : portalType === 'therapist' ? 'green' : 'purple'}-100`
          )}>
            <Icon
              size={iconSizes[size]}
              className={cn(
                portalType === 'member' && 'text-blue-600',
                portalType === 'therapist' && 'text-green-600',
                portalType === 'admin' && 'text-purple-600'
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;