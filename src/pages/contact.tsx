import { useTranslation } from "react-i18next";
import LegalArticle from "@/components/LegalArticle";
import SEO from "@/components/SEO";

const ContactPage = () => {
  const { t } = useTranslation();
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://dajavshne.ge';
  
  return (
    <>
      <SEO
        title="Contact Us - Dajavshne"
        description="Get in touch with Dajavshne. Contact our support team for help with bookings, venue partnerships, or any questions about our gaming venue booking platform."
        canonical={`${siteUrl}/contact`}
        keywords={['contact Dajavshne', 'customer support', 'contact us', 'help']}
      />
      <LegalArticle slug="contact" fallbackTitle={t('footer.contact')} />
    </>
  );
};

export default ContactPage;


