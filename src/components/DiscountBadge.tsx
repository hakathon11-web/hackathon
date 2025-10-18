import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Percent, Users, Clock, Gift } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type DiscountType = 'overall' | 'group' | 'timeslot' | 'free_hour';

interface DiscountBadgeProps {
  type: DiscountType;
  value?: number | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const DiscountBadge: React.FC<DiscountBadgeProps> = ({ 
  type, 
  value, 
  className = '', 
  size = 'sm' 
}) => {
  const { t } = useTranslation();

  const getBadgeConfig = () => {
    switch (type) {
      case 'overall':
        return {
          icon: Percent,
          label: value ? `${value}%` : t('discounts.overall'),
          variant: 'default' as const,
          className: 'bg-green-500 text-white border-0 shadow-sm'
        };
      case 'group':
        return {
          icon: Users,
          label: value ? `${value} guests` : t('discounts.group'),
          variant: 'secondary' as const,
          className: 'bg-blue-500 text-white border-0 shadow-sm'
        };
      case 'timeslot':
        return {
          icon: Clock,
          label: value ? `${value}` : t('discounts.timeslot'),
          variant: 'outline' as const,
          className: 'bg-purple-500 text-white border-0 shadow-sm'
        };
      case 'free_hour':
        return {
          icon: Gift,
          label: value ? `${value}` : t('discounts.freeHours'),
          variant: 'destructive' as const,
          className: 'bg-orange-500 text-white border-0 shadow-sm'
        };
      default:
        return {
          icon: Percent,
          label: t('discounts.discount'),
          variant: 'default' as const,
          className: 'bg-gray-500 text-white border-0 shadow-sm'
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs pl-2 pr-2 py-1 rounded-l-full',
    md: 'text-sm pl-2.5 pr-2.5 py-1.5 rounded-l-full',
    lg: 'text-base pl-3 pr-3 py-2 rounded-l-full'
  };

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${sizeClasses[size]} ${className} inline-flex items-center gap-1 font-semibold whitespace-nowrap w-fit min-w-fit`}
    >
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span className="flex-shrink-0">{config.label}</span>
    </Badge>
  );
};

export default DiscountBadge;
