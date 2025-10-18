import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface DaySchedule {
  open: string;
  close: string;
  closed: boolean;
}

export interface WorkingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface DailyWorkingHoursProps {
  workingHours: WorkingHours;
  onWorkingHoursChange: (workingHours: WorkingHours) => void;
  className?: string;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'common.days.monday' },
  { key: 'tuesday', label: 'common.days.tuesday' },
  { key: 'wednesday', label: 'common.days.wednesday' },
  { key: 'thursday', label: 'common.days.thursday' },
  { key: 'friday', label: 'common.days.friday' },
  { key: 'saturday', label: 'common.days.saturday' },
  { key: 'sunday', label: 'common.days.sunday' },
] as const;

const TIME_SLOTS = [
  '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
  '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30',
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
];

const DailyWorkingHours: React.FC<DailyWorkingHoursProps> = ({
  workingHours,
  onWorkingHoursChange,
  className = ''
}) => {
  const { t } = useTranslation();

  const updateDaySchedule = (day: keyof WorkingHours, updates: Partial<DaySchedule>) => {
    const newWorkingHours = {
      ...workingHours,
      [day]: {
        ...workingHours[day],
        ...updates
      }
    };
    onWorkingHoursChange(newWorkingHours);
  };

  const formatTimeDisplay = (time: string) => {
    // Use 24-hour format
    return time;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('partner.editVenue.dailyWorkingHours')}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {DAYS_OF_WEEK.map(({ key, label }) => (
          <div key={key} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                {t(label)}
              </Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={!workingHours[key].closed}
                  onCheckedChange={(checked) => 
                    updateDaySchedule(key, { closed: !checked })
                  }
                />
                <span className="text-sm text-muted-foreground">
                  {workingHours[key].closed ? t('common.closed') : t('common.open')}
                </span>
              </div>
            </div>
            
            {!workingHours[key].closed && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {t('partner.editVenue.openingTime')}
                  </Label>
                  <Select
                    value={workingHours[key].open}
                    onValueChange={(value) => updateDaySchedule(key, { open: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue>
                        {formatTimeDisplay(workingHours[key].open)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {formatTimeDisplay(time)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {t('partner.editVenue.closingTime')}
                  </Label>
                  <Select
                    value={workingHours[key].close}
                    onValueChange={(value) => updateDaySchedule(key, { close: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue>
                        {formatTimeDisplay(workingHours[key].close)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {formatTimeDisplay(time)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        ))}
        
      </CardContent>
    </Card>
  );
};

export default DailyWorkingHours;
