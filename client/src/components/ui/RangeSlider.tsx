import React from 'react';
import { Slider } from '@/components/ui/slider';

interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  defaultValue?: [number, number];
  value: [number, number];
  onChange: (values: [number, number]) => void;
  formatValue?: (value: number) => string;
}

const RangeSlider: React.FC<RangeSliderProps> = ({
  min,
  max,
  step = 1,
  defaultValue = [min, max],
  value,
  onChange,
  formatValue = (val) => val.toString()
}) => {
  const handleChange = (newValues: number[]) => {
    if (newValues.length === 2) {
      onChange([newValues[0], newValues[1]]);
    }
  };

  return (
    <div className="space-y-4">
      <Slider
        min={min}
        max={max}
        step={step}
        defaultValue={defaultValue}
        value={value}
        onValueChange={handleChange}
        className="mb-2"
      />
      
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium text-gray-700">
          {formatValue(value[0])}
        </div>
        <div className="text-sm font-medium text-gray-700">
          {formatValue(value[1])}
        </div>
      </div>
    </div>
  );
};

export default RangeSlider;