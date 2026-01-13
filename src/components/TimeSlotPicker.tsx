import { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeSlotPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minHour?: number;
  maxHour?: number;
  intervalMinutes?: number;
}

export function TimeSlotPicker({
  value,
  onChange,
  label,
  placeholder = 'Seleccionar hora...',
  className,
  disabled = false,
  minHour = 8,
  maxHour = 20,
  intervalMinutes = 30,
}: TimeSlotPickerProps) {
  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots: { value: string; label: string }[] = [];
    
    for (let hour = minHour; hour <= maxHour; hour++) {
      for (let minute = 0; minute < 60; minute += intervalMinutes) {
        if (hour === maxHour && minute > 0) break;
        
        const hourStr = String(hour).padStart(2, '0');
        const minuteStr = String(minute).padStart(2, '0');
        const value = `${hourStr}:${minuteStr}`;
        
        // Format for display (12-hour format)
        const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const period = hour < 12 ? 'AM' : 'PM';
        const label = `${hour12}:${minuteStr} ${period}`;
        
        slots.push({ value, label });
      }
    }
    
    return slots;
  }, [minHour, maxHour, intervalMinutes]);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {label}
        </label>
      )}
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {timeSlots.map((slot) => (
            <SelectItem key={slot.value} value={slot.value}>
              {slot.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Quick time buttons for common selections
interface QuickTimeButtonsProps {
  onSelect: (time: string) => void;
  selectedTime?: string;
}

export function QuickTimeButtons({ onSelect, selectedTime }: QuickTimeButtonsProps) {
  const quickTimes = [
    { label: '9:00 AM', value: '09:00' },
    { label: '12:00 PM', value: '12:00' },
    { label: '3:00 PM', value: '15:00' },
    { label: '6:00 PM', value: '18:00' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {quickTimes.map((time) => (
        <button
          key={time.value}
          type="button"
          onClick={() => onSelect(time.value)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            selectedTime === time.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          )}
        >
          {time.label}
        </button>
      ))}
    </div>
  );
}