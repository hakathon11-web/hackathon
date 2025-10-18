import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";

interface PrivacyPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
  children?: React.ReactNode;
}

const PrivacyPolicyDialog = ({ open, onOpenChange, trigger, children }: PrivacyPolicyDialogProps) => {
  const { i18n } = useTranslation();
  const isKa = i18n.language?.startsWith('ka');
  const content = (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-3">{isKa ? 'Dajavshne კონფიდენციალურობის პოლიტიკა' : 'Dajavshne Privacy Policy'}</h2>
        <p className="text-sm text-muted-foreground mb-4">{isKa ? 'ძალაში შესვლის თარიღი: ივნისი 2025' : 'Effective Date: June 2025'}</p>
        <p className="text-sm">
          {isKa ? 'Dajavshne-ში თქვენი კონფიდენციალურობა პრიორიტეტულია. ეს პოლიტიკა განმარტავს როგორ ვაგროვებთ, ვიყენებთ, ვინახავთ და ვიცავთ თქვენს პერსონალურ მონაცემებს პლატფორმის გამოყენებისას.' : 'At Dajavshne, your privacy is a top priority. This Privacy Policy explains how we collect, use, store, and protect your personal data when you use our website, mobile application, or any related services (collectively, the "Platform").'}
        </p>
        <p className="text-sm mt-2">
          {isKa ? 'Dajavshne-ის გამოყენებით თქვენ ეთანხმებით ამ პოლიტიკაში აღწერილ პირობებს.' : 'By accessing or using Dajavshne, you consent to the practices described in this policy.'}
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">{isKa ? '1. ვინ ვართ ჩვენ' : '1. Who We Are'}</h3>
        <p className="text-sm mb-2">
          {isKa ? 'Dajavshne არის ციფრული დაჯავშნის პლატფორმა, რომელიც მომხმარებლებს ეხმარება ადგილების აღმოჩენასა და დაჯავშნაში, ხოლო პარტნიორებს — ჯავშნებისა და მომხმარებელთა ურთიერთობების მართვაში.' : 'Dajavshne is a digital booking platform that enables users to discover and reserve intercity transport services and helps transport providers manage bookings and customer interactions.'}
        </p>
        <div className="text-sm">
          <p className="font-medium">{isKa ? 'მონაცემთა ოპერატორი:' : 'Data Controller:'}</p>
          <p>{isKa ? 'შპს დაჯავშნე' : 'LTD Dajavshne'}</p>
          <p>{isKa ? 'მისამართი: პეკინის გამზირი N33/6B, საბურთალო, თბილისი, საქართველო' : 'Address: Pekini Avenue N33/6B, Saburtalo district, Tbilisi, Georgia'}</p>
          <p>{isKa ? 'ელფოსტა: info@dajavshne.ge' : 'Email: info@dajavshne.ge'}</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">{isKa ? '2. რა მონაცემებს ვაგროვებთ' : '2. What Data We Collect'}</h3>
        
        <div className="mb-3">
          <h4 className="font-medium mb-1">{isKa ? 'A. მომხმარებლებისთვის:' : 'A. For Users (Passengers):'}</h4>
          <ul className="text-sm list-disc list-inside space-y-1">
            <li>Name</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Booking details (e.g., origin, destination, date, time, seat selection)</li>
            <li>Device and browser information</li>
            <li>Location data (optional and with permission)</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium mb-1">{isKa ? 'B. პარტნიორებისთვის:' : 'B. For Transport Providers (Partners):'}</h4>
          <ul className="text-sm list-disc list-inside space-y-1">
            <li>Business name and contact details</li>
            <li>Owner/manager contact information</li>
            <li>Billing details (e.g., VAT ID, payment method)</li>
            <li>Vehicle photos, routes, and other listing content</li>
            <li>Booking history and customer interactions</li>
          </ul>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">{isKa ? '3. როგორ ვიყენებთ თქვენს ინფორმაციას' : '3. How We Use Your Information'}</h3>
        <ul className="text-sm list-disc list-inside space-y-1">
          <li>Facilitate intercity transportation bookings</li>
          <li>Send confirmations, reminders, and trip updates</li>
          <li>Provide customer support</li>
          <li>Manage user accounts and provider profiles</li>
          <li>Analyze usage to improve the Platform</li>
          <li>Comply with legal and regulatory obligations</li>
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">{isKa ? '4. მონაცემთა დამუშავების სამართლებრივი საფუძველი' : '4. Legal Basis for Processing (Under GDPR)'}</h3>
        <ul className="text-sm list-disc list-inside space-y-1">
          <li><span className="font-medium">Consent:</span> When you voluntarily provide data (e.g., signing up for notifications)</li>
          <li><span className="font-medium">Contract:</span> To fulfill our obligations when you book or register with us</li>
          <li><span className="font-medium">Legal obligation:</span> For tax, fraud prevention, or compliance reasons</li>
          <li><span className="font-medium">Legitimate interests:</span> To operate and improve our services efficiently and securely</li>
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">{isKa ? '5. მონაცემების გაზიარება' : '5. Data Sharing and Disclosure'}</h3>
        <p className="text-sm mb-2">We do not sell your personal data. We may share data with:</p>
        <ul className="text-sm list-disc list-inside space-y-1">
          <li><span className="font-medium">Transport Providers:</span> Relevant booking information is shared with the provider you book</li>
          <li><span className="font-medium">Service Providers:</span> Payment processors, hosting services, SMS/email providers (bound by confidentiality agreements)</li>
          <li><span className="font-medium">Legal Authorities:</span> If required by law or to protect our rights or users</li>
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">{isKa ? '6. ქუქები და თვალთვალის ტექნოლოგიები' : '6. Cookies and Tracking Technologies'}</h3>
        <p className="text-sm mb-2">We use cookies and similar technologies to:</p>
        <ul className="text-sm list-disc list-inside space-y-1 mb-3">
          <li>Remember your preferences</li>
          <li>Analyze traffic and performance</li>
          <li>Deliver personalized content</li>
        </ul>
        <p className="text-sm mb-3">You can manage or disable cookies in your browser settings.</p>
        
        <p className="text-sm mb-2">
          We use Microsoft Clarity to better understand how users interact with our Platform. Clarity provides insights such as heatmaps, session recordings, and behavioral metrics. This data helps us improve usability and performance.
        </p>
        
        <p className="text-sm mb-2">Clarity may collect information such as:</p>
        <ul className="text-sm list-disc list-inside space-y-1 mb-3">
          <li>Clicks and scrolling behavior</li>
          <li>Device and browser type</li>
          <li>Pages visited and time spent</li>
          <li>User interactions (non-sensitive)</li>
        </ul>
        
        <p className="text-sm">
          All data collected is anonymized where appropriate and handled securely. For more information, see Microsoft's Privacy Statement.
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">{isKa ? '7. მონაცემების შენახვა' : '7. Data Retention'}</h3>
        <p className="text-sm mb-2">We retain your data to:</p>
        <ul className="text-sm list-disc list-inside space-y-1 mb-2">
          <li>Fulfill the purpose it was collected for</li>
          <li>Comply with legal and contractual obligations</li>
          <li>Resolve disputes and enforce agreements</li>
        </ul>
        <p className="text-sm">Inactive user accounts may be anonymized or deleted after a specified period.</p>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">{isKa ? '8. მონაცემების უსაფრთხოება' : '8. Data Security'}</h3>
        <p className="text-sm mb-2">We take measures to protect your data from:</p>
        <ul className="text-sm list-disc list-inside space-y-1 mb-2">
          <li>Unauthorized access</li>
          <li>Accidental loss or destruction</li>
          <li>Breach or misuse</li>
        </ul>
        <p className="text-sm">Data is transmitted over secure connections and stored in secure environments.</p>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">{isKa ? '9. თქვენი უფლებები' : '9. Your Rights'}</h3>
        <p className="text-sm mb-2">You have the right to:</p>
        <ul className="text-sm list-disc list-inside space-y-1">
          <li>Access your data</li>
          <li>Correct inaccurate or incomplete data</li>
          <li>Delete your personal data ("right to be forgotten")</li>
          <li>Restrict or object to processing</li>
          <li>Withdraw consent at any time</li>
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">{isKa ? '10. მესამე მხარეების ბმულები' : '10. Third-Party Links'}</h3>
        <p className="text-sm">
          Our Platform may contain links to third-party websites. We are not responsible for the privacy practices or content of those sites.
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">{isKa ? '11. პოლიტიკის ცვლილებები' : '11. Changes to This Policy'}</h3>
        <p className="text-sm">
          We may update this Privacy Policy from time to time. Changes will be posted here with the updated effective date. We recommend reviewing it regularly.
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">{isKa ? '12. დაგვიკავშირდით' : '12. Contact Us'}</h3>
        <p className="text-sm">
          If you have any questions about this Privacy Policy or how we handle your data, contact:
        </p>
        <p className="text-sm mt-2">Email: info@dajavshne.ge</p>
      </div>
    </div>
  );

  if (trigger || children) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger}
        {children}
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{isKa ? 'კონფიდენციალურობის პოლიტიკა' : 'Privacy Policy'}</DialogTitle>
            <DialogDescription>
              {isKa ? 'გაიგეთ როგორ ვაგროვებთ, ვიყენებთ და ვიცავთ თქვენს მონაცემებს.' : 'Learn how we collect, use, and protect your personal information.'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] w-full">
            <div className="pr-6">
              {content}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <DialogContent className="max-w-4xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle>{isKa ? 'კონფიდენციალურობის პოლიტიკა' : 'Privacy Policy'}</DialogTitle>
        <DialogDescription>
          {isKa ? 'გაიგეთ როგორ ვაგროვებთ, ვიყენებთ და ვიცავთ თქვენს მონაცემებს.' : 'Learn how we collect, use, and protect your personal information.'}
        </DialogDescription>
      </DialogHeader>
      <ScrollArea className="h-[60vh] w-full">
        <div className="pr-6">
          {content}
        </div>
      </ScrollArea>
    </DialogContent>
  );
};

export default PrivacyPolicyDialog;