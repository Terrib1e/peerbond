import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { getPortalComponentClasses } from '@/lib/design-system';
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
  variant?: 'default' | 'interactive';
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
  variant = 'default',
}) => {
  const portalClasses = getPortalComponentClasses(portalType);

  const sizeConfig = {
    sm: { 
      padding: 'p-4' as const,
      iconSize: 20,
      valueText: 'text-xl',
    },
    base: { 
      padding: 'p-6' as const,
      iconSize: 24,
      valueText: 'text-2xl',
    },
    lg: { 
      padding: 'p-8' as const,
      iconSize: 32,
      valueText: 'text-3xl',
    },
  };

  const config = sizeConfig[size];
  const cardVariant = variant === 'interactive' ? 'interactive' : 'hover';

  if (isLoading) {
    return (
      <Card className={cn(portalClasses.card(cardVariant), className)}>
        <CardContent className={config.padding}>
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
    <Card className={cn(portalClasses.card(cardVariant), className)}>
      <CardContent className={config.padding}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className={cn(
              'font-bold text-gray-900 mb-1',
              config.valueText
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
          <div className={portalClasses.statsCardIcon()}>
            <Icon size={config.iconSize} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;