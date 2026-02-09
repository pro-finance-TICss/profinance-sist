import { Info } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

interface CurrencyDisclaimerProps {
  className?: string;
}

export function CurrencyDisclaimer({ className = "" }: CurrencyDisclaimerProps) {
  const { isConvertedView, baseCurrency, displayCurrency } = useCurrency();

  if (!isConvertedView) return null;

  return (
    <div 
      className={`flex items-start gap-2 p-3 text-xs bg-blue-50 text-blue-800 rounded-md border border-blue-100 ${className}`}
    >
      <Info size={14} className="mt-0.5 flex-shrink-0" />
      <p>
        <strong>Nota:</strong> Tu saldo real está en <strong>{baseCurrency}</strong>. 
        El valor mostrado en <strong>{displayCurrency}</strong> es una conversión estimada según la tasa de cambio actual y puede variar.
      </p>
    </div>
  );
}
