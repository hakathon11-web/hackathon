import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
// Stripe removed
import BogSavedPaymentMethods from "@/components/BogSavedPaymentMethods";
import { useAuth } from "@/hooks/useAuth";

// Stripe removed

const PaymentMethods = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">Please sign in to manage your payment methods.</p>
          <Button onClick={() => navigate('/')}>Return to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold gradient-text">Payment Methods</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Manage Your Payment Methods</CardTitle>
            <p className="text-sm text-muted-foreground">
              Add, remove, and manage your saved payment methods for faster checkout.
            </p>
          </CardHeader>
          <CardContent>
            {/* SavedPaymentMethods not applicable for BOG redirect; hide add-new */}
            <BogSavedPaymentMethods showAddNew={false} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentMethods;