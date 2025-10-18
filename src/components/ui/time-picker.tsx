import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value?: string;
  onChange?: (time: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const TimePicker = ({ 
  value, 
  onChange, 
  placeholder = "Select time",
  className,
  disabled = false
}: TimePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Generate hours and minutes arrays
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  
  // Parse current value
  const [currentHour, currentMinute] = value ? value.split(':') : ['', ''];
  
  const handleTimeSelect = (hour: string, minute: string) => {
    const timeString = `${hour}:${minute}`;
    onChange?.(timeString);
    setIsOpen(false);
  };
  
  const formatTimeDisplay = (time: string) => {
    // Use 24-hour format
    return time;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {formatTimeDisplay(value || "")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Hours */}
          <div className="border-r">
            <div className="p-2 text-sm font-medium text-center border-b">Hour</div>
            <ScrollArea className="h-48">
              <div className="p-1">
                {hours.map((hour) => (
                  <Button
                    key={hour}
                    variant={currentHour === hour ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-center text-sm mb-1"
                    onClick={() => handleTimeSelect(hour, currentMinute || '00')}
                  >
                    {hour}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          {/* Minutes */}
          <div>
            <div className="p-2 text-sm font-medium text-center border-b">Minute</div>
            <ScrollArea className="h-48">
              <div className="p-1">
                {minutes.filter((_, index) => index % 5 === 0).map((minute) => (
                  <Button
                    key={minute}
                    variant={currentMinute === minute ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-center text-sm mb-1"
                    onClick={() => handleTimeSelect(currentHour || '09', minute)}
                  >
                    {minute}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        
        {/* Quick time options */}
        <div className="border-t p-2">
          <div className="text-xs font-medium mb-2 text-muted-foreground">Quick Select</div>
          <div className="grid grid-cols-3 gap-1">
            {['09:00', '12:00', '15:00', '18:00', '20:00', '22:00'].map((time) => (
              <Button
                key={time}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  onChange?.(time);
                  setIsOpen(false);
                }}
              >
                {formatTimeDisplay(time)}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Enhanced Time Input that combines both picker and manual input
interface TimeInputProps extends TimePickerProps {
  label?: string;
  icon?: React.ReactNode;
  allowManualInput?: boolean;
}

export const TimeInput = ({ 
  label, 
  icon, 
  allowManualInput = true,
  ...timePickerProps 
}: TimeInputProps) => {
  const [inputMode, setInputMode] = useState<'picker' | 'manual'>('picker');

  return (
    <div className="space-y-2">
      {label && (
        <Label className="flex items-center gap-2">
          {icon}
          {label}
        </Label>
      )}
      
      <div className="flex gap-2">
        {inputMode === 'picker' ? (
          <TimePicker {...timePickerProps} className="flex-1" />
        ) : (
          <Input
            type="time"
            value={timePickerProps.value || ''}
            onChange={(e) => timePickerProps.onChange?.(e.target.value)}
            className="flex-1"
            disabled={timePickerProps.disabled}
          />
        )}
        
        {allowManualInput && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setInputMode(mode => mode === 'picker' ? 'manual' : 'picker')}
            className="shrink-0"
          >
            {inputMode === 'picker' ? '123' : <Clock className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
};