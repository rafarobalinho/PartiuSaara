import React, { useState, useEffect } from 'react';
import RangeSlider from '@/components/ui/RangeSlider';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

interface PriceFilterProps {
  minPrice?: number;
  maxPrice?: number;
  defaultValue?: [number, number];
  onChange?: (values: [number, number]) => void;
  onFilterApply?: () => void;
}

const PriceFilter: React.FC<PriceFilterProps> = ({
  minPrice = 0,
  maxPrice = 1000,
  defaultValue = [0, 1000],
  onChange,
  onFilterApply
}) => {
  const [priceRange, setPriceRange] = useState<[number, number]>(defaultValue);

  useEffect(() => {
    setPriceRange(defaultValue);
  }, [defaultValue]);

  const handlePriceChange = (values: [number, number]) => {
    setPriceRange(values);
    if (onChange) {
      onChange(values);
    }
  };

  const handleApplyFilter = () => {
    if (onFilterApply) {
      onFilterApply();
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm">Faixa de Preço</h3>

      <div className="py-2">
        <RangeSlider 
          min={minPrice}
          max={maxPrice}
          step={10}
          value={priceRange}
          onChange={handlePriceChange}
          formatValue={formatCurrency}
        />

        <div className="mt-4">
          <Button 
            onClick={handleApplyFilter}
            className="w-full bg-primary text-white py-2 px-4 rounded hover:bg-primary/90 transition-colors"
          >
            Aplicar Filtro
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PriceFilter;