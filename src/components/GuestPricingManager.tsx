import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export interface GuestPricingRule {
  maxGuests: number;
  price: number | null;
}

interface GuestPricingManagerProps {
  rules: GuestPricingRule[];
  onRulesChange: (rules: GuestPricingRule[]) => void;
  guestLabel?: string;
  tableLabel?: string;
}

export const GuestPricingManager = ({ rules, onRulesChange, guestLabel, tableLabel }: GuestPricingManagerProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // Use custom guest label or fallback to translation
  const displayGuestLabel = guestLabel || t('pricing.guest');
  const displayTableLabel = tableLabel || t('pricing.table');
  const [nextGuestCount, setNextGuestCount] = useState(1);

  // Initialize with 1 guest if no rules exist
  if (rules.length === 0) {
    onRulesChange([{ maxGuests: 1, price: null }]);
  }

  // Calculate the next guest count to add
  const getNextGuestCount = () => {
    if (rules.length === 0) return 2;
    const maxGuests = Math.max(...rules.map(rule => rule.maxGuests));
    return maxGuests + 1;
  };

  const addPricingRule = () => {
    const nextCount = getNextGuestCount();
    const newRule = { maxGuests: nextCount, price: null };
    const updatedRules = [...rules, newRule].sort((a, b) => a.maxGuests - b.maxGuests);
    onRulesChange(updatedRules);
    setNextGuestCount(nextCount + 1);
  };

  const removeRule = (index: number) => {
    if (rules.length === 1) {
      toast({
        title: "Cannot remove",
        description: "At least one pricing rule is required",
        variant: "destructive",
      });
      return;
    }
    
    const updatedRules = rules.filter((_, i) => i !== index);
    onRulesChange(updatedRules);
  };

  const updateRule = (index: number, field: 'maxGuests' | 'price', value: number) => {
    const updatedRules = rules.map((rule, i) => 
      i === index ? { ...rule, [field]: value } : rule
    );
    onRulesChange(updatedRules.sort((a, b) => a.maxGuests - b.maxGuests));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label className="text-base font-medium">{t('partner.guestPricing.title', { guest: displayGuestLabel })}</Label>
        
        {rules.map((rule, index) => (
          <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">
                {rule.maxGuests === 1 
                  ? t('partner.guestPricing.priceForGuest', { count: rule.maxGuests, guest: displayGuestLabel })
                  : t('partner.guestPricing.priceForGuests', { count: rule.maxGuests, guest: displayGuestLabel })
                }
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={rule.price ?? ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    updateRule(index, 'price', null as unknown as number);
                  } else {
                    const parsed = parseFloat(raw);
                    updateRule(index, 'price', Number.isNaN(parsed) ? (null as unknown as number) : parsed);
                  }
                }}
                className="mt-1"
                placeholder={t('partner.guestPricing.enterPrice')}
              />
            </div>
            {rules.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeRule(index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <Button 
        onClick={addPricingRule} 
        variant="outline" 
        size="sm"
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        {t('partner.guestPricing.addPricingForGuests', { count: getNextGuestCount(), guest: displayGuestLabel })}
      </Button>
      
    </div>
  );
};