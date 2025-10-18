import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, MessageSquare, X, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

interface FloatingHelpButtonProps {
  onOpenSupport: () => void;
}

const FloatingHelpButton: React.FC<FloatingHelpButtonProps> = ({ onOpenSupport }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Only show for logged-in users
  if (!user) {
    return null;
  }

  const handleClick = () => {
    setShowTooltip(false);
    onOpenSupport();
  };

  return (
    <>
      {/* Floating Help Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 260, 
          damping: 20,
          delay: 1 // Appear after 1 second to not be intrusive
        }}
      >
        {/* Tooltip */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 10 }}
              className="absolute bottom-full right-0 mb-2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap shadow-lg"
            >
              {t('support.helpButton.tooltip', 'Need help? Contact support')}
              <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Button */}
        <motion.button
          onClick={handleClick}
          onMouseEnter={() => {
            setIsHovered(true);
            setShowTooltip(true);
          }}
          onMouseLeave={() => {
            setIsHovered(false);
            setShowTooltip(false);
          }}
          className="relative group w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Animated Background Pulse */}
          <motion.div
            className="absolute inset-0 bg-blue-400 rounded-full opacity-30"
            animate={{
              scale: isHovered ? [1, 1.3, 1] : 1,
              opacity: isHovered ? [0.3, 0.1, 0.3] : 0.3,
            }}
            transition={{
              duration: 2,
              repeat: isHovered ? Infinity : 0,
              ease: "easeInOut",
            }}
          />

          {/* Icon with Animation */}
          <motion.div
            animate={{ rotate: isHovered ? 360 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <HelpCircle className="w-6 h-6" />
          </motion.div>

          {/* Notification Dot (optional - can be used to show unread messages) */}
          {/* <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div> */}
        </motion.button>

        {/* Subtle Glow Effect */}
        <motion.div
          className="absolute inset-0 bg-blue-600 rounded-full blur-md opacity-20 -z-10"
          animate={{
            scale: isHovered ? 1.4 : 1,
            opacity: isHovered ? 0.3 : 0.2,
          }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>

      {/* Quick Access Menu (Optional Enhancement) */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-40 flex flex-col gap-2"
          >
            {/* Quick Contact Button */}
            <motion.button
              onClick={onOpenSupport}
              className="w-12 h-12 bg-white hover:bg-gray-50 text-gray-700 rounded-full shadow-lg border border-gray-200 flex items-center justify-center transition-colors duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <MessageSquare className="w-5 h-5" />
            </motion.button>

            {/* FAQ Button (Future Enhancement) */}
            {/* <motion.button
              className="w-12 h-12 bg-white hover:bg-gray-50 text-gray-700 rounded-full shadow-lg border border-gray-200 flex items-center justify-center transition-colors duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <BookOpen className="w-5 h-5" />
            </motion.button> */}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingHelpButton;