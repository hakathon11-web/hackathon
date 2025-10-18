import { useTranslation } from "react-i18next";
import LegalArticle from "@/components/LegalArticle";
import SEO from "@/components/SEO";

const AboutPage = () => {
  const { t } = useTranslation();
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://dajavshne.ge';
  
  return (
    <>
      <SEO
        title="About Us - Dajavshne"
        description="Learn about Dajavshne - Georgia's leading gaming venue booking platform. Discover console rooms, VR zones, PC gaming cafes and more with easy online booking."
        canonical={`${siteUrl}/about`}
        keywords={['about Dajavshne', 'gaming venue platform', 'booking platform Georgia', 'about us']}
      />
      <LegalArticle slug="about" fallbackTitle={t('footer.aboutUs')} />
    </>
  );
};

export default AboutPage;


