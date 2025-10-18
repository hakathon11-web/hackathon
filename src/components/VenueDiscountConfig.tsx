import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Percent, Users, Clock, Gift } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Service {
  id: string;
  name: string;
}

interface GroupDiscount {
  minGuests: number;
  discountPercent: number;
  serviceIds: string[];
}

interface TimeslotDiscount {
  start: string;
  end: string;
  discountPercent: number;
  serviceIds: string[];
}

interface FreeHourDiscount {
  thresholdHours: number;
  freeHours: number;
  serviceIds: string[];
}

interface VenueDiscountConfigProps {
  services: Service[];
  
  // Overall discount
  overallDiscountPercent: number;
  setOverallDiscountPercent: (value: number) => void;
  overallDiscountEnabled: boolean;
  setOverallDiscountEnabled: (value: boolean) => void;
  overallDiscountServiceIds: string[];
  setOverallDiscountServiceIds: (value: string[]) => void;
  
  // Free hour discounts
  freeHourDiscountEnabled: boolean;
  setFreeHourDiscountEnabled: (value: boolean) => void;
  freeHourDiscounts: FreeHourDiscount[];
  setFreeHourDiscounts: (value: FreeHourDiscount[]) => void;
  
  // Group discounts
  groupDiscounts: GroupDiscount[];
  setGroupDiscounts: (value: GroupDiscount[]) => void;
  groupDiscountEnabled: boolean;
  setGroupDiscountEnabled: (value: boolean) => void;
  
  // Timeslot discounts
  timeslotDiscounts: TimeslotDiscount[];
  setTimeslotDiscounts: (value: TimeslotDiscount[]) => void;
  timeslotDiscountEnabled: boolean;
  setTimeslotDiscountEnabled: (value: boolean) => void;
}

