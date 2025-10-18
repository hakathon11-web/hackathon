import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import BookingHistory from "@/components/BookingHistory";
import { useAuth } from "@/hooks/useAuth";
import AuthDialog from "@/components/AuthDialog";
import Header from "@/components/Header";
import PrivacyPolicyDialog from "@/components/PrivacyPolicyDialog";
import { useState } from "react";

const BookingHistoryPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-indigo-50 dark:from-gray-900 dark:via-background dark:to-gray-800">
        <Header />

        {/* Hero Section */}
        <section className="pt-24 pb-16">
          <div className="responsive-container">
            <div className="text-center max-w-3xl mx-auto">
              {/* Icon */}
              <div className="w-20 h-20 bg-gradient-to-br from-primary via-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl">
                <Calendar className="w-10 h-10 text-white" />
              </div>
              
              {/* Heading */}
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
                {t('booking.yourBookings', 'Your Booking History')}
              </h1>
              
              {/* Subtitle */}
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                {t('auth.signInToViewBookings', 'Sign in to view and manage all your venue bookings in one place.')}
              </p>
              
              {/* Auth Button */}
              <AuthDialog>
                <Button size="lg" className="text-lg px-8 py-4 h-auto">
                  {t('common.signIn', 'Sign In')}
                </Button>
              </AuthDialog>
              
              {/* Features */}
              <div className="grid md:grid-cols-3 gap-8 mt-16 text-left">
                <div className="bg-card p-6 rounded-xl shadow-md border border-border">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t('booking.trackBookings', 'Track Your Bookings')}
                  </h3>
                  <p className="text-gray-600">
                    {t('booking.trackBookingsDesc', 'Monitor all your venue bookings with real-time status updates.')}
                  </p>
                </div>
                
                <div className="bg-card p-6 rounded-xl shadow-md border border-border">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <ArrowLeft className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t('booking.easyRebooking', 'Easy Rebooking')}
                  </h3>
                  <p className="text-gray-600">
                    {t('booking.easyRebookingDesc', 'Quickly rebook your favorite venues with just one click.')}
                  </p>
                </div>
                
                <div className="bg-card p-6 rounded-xl shadow-md border border-border">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t('booking.leaveReviews', 'Leave Reviews')}
                  </h3>
                  <p className="text-gray-600">
                    {t('booking.leaveReviewsDesc', 'Share your experience and help other gamers find great venues.')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Back Navigation */}
      <div className="bg-background border-b border-border">
        <div className="responsive-container py-4">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.backToHome', 'Back to Home')}
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="responsive-container py-8">
        <BookingHistory />
      </main>
    </div>
  );
};

export default BookingHistoryPage;