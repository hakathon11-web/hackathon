import { useTranslation } from "react-i18next";
import LegalArticle from "@/components/LegalArticle";
import SEO from "@/components/SEO";

const RefundPolicyPage = () => {
  const { t } = useTranslation();
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://dajavshne.ge';
  
  return (
    <>
      <SEO
        title="Refund Policy - Dajavshne"
        description="Dajavshne's refund policy. Understand your rights and our cancellation policy for gaming venue bookings."
        canonical={`${siteUrl}/refund-policy`}
        keywords={['refund policy', 'cancellation policy', 'booking refund', 'money back']}
      />
      <LegalArticle slug="refund-policy" fallbackTitle={t('footer.refundPolicy')} />
    </>
  );
};

export default RefundPolicyPage;


