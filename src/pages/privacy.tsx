import { useTranslation } from "react-i18next";
import LegalArticle from "@/components/LegalArticle";
import SEO from "@/components/SEO";

const PrivacyPage = () => {
  const { t } = useTranslation();
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://dajavshne.ge';
  
  return (
    <>
      <SEO
        title="Privacy Policy - Dajavshne"
        description="Read Dajavshne's privacy policy. Learn how we protect your personal data and ensure secure transactions on our gaming venue booking platform."
        canonical={`${siteUrl}/privacy`}
        keywords={['privacy policy', 'data protection', 'GDPR', 'personal data']}
      />
      <LegalArticle slug="privacy" fallbackTitle={t('footer.personalDataProtection')} />
    </>
  );
};

export default PrivacyPage;


