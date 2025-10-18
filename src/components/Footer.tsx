import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-background border-t border-border py-8">
      <div className="responsive-container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start space-x-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow">
                <span className="text-white font-bold">D</span>
              </div>
              <span className="font-semibold text-foreground">Dajavshne</span>
            </div>
          </div>

          <nav className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-muted-foreground">
            <Link to="/about" className="hover:text-foreground transition-colors">
              {t('footer.aboutUs')}
            </Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">
              {t('footer.contact')}
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              {t('footer.termsAndConditions')}
            </Link>
            <Link to="/refund-policy" className="hover:text-foreground transition-colors">
              {t('footer.refundPolicy')}
            </Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              {t('footer.personalDataProtection')}
            </Link>
            <Link to="/service-description" className="hover:text-foreground transition-colors">
              {t('footer.serviceDescription')}
            </Link>
          </nav>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-6 border-t border-border text-xs text-muted-foreground">
          <p>{t('common.copyright', { year: '2025' })}</p>
          <div className="flex items-center gap-4 mt-3 sm:mt-0">
            <a
              href="https://www.instagram.com/dajavshne/"
              aria-label="Instagram"
              className="hover:text-pink-600 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              title="Instagram - opens in a new tab"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=61581017879248"
              aria-label="Facebook"
              className="hover:text-blue-600 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              title="Facebook - opens in a new tab"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073C0 18.062 4.388 23.027 10.125 23.927v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            <a
              href="https://www.tiktok.com/@dajavshne"
              aria-label="TikTok"
              className="hover:text-foreground transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              title="TikTok - opens in a new tab"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.321 5.562a5.124 5.124 0 01-.443-.258 6.228 6.228 0 01-1.137-.966c-.849-.849-1.294-1.924-1.294-3.124V.938C16.447.42 16.025 0 15.509 0h-2.84c-.517 0-.938.42-.938.938v10.816a2.813 2.813 0 11-1.875-2.654V6.328c-3.086.48-5.469 3.142-5.469 6.422 0 3.578 2.906 6.484 6.484 6.484s6.485-2.906 6.485-6.484V8.422c1.018.613 2.198.984 3.469.984V7.031c-1.271 0-2.45-.371-3.469-.984v-1.485z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


