import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface GuestPricingRule {
  maxGuests: number;
  price: number | null;
}

interface GuestPricingRulesProps {
  rules: GuestPricingRule[];
  onRulesChange?: (rules: GuestPricingRule[]) => void;
  onChange?: (rules: GuestPricingRule[]) => void;
  maxTables?: number;
  onMaxTablesChange?: (maxTables: number) => void;
}

export const GuestPricingRules = ({ 
  rules, 
  onRulesChange, 
  onChange, 
  maxTables = 1, 
  onMaxTablesChange 
}: GuestPricingRulesProps) => {
  const { toast } = useToast();
  const [newRule, setNewRule] = useState({ maxGuests: 1, price: null as number | null });
  
  // Use either prop for updating rules
  const updateRules = onRulesChange || onChange;

  const addRule = () => {
    if (newRule.maxGuests <= 0 || (newRule.price ?? 0) < 0) {
      toast({
        title: "Invalid rule",
        description: "Please enter valid guest count and price values",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate maxGuests
    if (rules.some(rule => rule.maxGuests === newRule.maxGuests)) {
      toast({
        title: "Duplicate rule",
        description: "A rule for this guest count already exists",
        variant: "destructive",
      });
      return;
    }

    const updatedRules = [...rules, newRule].sort((a, b) => a.maxGuests - b.maxGuests);
    updateRules?.(updatedRules);
    setNewRule({ maxGuests: 1, price: null });
  };

  const removeRule = (index: number) => {
    const updatedRules = rules.filter((_, i) => i !== index);
    updateRules?.(updatedRules);
  };

  const updateRule = (index: number, field: 'maxGuests' | 'price', value: number | null) => {
    const updatedRules = rules.map((rule, i) => 
      i === index ? { ...rule, [field]: value } : rule
    );
    updateRules?.(updatedRules.sort((a, b) => a.maxGuests - b.maxGuests));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Table Configuration & Guest Pricing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Maximum Tables Setting - only show if onMaxTablesChange is provided */}
        {onMaxTablesChange && (
          <div className="space-y-2">
            <Label htmlFor="maxTables">Maximum Tables</Label>
            <Input
              id="maxTables"
              type="number"
              min="1"
              max="20"
              value={maxTables}
              onChange={(e) => onMaxTablesChange(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-32"
            />
            <p className="text-sm text-muted-foreground">
              Maximum number of tables customers can book for this service
            </p>
          </div>
        )}

        {/* Guest Pricing Rules */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Guest Pricing Rules (Per Table)</Label>
          </div>
          
          <div className="space-y-3">
            {rules.map((rule, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Max Guests</Label>
                   <Input
                    type="number"
                    min="1"
                     value={rule.maxGuests}
                     onChange={(e) => {
                       const raw = e.target.value;
                       if (raw === '') {
                         updateRule(index, 'maxGuests', null as unknown as number);
                       } else {
                         const parsed = parseInt(raw, 10);
                         updateRule(index, 'maxGuests', Number.isNaN(parsed) ? (null as unknown as number) : parsed);
                       }
                     }}
                    className="mt-1"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Price (GEL)</Label>
                   <Input
                    type="number"
                    min="0"
                    step="0.01"
                     value={rule.price ?? ''}
                     onChange={(e) => {
                       const raw = e.target.value;
                       if (raw === '') {
                         updateRule(index, 'price', null);
                       } else {
                         const parsed = parseFloat(raw);
                         updateRule(index, 'price', Number.isNaN(parsed) ? null : parsed);
                       }
                     }}
                    className="mt-1"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeRule(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add New Rule */}
          <div className="flex items-end gap-3 p-3 border-2 border-dashed rounded-lg">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Max Guests</Label>
               <Input
                type="number"
                min="1"
                 value={newRule.maxGuests}
                 onChange={(e) => {
                   const raw = e.target.value;
                   if (raw === '') {
                     setNewRule(prev => ({ ...prev, maxGuests: 1 }));
                   } else {
                     const parsed = parseInt(raw, 10);
                     setNewRule(prev => ({ ...prev, maxGuests: Number.isNaN(parsed) ? 1 : parsed }));
                   }
                 }}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Price (GEL)</Label>
               <Input
                type="number"
                min="0"
                step="0.01"
                 value={newRule.price ?? ''}
                 onChange={(e) => {
                   const raw = e.target.value;
                   if (raw === '') {
                     setNewRule(prev => ({ ...prev, price: null }));
                   } else {
                     const parsed = parseFloat(raw);
                     setNewRule(prev => ({ ...prev, price: Number.isNaN(parsed) ? null : parsed }));
                   }
                 }}
                className="mt-1"
              />
            </div>
            <Button onClick={addRule} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Rule
            </Button>
          </div>

          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p className="font-medium mb-2">How it works:</p>
            <ul className="space-y-1">
              <li>• Each rule defines the price for a specific number of guests per table</li>
              <li>• The system will select the lowest rule that accommodates the guest count</li>
              <li>• If multiple tables are booked, each table is priced individually</li>
              <li>• Example: 2 tables with 2 guests each = 2 × (price for 2 guests)</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};