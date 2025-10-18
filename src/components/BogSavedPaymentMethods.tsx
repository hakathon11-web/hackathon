import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, CreditCard, Info } from "lucide-react";
import { useBogSavedCards, BogSavedCard } from "@/hooks/useBogSavedCards";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BogSavedPaymentMethodsProps {
  onPaymentMethodSelect?: (paymentMethod: BogSavedCard | null) => void;
  selectedPaymentMethodId?: string;
  showAddNew?: boolean;
}

const BogSavedPaymentMethods = ({ 
  onPaymentMethodSelect, 
  selectedPaymentMethodId,
  showAddNew = true 
}: BogSavedPaymentMethodsProps) => {
  const { t } = useTranslation();
  const { 
    savedCards, 
    loading, 
    deleteSavedCard
  } = useBogSavedCards();
  
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getCardIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return '💳';
      case 'mastercard':
      case 'mc':
        return '💳';
      case 'amex':
        return '💳';
      default:
        return '💳';
    }
  };

  const formatCardBrand = (brand: string) => {
    if (brand === 'mc') return 'Mastercard';
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  const formatSavedType = (savedType: string) => {
    switch (savedType) {
      case 'recurrent':
        return 'Recurring';
      case 'subscription':
        return 'Auto-pay';
      default:
        return savedType;
    }
  };

  const handlePaymentMethodClick = (paymentMethod: BogSavedCard) => {
    onPaymentMethodSelect?.(paymentMethod);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteSavedCard(deleteId);
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/20 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {savedCards.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-foreground">{t('payment.savedMethods')}</h4>
          {savedCards.map((card) => (
            <Card
              key={card.id}
              className={`cursor-pointer transition-all duration-200 ${
                selectedPaymentMethodId === card.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => handlePaymentMethodClick(card)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {getCardIcon(card.card_brand)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {formatCardBrand(card.card_brand)} •••• {card.card_last4}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {formatSavedType(card.saved_type)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t('payment.expires')} {card.card_exp_month?.toString().padStart(2, '0')}/{card.card_exp_year}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(card.id);
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {savedCards.length === 0 && (
        <div className="text-center py-8 space-y-3">
          <CreditCard className="w-12 h-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="font-medium text-foreground">No saved payment methods</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Saved cards will appear here after you complete a payment with "Save card" checked.
            </p>
          </div>
        </div>
      )}

      {showAddNew && (
        <div className="bg-muted/30 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">How to save payment methods</h4>
              <p className="text-sm text-muted-foreground">
                To save a payment method with BOG, check "Save card for future payments" during checkout. 
                Your card will be securely saved by BOG for faster payments on future bookings.
              </p>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('payment.deleteMethod')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('payment.deleteMethodConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BogSavedPaymentMethods;
