import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Calendar } from "lucide-react";

interface DateRangeFilterProps {
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  customStart?: string;
  customEnd?: string;
  onCustomStartChange?: (start: string) => void;
  onCustomEndChange?: (end: string) => void;
}

export function DateRangeFilter({
  dateRange,
  onDateRangeChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange
}: DateRangeFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-muted-foreground" />
      <Select value={dateRange} onValueChange={onDateRangeChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Seleziona periodo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tutti i dati</SelectItem>
          <SelectItem value="7d">Ultima settimana</SelectItem>
          <SelectItem value="30d">Ultimo mese</SelectItem>
          <SelectItem value="90d">Ultimi 3 mesi</SelectItem>
          <SelectItem value="1y">Ultimo anno</SelectItem>
          <SelectItem value="current_year">Anno corrente</SelectItem>
          <SelectItem value="previous_year">Anno precedente</SelectItem>
          <SelectItem value="custom">Intervallo personalizzato</SelectItem>
        </SelectContent>
      </Select>
      
      {dateRange === 'custom' && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={customStart || ''}
            onChange={(e) => onCustomStartChange?.(e.target.value)}
            className="w-[150px]"
          />
          <span className="text-muted-foreground">→</span>
          <Input
            type="date"
            value={customEnd || ''}
            onChange={(e) => onCustomEndChange?.(e.target.value)}
            className="w-[150px]"
          />
        </div>
      )}
    </div>
  );
}

