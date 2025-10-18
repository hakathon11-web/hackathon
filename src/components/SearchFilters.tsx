
import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, MapPin, Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateWithLocale } from "@/lib/dateUtils";

const SearchFilters = () => {
  const [location, setLocation] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [guests, setGuests] = useState("");

  const handleDateChange = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-background/30 rounded-lg border border-white/10">
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Location
        </Label>
        <Input
          placeholder="Enter location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="bg-background/50 border-white/20"
        />
      </div>
      
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          Date
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal bg-background/50 border-white/20",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? formatDateWithLocale(date, "MMMM d, yyyy") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateChange}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Time
        </Label>
        <Input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="bg-background/50 border-white/20"
        />
      </div>
      
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Guests
        </Label>
        <Input
          type="number"
          placeholder="1"
          value={guests || ''}
          onChange={(e) => setGuests(e.target.value)}
          className="bg-background/50 border-white/20"
          min="1"
          max="50"
        />
      </div>
      
      <div className="sm:col-span-2 lg:col-span-4 pt-2">
        <Button className="w-full bg-primary hover:bg-primary/90">
          Search Venues
        </Button>
      </div>
    </div>
  );
};

export default SearchFilters;
