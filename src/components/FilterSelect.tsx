import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  label?: string;
}

const FilterSelect = ({ value, onValueChange, options, placeholder, label }: FilterSelectProps) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-xs text-muted-foreground uppercase tracking-wider">
          {label}
        </label>
      )}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full h-11 bg-card border-border text-foreground">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-card border-border z-50">
          {options.map((option) => (
            <SelectItem 
              key={option} 
              value={option}
              className="text-foreground hover:bg-secondary focus:bg-secondary"
            >
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default FilterSelect;