const VenueDiscountConfig: React.FC<VenueDiscountConfigProps> = ({
  services,
  overallDiscountPercent,
  setOverallDiscountPercent,
  overallDiscountEnabled,
  setOverallDiscountEnabled,
  overallDiscountServiceIds,
  setOverallDiscountServiceIds,
  freeHourDiscountEnabled,
  setFreeHourDiscountEnabled,
  freeHourDiscounts,
  setFreeHourDiscounts,
  groupDiscounts,
  setGroupDiscounts,
  groupDiscountEnabled,
  setGroupDiscountEnabled,
  timeslotDiscounts,
  setTimeslotDiscounts,
  timeslotDiscountEnabled,
  setTimeslotDiscountEnabled,
}) => {
  const { t } = useTranslation();
  const addGroupDiscount = () => {
    setGroupDiscounts([
      ...groupDiscounts,
      { minGuests: 2, discountPercent: 10, serviceIds: [] }
    ]);
  };

  const removeGroupDiscount = (index: number) => {
    setGroupDiscounts(groupDiscounts.filter((_, i) => i !== index));
  };

  const updateGroupDiscount = (index: number, field: keyof GroupDiscount, value: any) => {
    const updated = [...groupDiscounts];
    updated[index] = { ...updated[index], [field]: value };
    setGroupDiscounts(updated);
  };

  const addTimeslotDiscount = () => {
    setTimeslotDiscounts([
      ...timeslotDiscounts,
      { start: '14:00', end: '18:00', discountPercent: 15, serviceIds: [] }
    ]);
  };

  const removeTimeslotDiscount = (index: number) => {
    setTimeslotDiscounts(timeslotDiscounts.filter((_, i) => i !== index));
  };

  const updateTimeslotDiscount = (index: number, field: keyof TimeslotDiscount, value: any) => {
    const updated = [...timeslotDiscounts];
    updated[index] = { ...updated[index], [field]: value };
    setTimeslotDiscounts(updated);
  };

  const addFreeHourDiscount = () => {
    setFreeHourDiscounts([
      ...freeHourDiscounts,
      { thresholdHours: 4, freeHours: 1, serviceIds: [] }
    ]);
  };

  const removeFreeHourDiscount = (index: number) => {
    setFreeHourDiscounts(freeHourDiscounts.filter((_, i) => i !== index));
  };

  const updateFreeHourDiscount = (index: number, field: keyof FreeHourDiscount, value: any) => {
    const updated = [...freeHourDiscounts];
    updated[index] = { ...updated[index], [field]: value };
    setFreeHourDiscounts(updated);
  };

  const ServiceSelector = ({ 
    selectedIds, 
    onSelectionChange,
    sectionId
  }: { 
    selectedIds: string[]; 
    onSelectionChange: (ids: string[]) => void; 
    sectionId: string;
  }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{t('discounts.applyToServices')}</Label>
      <div className="flex flex-wrap gap-2">
        {services.map((service) => (
          <div key={service.id} className="flex items-center space-x-2">
            <Checkbox
              id={`${sectionId}-service-${service.id}`}
              checked={selectedIds.includes(service.id)}
              onCheckedChange={(checked) => {
                if (checked) {
                  onSelectionChange([...selectedIds, service.id]);
                } else {
                  onSelectionChange(selectedIds.filter(id => id !== service.id));
                }
              }}
            />
            <Label htmlFor={`${sectionId}-service-${service.id}`} className="text-sm">
              {service.name}
            </Label>
          </div>
        ))}
      </div>
      {selectedIds.length === 0 && (
        <p className="text-xs text-muted-foreground">{t('discounts.noServicesSelected')}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Overall Discount */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            {t('discounts.overallDiscount')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="overall-discount"
              checked={overallDiscountEnabled}
              onCheckedChange={setOverallDiscountEnabled}
            />
            <Label htmlFor="overall-discount">{t('discounts.enableOverallDiscount')}</Label>
          </div>
          
          {overallDiscountEnabled && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="discount-percent">{t('discounts.discountPercentage')}</Label>
                <Input
                  id="discount-percent"
                  type="number"
                  value={overallDiscountPercent || ''}
                  onChange={(e) => setOverallDiscountPercent(e.target.value === '' ? 0 : Number(e.target.value))}
                  min="0"
                  max="100"
                  className="w-24"
                />
              </div>
              
              <ServiceSelector
                selectedIds={overallDiscountServiceIds}
                onSelectionChange={setOverallDiscountServiceIds}
                sectionId="overall"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Free Hour Discounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            {t('discounts.freeHourDiscounts')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="free-hour-discount"
              checked={freeHourDiscountEnabled}
              onCheckedChange={setFreeHourDiscountEnabled}
            />
            <Label htmlFor="free-hour-discount">{t('discounts.enableFreeHourDiscounts')}</Label>
          </div>
          
          {freeHourDiscountEnabled && (
            <div className="space-y-4">
              {freeHourDiscounts.map((discount, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Rule {index + 1}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFreeHourDiscount(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Threshold Hours</Label>
                        <Input
                          type="number"
                          value={discount.thresholdHours || ''}
                          onChange={(e) => updateFreeHourDiscount(index, 'thresholdHours', e.target.value === '' ? 0 : Number(e.target.value))}
                          min="1"
                        />
                      </div>
                      <div>
                        <Label>Free Hours</Label>
                        <Input
                          type="number"
                          value={discount.freeHours || ''}
                          onChange={(e) => updateFreeHourDiscount(index, 'freeHours', e.target.value === '' ? 0 : Number(e.target.value))}
                          min="1"
                        />
                      </div>
                    </div>
                    
                    <ServiceSelector
                      selectedIds={discount.serviceIds}
                      onSelectionChange={(ids) => updateFreeHourDiscount(index, 'serviceIds', ids)}
                      sectionId={`freehour-${index}`}
                    />
                  </div>
                </Card>
              ))}
              
              <Button onClick={addFreeHourDiscount} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                {t('discounts.addFreeHourRule')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Group Discounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('discounts.groupDiscounts')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="group-discount"
              checked={groupDiscountEnabled}
              onCheckedChange={setGroupDiscountEnabled}
            />
            <Label htmlFor="group-discount">{t('discounts.enableGroupDiscounts')}</Label>
          </div>
          
          {groupDiscountEnabled && (
            <div className="space-y-4">
              {groupDiscounts.map((discount, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Rule {index + 1}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeGroupDiscount(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Minimum Guests</Label>
                        <Input
                          type="number"
                          value={discount.minGuests || ''}
                          onChange={(e) => updateGroupDiscount(index, 'minGuests', e.target.value === '' ? 0 : Number(e.target.value))}
                          min="2"
                        />
                      </div>
                      <div>
                        <Label>Discount %</Label>
                        <Input
                          type="number"
                          value={discount.discountPercent || ''}
                          onChange={(e) => updateGroupDiscount(index, 'discountPercent', e.target.value === '' ? 0 : Number(e.target.value))}
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                    
                    <ServiceSelector
                      selectedIds={discount.serviceIds}
                      onSelectionChange={(ids) => updateGroupDiscount(index, 'serviceIds', ids)}
                      sectionId={`group-${index}`}
                    />
                  </div>
                </Card>
              ))}
              
              <Button onClick={addGroupDiscount} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                {t('discounts.addGroupDiscount')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeslot Discounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('discounts.timeslotDiscounts')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="timeslot-discount"
              checked={timeslotDiscountEnabled}
              onCheckedChange={setTimeslotDiscountEnabled}
            />
            <Label htmlFor="timeslot-discount">{t('discounts.enableTimeslotDiscounts')}</Label>
          </div>
          
          {timeslotDiscountEnabled && (
            <div className="space-y-4">
              {timeslotDiscounts.map((discount, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Rule {index + 1}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeTimeslotDiscount(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Start Time</Label>
                        <Input
                          type="time"
                          value={discount.start}
                          onChange={(e) => updateTimeslotDiscount(index, 'start', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>End Time</Label>
                        <Input
                          type="time"
                          value={discount.end}
                          onChange={(e) => updateTimeslotDiscount(index, 'end', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Discount %</Label>
                        <Input
                          type="number"
                          value={discount.discountPercent || ''}
                          onChange={(e) => updateTimeslotDiscount(index, 'discountPercent', e.target.value === '' ? 0 : Number(e.target.value))}
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                    
                    <ServiceSelector
                      selectedIds={discount.serviceIds}
                      onSelectionChange={(ids) => updateTimeslotDiscount(index, 'serviceIds', ids)}
                      sectionId={`timeslot-${index}`}
                    />
                  </div>
                </Card>
              ))}
              
              <Button onClick={addTimeslotDiscount} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                {t('discounts.addTimeslotDiscount')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VenueDiscountConfig;