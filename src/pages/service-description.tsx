import { useTranslation } from "react-i18next";
import LegalArticle from "@/components/LegalArticle";
import SEO from "@/components/SEO";

const ServiceDescriptionPage = () => {
  const { t } = useTranslation();
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://dajavshne.ge';
  
  return (
    <>
      <SEO
        title="Service Description - Dajavshne"
        description="Learn about Dajavshne's services. How our gaming venue booking platform works, features, and benefits for both customers and venue partners."
        canonical={`${siteUrl}/service-description`}
        keywords={['service description', 'how it works', 'platform features', 'booking service']}
      />
      <LegalArticle slug="service-description" fallbackTitle={t('footer.serviceDescription')} />
    </>
  );
};

export default ServiceDescriptionPage;


