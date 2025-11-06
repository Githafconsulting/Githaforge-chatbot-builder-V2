import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronDown } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface CompactDateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  maxDate?: Date;
  minDate?: Date;
  label?: string;
}

type PresetValue = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

export const CompactDateRangePicker: React.FC<CompactDateRangePickerProps> = ({
  value,
  onChange,
  maxDate = new Date(),
  minDate,
  label
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetValue>('this_month');
  const [startDate, setStartDate] = useState<Date | null>(value.startDate);
  const [endDate, setEndDate] = useState<Date | null>(value.endDate);

  // Update internal state when value changes externally
  useEffect(() => {
    setStartDate(value.startDate);
    setEndDate(value.endDate);
  }, [value]);

  const getPresetRange = (preset: PresetValue): DateRange | null => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (preset) {
      case 'today':
        return { startDate: today, endDate: new Date() };

      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { startDate: yesterday, endDate: yesterday };

      case 'this_week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { startDate: weekStart, endDate: new Date() };

      case 'last_week':
        const lastWeekEnd = new Date(today);
        lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
        return { startDate: lastWeekStart, endDate: lastWeekEnd };

      case 'this_month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { startDate: monthStart, endDate: new Date() };

      case 'last_month':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        return { startDate: lastMonthStart, endDate: lastMonthEnd };

      default:
        return null;
    }
  };

  const presets: { label: string; value: PresetValue }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This week', value: 'this_week' },
    { label: 'Last week', value: 'last_week' },
    { label: 'This month', value: 'this_month' },
    { label: 'Last month', value: 'last_month' },
  ];

  const handlePresetClick = (preset: PresetValue) => {
    setSelectedPreset(preset);
    const range = getPresetRange(preset);
    if (range) {
      setStartDate(range.startDate);
      setEndDate(range.endDate);
    }
  };

  const handleDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
    setSelectedPreset('custom');
  };

  const handleApply = () => {
    if (startDate && endDate) {
      onChange({ startDate, endDate });
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    setStartDate(value.startDate);
    setEndDate(value.endDate);
    setIsOpen(false);
  };

  const formatDateRange = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const start = value.startDate.toLocaleDateString(undefined, options);
    const end = value.endDate.toLocaleDateString(undefined, options);
    return `${start} - ${end}`;
  };

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 hover:bg-slate-700 hover:border-slate-600 transition-all shadow-sm text-xs"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Calendar size={13} className="text-primary-400" />
        <span className="text-xs font-medium whitespace-nowrap">
          {label || formatDateRange()}
        </span>
        <ChevronDown
          size={11}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancel}
              className="fixed inset-0 z-40"
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full mt-2 left-0 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-3">
                {/* Preset Buttons - 2 columns for better fit */}
                <div className="mb-3">
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Quick Select</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {presets.map((preset) => (
                      <motion.button
                        key={preset.value}
                        onClick={() => handlePresetClick(preset.value)}
                        className={`px-2 py-1.5 rounded text-[10px] font-medium transition-all ${
                          selectedPreset === preset.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                        }`}
                        whileTap={{ scale: 0.95 }}
                      >
                        {preset.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Calendar */}
                <div className="compact-datepicker mb-3">
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Select Range</p>
                  <DatePicker
                    selected={startDate}
                    onChange={handleDateChange}
                    startDate={startDate}
                    endDate={endDate}
                    selectsRange
                    inline
                    monthsShown={1}
                    maxDate={maxDate}
                    minDate={minDate}
                  />
                </div>

                {/* Selected Range Display */}
                {startDate && endDate && (
                  <div className="mb-3">
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Selected</p>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 px-2 py-1 bg-slate-900/70 border border-slate-700 rounded text-slate-200 text-[10px] text-center">
                        {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <span className="text-slate-500 text-xs">→</span>
                      <div className="flex-1 px-2 py-1 bg-slate-900/70 border border-slate-700 rounded text-slate-200 text-[10px] text-center">
                        {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-1.5">
                  <motion.button
                    onClick={handleCancel}
                    className="flex-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[10px] font-medium transition-colors"
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={handleApply}
                    disabled={!startDate || !endDate}
                    className={`flex-1 px-3 py-1.5 rounded text-[10px] font-medium transition-colors ${
                      startDate && endDate
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                    whileTap={startDate && endDate ? { scale: 0.98 } : {}}
                  >
                    Apply
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .compact-datepicker .react-datepicker {
          background-color: transparent;
          border: none;
          font-family: inherit;
          width: 100%;
        }

        .compact-datepicker .react-datepicker__month-container {
          width: 100%;
        }

        .compact-datepicker .react-datepicker__header {
          background-color: rgb(30 41 59);
          border-bottom: 1px solid rgb(51 65 85);
          padding: 8px 0;
          border-radius: 0;
        }

        .compact-datepicker .react-datepicker__current-month {
          color: rgb(226 232 240);
          font-weight: 600;
          font-size: 0.75rem;
          margin-bottom: 6px;
        }

        .compact-datepicker .react-datepicker__day-names {
          display: flex;
          justify-content: space-around;
        }

        .compact-datepicker .react-datepicker__day-name {
          color: rgb(148 163 184);
          width: 2rem;
          line-height: 2rem;
          font-size: 0.65rem;
          margin: 0;
        }

        .compact-datepicker .react-datepicker__week {
          display: flex;
          justify-content: space-around;
        }

        .compact-datepicker .react-datepicker__day {
          color: rgb(203 213 225);
          width: 2rem;
          line-height: 2rem;
          margin: 0.1rem 0;
          border-radius: 0.375rem;
          font-size: 0.7rem;
          transition: all 0.15s;
        }

        .compact-datepicker .react-datepicker__day:hover {
          background-color: rgb(51 65 85);
          color: white;
        }

        .compact-datepicker .react-datepicker__day--selected,
        .compact-datepicker .react-datepicker__day--range-start,
        .compact-datepicker .react-datepicker__day--range-end {
          background-color: rgb(37 99 235);
          color: white;
          font-weight: 600;
        }

        .compact-datepicker .react-datepicker__day--in-range {
          background-color: rgba(37, 99, 235, 0.3);
          color: rgb(203 213 225);
        }

        .compact-datepicker .react-datepicker__day--keyboard-selected {
          background-color: rgb(30 64 175);
          color: white;
        }

        .compact-datepicker .react-datepicker__day--disabled {
          color: rgb(71 85 105);
          cursor: not-allowed;
        }

        .compact-datepicker .react-datepicker__day--outside-month {
          color: rgb(71 85 105);
          opacity: 0.5;
        }

        .compact-datepicker .react-datepicker__navigation {
          top: 12px;
        }

        .compact-datepicker .react-datepicker__navigation-icon::before {
          border-color: rgb(148 163 184);
          border-width: 2px 2px 0 0;
          height: 6px;
          width: 6px;
        }

        .compact-datepicker .react-datepicker__navigation:hover *::before {
          border-color: white;
        }

        .compact-datepicker .react-datepicker__month {
          margin: 0.4rem;
        }
      `}</style>
    </div>
  );
};
