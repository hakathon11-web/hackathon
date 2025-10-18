import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Gamepad2, Stethoscope, Heart, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import SEO from '@/components/SEO';

interface Category {
  id: string;
  name: string;
  nameKey: string;
  description: string;
  descriptionKey: string;
  route: string;
  icon: typeof Gamepad2;
  color: string;
  gradient: string;
}

const CategoryLandingPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const categories: Category[] = [
    {
      id: 'gaming',
      name: 'Gaming',
      nameKey: 'categories.gaming.name',
      description: 'Gaming venues and entertainment',
      descriptionKey: 'categories.gaming.description',
      route: '/gaming',
      icon: Gamepad2,
      color: 'text-blue-600',
      gradient: 'from-blue-500 to-purple-600'
    },
    {
      id: 'dental',
      name: 'Dental',
      nameKey: 'categories.dental.name',
      description: 'Dental clinics and oral care services',
      descriptionKey: 'categories.dental.description',
      route: '/dental',
      icon: Stethoscope,
      color: 'text-green-600',
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      id: 'wellness-spa',
      name: 'Wellness & Spa',
      nameKey: 'categories.wellness-spa.name',
      description: 'Spa treatments and wellness services',
      descriptionKey: 'categories.wellness-spa.description',
      route: '/wellness-spa',
      icon: Heart,
      color: 'text-pink-600',
      gradient: 'from-pink-500 to-rose-600'
    }
  ];

  return (
    <>
      <SEO 
        title={t('categories.welcomeTitle')}
        description={t('categories.welcomeDescription')}
      />
      
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-12 md:py-20">
          {/* Header Section */}
          <div className="text-center mb-12 md:mb-16">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6">
              {t('categories.welcomeTitle')}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {t('categories.welcomeDescription')}
            </p>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            {categories.map((category) => {
              const IconComponent = category.icon;
              
              return (
                <Card
                  key={category.id}
                  className="group cursor-pointer overflow-hidden border-2 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 hover:shadow-2xl hover:scale-105"
                  onClick={() => navigate(category.route)}
                >
                  <CardContent className="p-0">
                    {/* Gradient Header */}
                    <div className={`h-32 bg-gradient-to-br ${category.gradient} relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <IconComponent className="w-16 h-16 text-white drop-shadow-lg" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h2 className={`text-2xl font-bold mb-3 ${category.color} group-hover:underline`}>
                        {t(category.nameKey)}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-300 mb-4">
                        {t(category.descriptionKey)}
                      </p>
                      
                      {/* Explore Button */}
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold ${category.color}`}>
                          {t('categories.explore')}
                        </span>
                        <ArrowRight className={`w-5 h-5 ${category.color} group-hover:translate-x-1 transition-transform duration-300`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Footer Note */}
          <div className="text-center mt-12 md:mt-16">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('categories.comingSoon')}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default CategoryLandingPage;
