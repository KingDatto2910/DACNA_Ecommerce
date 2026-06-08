"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  disabled?: (date: Date) => boolean;
  mode?: "single";
}

function Calendar({
  selected,
  onSelect,
  disabled,
  mode = "single",
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(
    selected || new Date()
  );

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  const days = [];
  const totalDays = daysInMonth(currentMonth);
  const firstDay = firstDayOfMonth(currentMonth);

  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add days of month
  for (let i = 1; i <= totalDays; i++) {
    days.push(i);
  }

  const isDateSelected = (day: number) => {
    if (!selected) return false;
    return (
      selected.getFullYear() === currentMonth.getFullYear() &&
      selected.getMonth() === currentMonth.getMonth() &&
      selected.getDate() === day
    );
  };

  const isDateDisabled = (day: number) => {
    if (!disabled) return false;
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    return disabled(date);
  };

  const handleDayClick = (day: number) => {
    if (!isDateDisabled(day) && onSelect) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      );
      onSelect(date);
    }
  };

  const monthYear = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="p-3 space-y-4">
      <div className="space-y-4">
        {/* Month/Year Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevMonth}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-7 w-7 p-0"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-semibold">{monthYear}</h2>
          <button
            onClick={nextMonth}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-7 w-7 p-0"
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 gap-1">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-gray-500"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="h-9" />;
            }

            const isSelected = isDateSelected(day);
            const isDis = isDateDisabled(day);

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                disabled={isDis}
                className={cn(
                  "h-9 w-9 rounded text-sm transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : isDis
                    ? "text-gray-300 cursor-not-allowed"
                    : "hover:bg-accent cursor-pointer"
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { Calendar };
export type { CalendarProps };
