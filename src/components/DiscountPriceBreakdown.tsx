import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Percent, Gift, Users, Clock, Calculator } from 'lucide-react';
import { DiscountCalculationResult } from '@/hooks/useVenueDiscountCalculation';

interface DiscountPriceBreakdownProps {
  calculation: DiscountCalculationResult;
  durationHours: number;
  guestCount: number;
  className?: string;
}

const DiscountPriceBreakdown: React.FC<DiscountPriceBreakdownProps> = ({
  calculation,
  durationHours,
  guestCount,
  className = "",
}) => {
  const getDiscountIcon = (discountType: string) => {
    switch (discountType) {
      case 'Overall Discount':
        return <Percent className="h-3 w-3" />;
      case 'Free Hours':
        return <Gift className="h-3 w-3" />;
      case 'Group Discount':
        return <Users className="h-3 w-3" />;
      case 'Timeslot Discount':
        return <Clock className="h-3 w-3" />;
      default:
        return <Calculator className="h-3 w-3" />;
    }
  };

  const getDiscountDescription = (discountType: string) => {
    const breakdown = calculation.discountBreakdown;
    switch (discountType) {
      case 'Overall Discount':
        return `${breakdown.overallDiscount}% off total`;
      case 'Free Hours':
        return `${breakdown.freeHours} free hour(s)`;
      case 'Group Discount':
        return `${breakdown.groupDiscount}% off for ${guestCount}+ guests`;
      case 'Timeslot Discount':
        return `${breakdown.timeslotDiscount}% off for time slot`;
      default:
        return discountType;
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5" />
          Price Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Base Price */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            Base Price ({calculation.paidHours} hours)
          </span>
          <span className="font-medium">{calculation.originalPrice.toFixed(2)} GEL</span>
        </div>

        {/* Applied Discounts */}
        {calculation.appliedDiscounts.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Applied Discounts:</p>
              {calculation.appliedDiscounts.map((discount, index) => (
                <div key={index} className="flex items-center justify-between">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {getDiscountIcon(discount)}
                    {getDiscountDescription(discount)}
                  </Badge>
                  <span className="text-sm text-green-600">
                    -{((calculation.originalPrice - calculation.finalPrice) / calculation.appliedDiscounts.length).toFixed(2)} GEL
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Total Savings */}
        {calculation.totalSavings > 0 && (
          <>
            <Separator />
            <div className="flex justify-between items-center text-green-600">
              <span className="text-sm font-medium">Total Savings</span>
              <span className="font-medium">-{calculation.totalSavings.toFixed(2)} GEL</span>
            </div>
          </>
        )}

        {/* Final Price */}
        <Separator />
        <div className="flex justify-between items-center text-lg font-bold">
          <span>Final Total</span>
                      <span className="text-primary">{calculation.finalPrice.toFixed(2)} GEL</span>
        </div>

        {/* Additional Info */}
        {calculation.paidHours !== durationHours && (
          <div className="text-xs text-muted-foreground text-center pt-2">
            Paying for {calculation.paidHours} out of {durationHours} hours
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DiscountPriceBreakdown;