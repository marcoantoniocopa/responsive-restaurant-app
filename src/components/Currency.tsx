import { useSettings } from '../contexts/SettingsContext';

interface CurrencyProps {
  amount: number;
  decimals?: number;
}

export function Currency({ amount, decimals = 2 }: CurrencyProps) {
  const { currencySymbol } = useSettings();
  
  // Format number with LATAM format: 1.234,56
  const formatNumber = (num: number, dec: number): string => {
    const parts = num.toFixed(dec).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const decimalPart = parts[1];
    return `${integerPart},${decimalPart}`;
  };
  
  return (
    <span>
      {currencySymbol} {formatNumber(amount, decimals)}
    </span>
  );
}

