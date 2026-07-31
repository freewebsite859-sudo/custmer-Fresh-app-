import React from 'react';

interface LegalScreenProps {
  type: 'terms' | 'privacy' | 'cancellation';
  onBack: () => void;
}

export const LegalScreen: React.FC<LegalScreenProps> = ({ type, onBack }) => {
  const content = {
    terms: {
      title: "Terms & Conditions",
      intro: "These terms govern use of the Nexora marketplace, role-based apps, salon storefronts, and booking services.",
      sections: [
        ["Accounts and roles", "Each email is assigned one permanent platform role. Keep your login secure and provide accurate information."],
        ["Salon content", "Public salon information is shown only after owner approval and publication. Availability and service delivery remain the salon’s responsibility."],
        ["Payments", "Payment success, refunds, earnings, commission, settlement, and payout status are confirmed only by trusted server records."],
        ["Acceptable use", "Do not misuse the platform, impersonate another role, interfere with security, or submit unlawful content."]
      ]
    },
    privacy: {
      title: "Privacy Policy",
      intro: "Nexora uses only the information needed to provide accounts, salon discovery, bookings, payments, support, and platform security.",
      sections: [
        ["Information collected", "Account details, booking information, salon records, payment references, device/session details, and support messages may be processed."],
        ["How information is used", "Information supports authentication, booking operations, payment verification, fraud prevention, service updates, and customer support."],
        ["Access controls", "Role guards and Row Level Security restrict records to the customer, salon team, Growth Partner, or administrator entitled to access them."],
        ["Security", "Frontend apps use only the public Supabase key. Payment and privileged credentials remain server-only."]
      ]
    },
    cancellation: {
      title: "Cancellation & Refund Policy",
      intro: "Refund eligibility is decided by trusted booking and payment state, never by the frontend.",
      sections: [
        ["Customer cancellation", "Same-day customer cancellation and no-show are not refundable."],
        ["Salon cancellation", "A salon or Shop Owner cancellation qualifies the customer for a full advance refund through the verified server flow."],
        ["Service started", "A booking cannot be cancelled after service starts. The customer may open a dispute instead."],
        ["Refund timing", "Approved refunds are recorded against the original payment and remain pending until the payment provider confirms processing."]
      ]
    }
  }[type];

  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-200">
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-slate-100 text-[#5a3f47] flex items-center justify-center hover:bg-slate-200 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <span className="text-[12px] font-bold text-[#e6007e] uppercase tracking-widest">Nexora Legal</span>
      </div>

      <h1 className="text-3xl font-extrabold text-[#26181c]">{content.title}</h1>
      <p className="text-sm text-[#5a3f47] leading-relaxed italic border-l-4 border-[#e6007e] pl-4">
        {content.intro}
      </p>

      <div className="flex flex-col gap-8 mt-4">
        {content.sections.map(([heading, body]) => (
          <section key={heading} className="flex flex-col gap-2">
            <h2 className="text-lg font-bold text-[#26181c]">{heading}</h2>
            <p className="text-sm text-[#5a3f47] leading-relaxed">{body}</p>
          </section>
        ))}
      </div>

      <p className="text-[11px] text-[#8c7077] mt-8 pt-8 border-t border-[#e8e8e8]">
        Effective: 31 July 2026
      </p>
    </div>
  );
};
