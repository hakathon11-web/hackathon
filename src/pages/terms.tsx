import { useTranslation } from "react-i18next";
import LegalArticle from "@/components/LegalArticle";
import SEO from "@/components/SEO";

const TermsPage = () => {
  const { t } = useTranslation();
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://dajavshne.ge';
  
  return (
    <>
      <SEO 
        title="Terms and Conditions | Dajavshne"
        description="Read our terms and conditions for using Dajavshne booking platform. Learn about your rights and responsibilities as a user."
        url={`${siteUrl}/terms`}
      />
      <LegalArticle 
        slug="terms"
        fallbackTitle="Terms and Conditions"
      />
    </>
  );
};

export default TermsPage;
