import React, { useState, useEffect } from 'react';
import { Screen } from '../types';

interface SupportScreenProps {
  onBack: () => void;
  onNavigate: (screen: any) => void;
}

interface TicketMessage {
  sender: 'user' | 'executive';
  text: string;
  time: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  status: 'OPEN' | 'RESOLVED';
  date: string;
  messages: TicketMessage[];
}

export const SupportScreen: React.FC<SupportScreenProps> = ({
  onBack,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'help-home' | 'my-tickets' | 'create-ticket'>('help-home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // New ticket form state
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('Booking');
  const [newDescription, setNewDescription] = useState('');

  // Ticket detail reply input state
  const [replyText, setReplyText] = useState('');

  // Loaded/saved tickets
  const [tickets, setTickets] = useState<SupportTicket[]>(() => {
    const saved = localStorage.getItem('nexora_support_tickets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: 'NX-TK-105',
        subject: 'Reschedule slot issues',
        category: 'Booking',
        status: 'OPEN',
        date: 'Jul 24, 2026',
        messages: [
          {
            sender: 'user',
            text: 'I scheduled a Balayage treatment at Aura Premium Salon for tomorrow at 11:00 AM, but I need to push it to 2:00 PM. The app says the slot is occupied but the salon is empty.',
            time: 'Jul 24, 04:00 PM',
          },
          {
            sender: 'executive',
            text: 'Hi Priya! Let me check the real-time availability of Aura Premium Salon. We are seeing a block on their end, but let me call them directly to open up the 2:00 PM slot for you.',
            time: 'Jul 24, 04:15 PM',
          },
        ],
      },
      {
        id: 'NX-TK-104',
        subject: 'Double payment for Aura Booking',
        category: 'Payment',
        status: 'RESOLVED',
        date: 'Jul 23, 2026',
        messages: [
          {
            sender: 'user',
            text: 'Hey, my transaction failed on the first try but the money was deducted. I had to pay again to confirm the appointment. Please refund the first transaction.',
            time: 'Jul 23, 10:15 AM',
          },
          {
            sender: 'executive',
            text: 'Hi Priya, we are extremely sorry for the inconvenience. We have verified the duplicate payment of ₹1,499 in our systems. We have initiated an automatic refund to your source account. It should reflect in your bank account in 3-5 business days.',
            time: 'Jul 23, 11:30 AM',
          },
          {
            sender: 'user',
            text: 'Awesome, thank you for the speedy response!',
            time: 'Jul 23, 11:45 AM',
          },
          {
            sender: 'executive',
            text: 'You are very welcome, Priya! I will mark this ticket as resolved. Feel free to open a new one if you have any other questions. Have a fabulous salon session!',
            time: 'Jul 23, 12:00 PM',
          },
        ],
      },
    ];
  });

  // Track expanded FAQ items
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  // Sync tickets to localStorage
  useEffect(() => {
    localStorage.setItem('nexora_support_tickets', JSON.stringify(tickets));
  }, [tickets]);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const FAQS = [
    {
      category: 'Booking',
      q: 'How do I cancel a booking?',
      a: 'You can cancel your booking up to 2 hours before your appointment without any penalty. Go to your Profile, select "My Bookings", select the upcoming session, and tap "Cancel Appointment".',
    },
    {
      category: 'Payment',
      q: 'When will my refund process?',
      a: 'Refunds typically take 3-5 business days to appear on your credit card or UPI account statement, depending entirely on your bank\'s processing cycles.',
    },
    {
      category: 'Rewards',
      q: 'How do loyalty points work?',
      a: 'Earn 10 points for every ₹100 spent. 1,000 points equals a ₹100 discount on your next visit. Points expire after 12 months of inactivity.',
    },
    {
      category: 'Referral',
      q: 'How do I refer a friend?',
      a: 'Tap "Refer & Earn" in your Profile to share your unique referral code. Your friend gets ₹100 off on their first order, and you receive ₹150 once they complete their booking.',
    },
    {
      category: 'Member',
      q: 'What are Gold membership perks?',
      a: 'Gold members enjoy a 1.5x rewards multiplier, free herbal spa add-on with haircuts above ₹1200, and priority scheduling on high-demand holiday slots.',
    },
    {
      category: 'Salon',
      q: 'Is there a booking charge or convenience fee?',
      a: 'No! Nexora charges ₹0 convenience fees. You only pay for the salon services you select. We guarantee 100% price transparency.',
    },
    {
      category: 'Tech',
      q: 'Why does the map pin not show my exact house?',
      a: 'Make sure your GPS is turned on and you have given Nexora permission to access your location. You can also manually type your street address and use Landmark tips.',
    },
    {
      category: 'Other',
      q: 'Can I choose my favorite stylist?',
      a: 'Absolutely! When booking on the Salon Detail screen, scroll to "Select Stylist" and tap the photo of your preferred professional.',
    },
  ];

  const filteredFaqs = FAQS.filter((faq) => {
    const matchesSearch =
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryFilter
      ? faq.category.toLowerCase() === selectedCategoryFilter.toLowerCase()
      : true;
    return matchesSearch && matchesCategory;
  });

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDescription.trim()) {
      triggerToast('Please fill in all ticket details.');
      return;
    }

    const newTicket: SupportTicket = {
      id: `NX-TK-${Math.floor(100 + Math.random() * 900)}`,
      subject: newSubject,
      category: newCategory,
      status: 'OPEN',
      date: 'Just now',
      messages: [
        {
          sender: 'user',
          text: newDescription,
          time: 'Just now',
        },
        {
          sender: 'executive',
          text: `Hi Priya! Thank you for raising this. We have registered your ticket under category "${newCategory}" and our customer service specialist has been assigned to help you with "${newSubject}". We will review and reply within 15 minutes!`,
          time: 'Just now',
        },
      ],
    };

    setTickets((prev) => [newTicket, ...prev]);
    setNewSubject('');
    setNewDescription('');
    triggerToast('Support Ticket Created!');
    setActiveTab('my-tickets');
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedTicket) return;

    const updatedMessage: TicketMessage = {
      sender: 'user',
      text: replyText,
      time: 'Just now',
    };

    const updatedTickets = tickets.map((t) => {
      if (t.id === selectedTicket.id) {
        return {
          ...t,
          messages: [...t.messages, updatedMessage],
        };
      }
      return t;
    });

    setTickets(updatedTickets);
    setReplyText('');

    // Update selected ticket in view
    setSelectedTicket((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        messages: [...prev.messages, updatedMessage],
      };
    });

    // Simulate agent auto-reply
    setTimeout(() => {
      const systemReply: TicketMessage = {
        sender: 'executive',
        text: "Thanks for the update. I'm actively reviewing your message and will provide an update shortly. Your convenience is our highest priority!",
        time: 'Just now',
      };

      setTickets((prevTickets) =>
        prevTickets.map((t) => {
          if (t.id === selectedTicket.id) {
            return {
              ...t,
              messages: [...t.messages, systemReply],
            };
          }
          return t;
        })
      );

      setSelectedTicket((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, systemReply],
        };
      });
    }, 1500);
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'booking':
        return 'calendar_today';
      case 'payment':
        return 'credit_card';
      case 'rewards':
        return 'loyalty';
      case 'referral':
        return 'group_add';
      case 'member':
        return 'workspace_premium';
      case 'salon':
        return 'storefront';
      case 'tech':
        return 'bug_report';
      default:
        return 'more_horiz';
    }
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto pb-32 animate-in fade-in duration-200">
      {/* Toast popup */}
      {toast && (
        <div className="fixed bottom-32 mb-safe inset-x-4 z-50 bg-[#26181c] text-white px-4 py-3 rounded-xl shadow-lg border border-[#e0bec6]/30 text-xs font-semibold flex items-center gap-2 max-w-sm mx-auto animate-in slide-in-from-bottom duration-200">
          <span className="material-symbols-outlined text-[#e6007e] text-lg">check_circle</span>
          <span>{toast}</span>
        </div>
      )}

      {selectedTicket ? (
        /* Detailed Ticket Chat View */
        <div className="flex flex-col gap-4 animate-in slide-in-from-right duration-200">
          <div className="flex items-center gap-3 border-b border-[#e8e8e8] pb-4">
            <button
              onClick={() => setSelectedTicket(null)}
              className="w-10 h-10 rounded-full bg-slate-100 text-[#5a3f47] flex items-center justify-center hover:bg-slate-200 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#8c7077] uppercase tracking-wider">{selectedTicket.id}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                    selectedTicket.status === 'OPEN'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {selectedTicket.status}
                </span>
              </div>
              <h3 className="font-bold text-[16px] text-on-surface truncate">{selectedTicket.subject}</h3>
            </div>
          </div>

          <div className="flex flex-col gap-3 bg-[#fff8f8] p-4 rounded-2xl border border-[#e8e8e8] min-h-[320px] max-h-[400px] overflow-y-auto">
            {selectedTicket.messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col max-w-[85%] ${
                  msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
                }`}
              >
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#e6007e] text-white rounded-br-none'
                      : 'bg-white text-on-surface border border-[#e8e8e8] rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-[#8c7077] mt-1 px-1">{msg.time}</span>
              </div>
            ))}
          </div>

          {selectedTicket.status === 'OPEN' ? (
            <div className="flex gap-2 items-center border-t border-[#e8e8e8] pt-4">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                placeholder="Type your message..."
                className="flex-1 h-12 bg-white rounded-xl px-4 border border-[#e8e8e8] text-xs text-on-surface focus:outline-none focus:border-[#e6007e] transition-colors"
              />
              <button
                onClick={handleSendReply}
                className="w-12 h-12 bg-[#e6007e] hover:bg-[#b90064] text-white rounded-xl flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            </div>
          ) : (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 p-4 rounded-xl text-center text-xs font-semibold">
              This ticket is marked as Resolved. If you still need help, please create a new ticket.
            </div>
          )}
        </div>
      ) : (
        /* Standard Tabs Navigation Layout */
        <div className="flex flex-col gap-6">
          {activeTab === 'help-home' && (
            <div className="flex flex-col gap-6">
              {/* Heading */}
              <div className="px-page-margin-mobile pt-6 pb-4">
                <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-2">How can we help?</h2>
                <p className="font-body text-body text-on-surface-variant">Find answers or get in touch with our team.</p>
              </div>

              {/* Search Bar */}
              <div className="px-page-margin-mobile mb-stack-lg">
                <div className="relative w-full shadow-sm rounded-xl overflow-hidden bg-surface-container-highest transition-all duration-300 focus-within:shadow-md focus-within:ring-2 focus-within:ring-primary-pink/30">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-on-surface-variant">
                    <span className="material-symbols-outlined text-[20px]">search</span>
                  </div>
                  <input
                    aria-label="Search FAQs"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent h-[52px] pl-11 pr-4 font-body text-body text-on-surface placeholder-on-surface-variant/70 focus:outline-none"
                    placeholder="Search for answers..."
                    type="text"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-on-surface-variant hover:text-primary-pink"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Help Grid */}
              <div className="px-page-margin-mobile mb-stack-lg">
                <h3 className="font-title-md text-title-md text-on-surface mb-stack-md">Quick Topics</h3>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Booking', key: 'Booking' },
                    { label: 'Payment', key: 'Payment' },
                    { label: 'Rewards', key: 'Rewards' },
                    { label: 'Referral', key: 'Referral' },
                    { label: 'Member', key: 'Member' },
                    { label: 'Salon', key: 'Salon' },
                    { label: 'Tech', key: 'Tech' },
                    { label: 'Other', key: 'Other' },
                  ].map((topic) => {
                    const isSelected = selectedCategoryFilter === topic.key;
                    return (
                      <button
                        key={topic.key}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCategoryFilter(null);
                          } else {
                            setSelectedCategoryFilter(topic.key);
                            triggerToast(`Filtering FAQs by ${topic.label}`);
                          }
                        }}
                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-[18px] transition-all active:scale-95 group cursor-pointer border ${
                          isSelected
                            ? 'bg-secondary-pink border-primary-pink shadow-md'
                            : 'bg-surface-container-lowest border-transparent shadow-sm hover:shadow-md'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-primary-pink text-white'
                              : 'bg-secondary-pink text-primary-pink group-hover:bg-primary-pink group-hover:text-white'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {getCategoryIcon(topic.key)}
                          </span>
                        </div>
                        <span
                          className={`font-label-md text-[11px] text-center leading-tight transition-colors ${
                            isSelected
                              ? 'text-on-surface font-semibold'
                              : 'text-on-surface-variant group-hover:text-on-surface'
                          }`}
                        >
                          {topic.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-page-margin-mobile mb-stack-lg flex flex-col gap-3">
                <button
                  onClick={() => setActiveTab('create-ticket')}
                  className="w-full h-[52px] bg-primary-pink text-white font-title-md text-title-md rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">edit_square</span>
                  Create Support Ticket
                </button>
                <button
                  onClick={() => setActiveTab('my-tickets')}
                  className="w-full h-[52px] bg-secondary-pink text-primary-pink font-title-md text-title-md rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
                  View My Tickets
                </button>
              </div>

              {/* FAQs Accordion */}
              <div className="px-page-margin-mobile">
                <h3 className="font-title-md text-title-md text-on-surface mb-stack-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-pink">lightbulb</span>
                  Frequently Asked Questions
                </h3>

                {filteredFaqs.length === 0 ? (
                  <div className="bg-surface-container-lowest p-6 rounded-2xl text-center text-xs text-on-surface-variant">
                    No FAQs found matching your criteria. Try searching for something else or clearing the filters.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {filteredFaqs.map((faq, idx) => {
                      const isExpanded = expandedFaqIndex === idx;
                      return (
                        <div
                          key={idx}
                          onClick={() => setExpandedFaqIndex(isExpanded ? null : idx)}
                          className="bg-surface-container-lowest rounded-[18px] shadow-sm overflow-hidden cursor-pointer"
                        >
                          <div className="p-4 flex items-center justify-between gap-3">
                            <span className="font-body-md text-body-md text-on-surface font-semibold">
                              {faq.q}
                            </span>
                            <span
                              className={`material-symbols-outlined text-on-surface-variant transition-transform duration-300 transform ${
                                isExpanded ? 'rotate-180 text-primary-pink' : ''
                              }`}
                            >
                              expand_more
                            </span>
                          </div>
                          <div
                            className={`px-4 transition-all duration-300 overflow-hidden ${
                              isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                            }`}
                          >
                            <p className="font-body text-body text-on-surface-variant pb-4 pt-1">
                              {faq.a}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'my-tickets' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-[20px] font-bold text-on-surface tracking-tight">My Support Tickets</h2>
                <p className="text-[12px] text-[#5a3f47] mt-0.5">Track and respond to your active requests.</p>
              </div>

              {tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-3xl border border-[#e8e8e8]">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-[#8c7077] border border-[#e8e8e8]/50">
                    <span className="material-symbols-outlined text-[28px]">confirmation_number</span>
                  </div>
                  <h3 className="font-bold text-sm text-on-surface mt-4">No active support tickets</h3>
                  <p className="text-xs text-[#5a3f47] text-center max-w-[250px] mt-1.5 leading-relaxed">
                    Have any questions or issues with your booking? We are here to help.
                  </p>
                  <button
                    onClick={() => setActiveTab('create-ticket')}
                    className="mt-5 px-5 h-11 bg-[#e6007e] text-white font-bold text-xs rounded-xl shadow-md hover:bg-[#b90064] cursor-pointer"
                  >
                    Raise a Ticket
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className="bg-white p-4 rounded-2xl border border-[#e8e8e8] hover:border-slate-300 transition-all cursor-pointer relative overflow-hidden flex flex-col gap-2 shadow-xs"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#8c7077] tracking-wider uppercase">{t.id}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                          <span className="text-[10px] font-semibold text-[#5a3f47]">{t.category}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                            t.status === 'OPEN'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200/50'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200/50'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-xs text-on-surface leading-snug">{t.subject}</h3>
                        <p className="text-[11px] text-[#5a3f47] mt-1 line-clamp-2 leading-relaxed">
                          {t.messages[t.messages.length - 1].text}
                        </p>
                      </div>

                      <div className="flex justify-between items-center border-t border-slate-50 pt-2 mt-1">
                        <span className="text-[9px] text-[#8c7077]">{t.date}</span>
                        <span className="text-[10px] font-bold text-[#e6007e] flex items-center gap-1">
                          View details
                          <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'create-ticket' && (
            <form onSubmit={handleCreateTicket} className="flex flex-col gap-5 animate-in fade-in duration-200">
              <div>
                <h2 className="text-[20px] font-bold text-on-surface tracking-tight">Raise a Ticket</h2>
                <p className="text-[12px] text-[#5a3f47] mt-0.5">Let us know how we can make your experience perfect.</p>
              </div>

              <div className="flex flex-col gap-4">
                {/* Category Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#5a3f47] ml-0.5">Select Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Booking', 'Payment', 'Rewards', 'Referral', 'Salon', 'Tech'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewCategory(cat)}
                        className={`h-11 rounded-xl font-bold text-xs transition-all flex items-center gap-2 px-3.5 border cursor-pointer ${
                          newCategory === cat
                            ? 'bg-[#ffe8ed] border-[#e6007e] text-[#e6007e]'
                            : 'bg-white border-[#e8e8e8] text-[#5a3f47] hover:bg-slate-50'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {getCategoryIcon(cat)}
                        </span>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#5a3f47] ml-0.5" htmlFor="subject">Subject</label>
                  <input
                    id="subject"
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="e.g. Booking slot not showing"
                    className="w-full h-12 bg-white rounded-xl px-4 border border-[#e8e8e8] text-[13px] text-on-surface focus:outline-none focus:border-[#e6007e] transition-colors"
                    required
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#5a3f47] ml-0.5" htmlFor="description">Message / Description</label>
                  <textarea
                    id="description"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Explain your query in detail so our team can help you instantly."
                    rows={4}
                    className="w-full bg-white rounded-xl p-4 border border-[#e8e8e8] text-[13px] text-on-surface focus:outline-none focus:border-[#e6007e] transition-colors resize-none leading-relaxed"
                    required
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4 pt-4 border-t border-[#e8e8e8]">
                <button
                  type="button"
                  onClick={() => setActiveTab('help-home')}
                  className="flex-1 h-12 bg-white border border-[#e8e8e8] text-[#5a3f47] font-bold rounded-xl transition-colors hover:bg-slate-50 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-12 bg-[#e6007e] hover:bg-[#b90064] text-white font-bold rounded-xl transition-colors shadow-md shadow-primary-pink/10 cursor-pointer text-xs"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Embedded Support Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-3xl pb-safe shadow-[0_-8px_24px_rgba(0,0,0,0.06)] border-t border-[#e8e8e8]/60">
        <div className="flex justify-around items-center pt-3 pb-4 px-1 max-w-md mx-auto min-h-[80px]">
          {[
            { id: 'help-home', label: 'Contact Support', icon: 'support_agent' },
            { id: 'my-tickets', label: 'Tickets', icon: 'confirmation_number' },
            { id: 'create-ticket', label: 'New', icon: 'add_circle' },
            { id: 'profile-tab', label: 'Profile', icon: 'account_circle' },
          ].map((item) => {
            const isTabActive = activeTab === item.id && !selectedTicket;
            const isProfile = item.id === 'profile-tab';
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isProfile) {
                    onNavigate('profile');
                  } else {
                    setSelectedTicket(null);
                    setActiveTab(item.id as any);
                  }
                }}
                className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 transition-all active:scale-95 relative ${
                  isTabActive
                    ? 'text-[#e6007e] font-semibold'
                    : 'text-[#5a3f47] hover:text-[#e6007e]'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">
                  {item.icon}
                </span>
                <span className="text-[10px] tracking-tight leading-none mt-0.5">{item.label}</span>
                {isTabActive && (
                  <div className="w-1 h-1 rounded-full bg-[#e6007e] absolute bottom-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
