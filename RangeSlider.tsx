import React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

interface RangeSliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  className?: string;
  formatValue?: (value: number) => string;
  showValues?: boolean;
}

const RangeSlider = React.forwardRef
  React.ElementRef<typeof SliderPrimitive.Root>,
  RangeSliderProps
>(({ className, formatValue, showValues = false, ...props }, ref) => {
  const defaultFormatValue = (value: number) => `${value}`;
  const formatter = formatValue || defaultFormatValue;

  return (
    <div className="space-y-2">
      {showValues && props.value && Array.isArray(props.value) && (
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">{formatter(props.value[0])}</span>
          {props.value.length > 1 && (
            <span className="text-sm text-gray-500">{formatter(props.value[1])}</span>
          )}
        </div>
      )}

      <SliderPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          className
        )}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>

        {props.value && Array.isArray(props.value) && props.value.map((_, index) => (
          <SliderPrimitive.Thumb
            key={index}
            className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            aria-label={index === 0 ? "Minimum" : "Maximum"}
          />
        ))}
      </SliderPrimitive.Root>
    </div>
  );
});

RangeSlider.displayName = "RangeSlider";

export default RangeSlider;