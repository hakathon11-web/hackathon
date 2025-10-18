import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Clock, Users, Percent, Gift, ToggleLeft, ToggleRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface GroupDiscount {
  minGuests: number;
  discountPercent: number;
}

interface TimeslotDiscount {
  start: string;
  end: string;
  discountPercent: number;
}

interface ServiceDiscountConfigProps {
  serviceIndex: number;
  overallDiscountPercent: number;
  setOverallDiscountPercent: (value: number) => void;
  isTimeBasedFreeHourEnabled: boolean;
  setIsTimeBasedFreeHourEnabled: (value: boolean) => void;
  thresholdHours: number;
  setThresholdHours: (value: number) => void;
  freeHours: number;
  setFreeHours: (value: number) => void;
  groupDiscounts: GroupDiscount[];
  setGroupDiscounts: (value: GroupDiscount[]) => void;
  timeslotDiscounts: TimeslotDiscount[];
  setTimeslotDiscounts: (value: TimeslotDiscount[]) => void;
}

const ServiceDiscountConfig: React.FC<ServiceDiscountConfigProps> = ({
  serviceIndex,
  overallDiscountPercent,
  setOverallDiscountPercent,
  isTimeBasedFreeHourEnabled,
  setIsTimeBasedFreeHourEnabled,
  thresholdHours,
  setThresholdHours,
  freeHours,
  setFreeHours,
  groupDiscounts,
  setGroupDiscounts,
  timeslotDiscounts,
  setTimeslotDiscounts,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newGroupDiscount, setNewGroupDiscount] = useState<GroupDiscount>({
    minGuests: 3,
    discountPercent: 10,
  });

  const [newTimeslotDiscount, setNewTimeslotDiscount] = useState<TimeslotDiscount>({
    start: '11:00',
    end: '16:00',
    discountPercent: 10,
  });

  const addGroupDiscount = () => {
    if (newGroupDiscount.minGuests > 0 && newGroupDiscount.discountPercent > 0) {
      setGroupDiscounts([...groupDiscounts, newGroupDiscount]);
      setNewGroupDiscount({ minGuests: 3, discountPercent: 10 });
    }
  };

  const removeGroupDiscount = (index: number) => {
    setGroupDiscounts(groupDiscounts.filter((_, i) => i !== index));
  };

  const addTimeslotDiscount = () => {
    if (newTimeslotDiscount.start && newTimeslotDiscount.end && newTimeslotDiscount.discountPercent > 0) {
      setTimeslotDiscounts([...timeslotDiscounts, newTimeslotDiscount]);
      setNewTimeslotDiscount({ start: '11:00', end: '16:00', discountPercent: 10 });
    }
  };

  const removeTimeslotDiscount = (index: number) => {
    setTimeslotDiscounts(timeslotDiscounts.filter((_, i) => i !== index));
  };

  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        times.push(timeString);
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Service Discounts
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ToggleRight className="h-4 w-4 text-primary" />
            ) : (
              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Overall Discount */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Percent className="h-3 w-3" />
              Overall Discount
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                value={overallDiscountPercent || ''}
                onChange={(e) => setOverallDiscountPercent(e.target.value === '' ? 0 : Number(e.target.value))}
                className="w-20"
              />
              <span className="text-sm">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Applied to all bookings for this service
            </p>
          </div>

          {/* Free Hours Discount */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Gift className="h-3 w-3" />
              Free Hours (2+1 Logic)
            </Label>
            <div className="flex items-center gap-2">
              <Switch
                checked={isTimeBasedFreeHourEnabled}
                onCheckedChange={setIsTimeBasedFreeHourEnabled}
              />
              <span className="text-sm">Enable free hours</span>
            </div>
            
            {isTimeBasedFreeHourEnabled && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Threshold Hours</Label>
                  <Input
                    type="number"
                    min="1"
                    value={thresholdHours || ''}
                    onChange={(e) => setThresholdHours(e.target.value === '' ? 0 : Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Free Hours</Label>
                  <Input
                    type="number"
                    min="1"
                    value={freeHours || ''}
                    onChange={(e) => setFreeHours(e.target.value === '' ? 0 : Number(e.target.value))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Group Size Discounts */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Users className="h-3 w-3" />
              Group Discounts
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Min Guests</Label>
                <Input
                  type="number"
                  min="2"
                  value={newGroupDiscount.minGuests || ''}
                  onChange={(e) => {
                    console.log('Input value:', e.target.value, 'Is empty:', e.target.value === '');
                    setNewGroupDiscount({
                      ...newGroupDiscount,
                      minGuests: e.target.value === '' ? 0 : Number(e.target.value)
                    });
                  }}
                />
              </div>
              <div>
                <Label className="text-xs">Discount %</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={newGroupDiscount.discountPercent || ''}
                  onChange={(e) => setNewGroupDiscount({
                    ...newGroupDiscount,
                    discountPercent: e.target.value === '' ? 0 : Number(e.target.value)
                  })}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={addGroupDiscount} size="sm" className="w-full">
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              {groupDiscounts.map((discount, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded text-xs">
                  <Badge variant="outline">
                    {discount.minGuests}+ guests → {discount.discountPercent}% off
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeGroupDiscount(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Timeslot Discounts */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Timeslot Discounts
            </Label>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-xs">Start</Label>
                <Select
                  value={newTimeslotDiscount.start}
                  onValueChange={(value) => setNewTimeslotDiscount({
                    ...newTimeslotDiscount,
                    start: value
                  })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">End</Label>
                <Select
                  value={newTimeslotDiscount.end}
                  onValueChange={(value) => setNewTimeslotDiscount({
                    ...newTimeslotDiscount,
                    end: value
                  })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Discount %</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={newTimeslotDiscount.discountPercent || ''}
                  onChange={(e) => setNewTimeslotDiscount({
                    ...newTimeslotDiscount,
                    discountPercent: e.target.value === '' ? 0 : Number(e.target.value)
                  })}
                  className="h-8"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={addTimeslotDiscount} size="sm" className="w-full h-8">
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              {timeslotDiscounts.map((discount, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded text-xs">
                  <Badge variant="outline">
                    {discount.start} - {discount.end} → {discount.discountPercent}% off
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTimeslotDiscount(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default ServiceDiscountConfig;