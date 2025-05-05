import React, { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';

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

  const handlePriceChange = (values: number[]) => {
    const newValues: [number, number] = [values[0], values[1]];
    setPriceRange(newValues);
    if (onChange) {
      onChange(newValues);
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
        <Slider 
          min={minPrice}
          max={maxPrice}
          step={10}
          value={priceRange}
          onValueChange={handlePriceChange}
          className="mb-6"
        />

        <div className="flex justify-between items-center mb-4">
          <div className="text-sm font-medium">
            R$ {priceRange[0].toFixed(2).replace('.', ',')}
          </div>
          <div className="text-sm font-medium">
            R$ {priceRange[1].toFixed(2).replace('.', ',')}
          </div>
        </div>

        <button 
          onClick={handleApplyFilter}
          className="w-full bg-primary text-white py-2 px-4 rounded hover:bg-primary/90 transition-colors"
        >
          Aplicar Filtro
        </button>
      </div>
    </div>
  );
};

export default PriceFilter;