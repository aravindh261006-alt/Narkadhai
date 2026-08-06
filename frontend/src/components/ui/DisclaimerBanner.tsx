import { AlertTriangle } from 'lucide-react';

interface Props {
  variant?: 'donate' | 'audit' | 'general';
  className?: string;
}

const messages = {
  donate: {
    title: 'Important: Narkadhai is not a registered organization',
    body: 'Donations made through this page are voluntary contributions to an informal initiative. They are NOT eligible for tax exemption under Section 80G or any other provision. No official receipt will be issued. This is a self-reported, transparent contribution — we verify every donation against our bank/UPI statement and publish all records.',
  },
  audit: {
    title: 'Self-conducted audit — for transparency purposes only',
    body: 'Narkadhai is not a certified or registered nonprofit organization. The documents on this page are self-prepared financial records shared voluntarily for transparency. They have NOT been audited by a chartered accountant or any regulatory body.',
  },
  general: {
    title: 'Narkadhai is not a certified or registered organization',
    body: 'We are an informal initiative. Donations are voluntary and not eligible for tax exemption under any law.',
  },
};

export default function DisclaimerBanner({ variant = 'general', className = '' }: Props) {
  const msg = messages[variant];
  return (
    <div className={`disclaimer-box ${className}`} role="alert">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-800 text-sm">{msg.title}</p>
          <p className="text-amber-700 text-sm mt-1 leading-relaxed">{msg.body}</p>
        </div>
      </div>
    </div>
  );
}
