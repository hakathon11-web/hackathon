import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getLegalHtml, LegalSlug } from "@/lib/legal";

interface LegalArticleProps {
  slug: LegalSlug;
  fallbackTitle: string;
}

const LegalArticle = ({ slug, fallbackTitle }: LegalArticleProps) => {
  const { i18n } = useTranslation();

  const html = useMemo(() => getLegalHtml(slug, i18n.language), [slug, i18n.language]);
  // TOC removed per request

  if (!html) {
    return (
      <div className="responsive-container py-10">
        <h1 className="text-2xl font-semibold mb-4">{fallbackTitle}</h1>
        <p className="text-muted-foreground">Content not added yet. Paste it in src/legal/&lt;ka|en&gt;/{slug}.html</p>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="responsive-container py-8">
        <div>
          <article className="max-w-none">
            <div className="rounded-2xl border border-border bg-card shadow-sm p-6 md:p-8">
              <style>
                {`.legal-table { width: 100%; border-collapse: collapse; }
                  .legal-table th, .legal-table td { border: 1px solid #e5e7eb; padding: 8px; }
                  .legal-table th { background: #f9fafb; font-weight: 600; }
                  #legal-article-content h1,
                  #legal-article-content h2,
                  #legal-article-content h3,
                  #legal-article-content h4,
                  #legal-article-content h5,
                  #legal-article-content h6 { font-weight: 700; }
                  /* Increase main heading sizes for better hierarchy */
                  #legal-article-content h1 { font-size: 2rem; line-height: 2.4rem; margin-bottom: 1rem; }
                  #legal-article-content h2 { font-size: 1.5rem; line-height: 2rem; margin-top: 1.25rem; margin-bottom: 0.75rem; }
                  #legal-article-content ul { list-style: disc; padding-left: 1.5rem; margin-left: 0; }
                  #legal-article-content ol { list-style: decimal; padding-left: 1.5rem; margin-left: 0; }
                  #legal-article-content li { margin: 0.25rem 0; }
                `}
              </style>
              <div id="legal-article-content" className="prose prose-gray max-w-none">
                {/* eslint-disable-next-line react/no-danger */}
                <div dangerouslySetInnerHTML={{ __html: html }} />
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
};

export default LegalArticle;


