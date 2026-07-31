import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Screen } from '../types';

interface GrowthPartnerDashboardProps {
  user: any;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}

type Proposal = {
  id: string;
  onboarding_application_id: string;
  salon_id: string | null;
  owner_user_id: string | null;
  owner_email: string | null;
  status: string;
  payload: Record<string, any>;
  version: number;
  owner_notes: string | null;
  submitted_at: string | null;
  published_at: string | null;
  updated_at: string;
};

export const GrowthPartnerDashboard: React.FC<GrowthPartnerDashboardProps> = ({
  user,
  onNavigate,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'proposals' | 'new-proposal'>('overview');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadProposals = useCallback(async () => {
    setLoading(true);
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('salon_setup_proposals')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      setProposals(data || []);
    } catch (err: any) {
      console.error('Error loading proposals:', err);
      setMessage('Failed to load proposals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  return (
    <div className="flex flex-col w-full max-w-md mx-auto pb-32 animate-in fade-in duration-200">
      <div className="flex flex-col gap-6 p-6">
        <header className="flex flex-col gap-1">
          <span className="text-[12px] font-bold text-[#e6007e] uppercase tracking-widest">Growth Partner</span>
          <h1 className="text-2xl font-extrabold text-[#26181c]">Welcome, {user.user_metadata?.full_name || 'Partner'}</h1>
          <p className="text-sm text-[#5a3f47]">Manage your salon proposals and track commissions.</p>
        </header>

        {/* Tab Navigation */}
        <div className="flex bg-[#f8eff3] p-1 rounded-2xl gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'overview' ? 'bg-white text-[#e6007e] shadow-sm' : 'text-[#5a3f47]'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('proposals')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'proposals' ? 'bg-white text-[#e6007e] shadow-sm' : 'text-[#5a3f47]'
            }`}
          >
            My Proposals
          </button>
          <button
            onClick={() => setActiveTab('new-proposal')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'new-proposal' ? 'bg-white text-[#e6007e] shadow-sm' : 'text-[#5a3f47]'
            }`}
          >
            New Salon
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-[#e8e8e8] shadow-sm">
                <span className="text-[10px] font-bold text-[#8c7077] uppercase">Total Proposals</span>
                <p className="text-2xl font-bold text-[#26181c]">{proposals.length}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-[#e8e8e8] shadow-sm">
                <span className="text-[10px] font-bold text-[#8c7077] uppercase">Published</span>
                <p className="text-2xl font-bold text-[#26181c]">{proposals.filter(p => p.status === 'published').length}</p>
              </div>
            </div>
            
            <div className="bg-[#e6007e] p-6 rounded-[24px] text-white shadow-lg">
              <h3 className="font-bold text-lg mb-1">Commission Earned</h3>
              <p className="text-3xl font-extrabold">₹0.00</p>
              <p className="text-[11px] opacity-80 mt-2">Payouts are processed after salon publication and verification.</p>
            </div>

            <button
              onClick={() => setActiveTab('new-proposal')}
              className="w-full h-14 bg-[#26181c] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-md"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Setup New Salon Website
            </button>
          </div>
        )}

        {activeTab === 'proposals' && (
          <div className="flex flex-col gap-4">
            {loading ? (
              <p className="text-center py-10 text-[#8c7077]">Loading proposals...</p>
            ) : proposals.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl border border-[#e8e8e8] text-center">
                <span className="material-symbols-outlined text-4xl text-[#e0bec6] mb-2">assignment</span>
                <p className="text-sm font-semibold text-[#5a3f47]">No proposals found.</p>
                <button onClick={() => setActiveTab('new-proposal')} className="text-[#e6007e] text-xs font-bold mt-2 underline">Create your first proposal</button>
              </div>
            ) : (
              proposals.map(proposal => (
                <div key={proposal.id} className="bg-white p-4 rounded-2xl border border-[#e8e8e8] shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-[#26181c]">{proposal.payload?.profile?.name || 'Salon Proposal'}</h3>
                      <p className="text-[11px] text-[#8c7077]">Updated {new Date(proposal.updated_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      proposal.status === 'published' ? 'bg-emerald-100 text-emerald-800' :
                      proposal.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                      proposal.status === 'submitted' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {proposal.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <span className="text-[10px] text-[#5a3f47]">Revision {proposal.version}</span>
                    <button className="text-[#e6007e] text-xs font-bold flex items-center gap-1">
                      View Details
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'new-proposal' && (
           <GrowthPartnerProposalForm onSubmitted={async () => {
             await loadProposals();
             setActiveTab('proposals');
           }} />
        )}

        <button 
          onClick={onLogout}
          className="mt-4 text-rose-600 text-xs font-bold border border-rose-100 py-3 rounded-xl hover:bg-rose-50 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

// Adapted from nexora-main-website
function GrowthPartnerProposalForm({ onSubmitted }: { onSubmitted: () => Promise<void> }) {
  const [businessName, setBusinessName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Jaipur");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [openingTime, setOpeningTime] = useState("09:00");
  const [closingTime, setClosingTime] = useState("20:00");
  const [templateKey, setTemplateKey] = useState("modern-salon");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (!supabase) throw new Error("Supabase not configured");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expired");

      // 1. Ensure growth_partner record exists
      let { data: partner } = await supabase.from('growth_partners').select('id').eq('user_id', user.id).maybeSingle();
      if (!partner) {
        const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
        const { data: newPartner, error: partnerErr } = await supabase.from('growth_partners').insert({
          user_id: user.id,
          partner_code: `NXR${suffix}`,
          referral_code: `REF${suffix}`,
          status: 'applied'
        }).select('id').single();
        if (partnerErr) throw partnerErr;
        partner = newPartner;
      }

      // 2. Create application
      const { data: app, error: appErr } = await supabase.from('shop_onboarding_applications').insert({
        submitted_by_partner_id: partner.id,
        status: 'draft',
        current_step: 6,
        owner_email: ownerEmail.trim().toLowerCase(),
        owner_phone: phone.trim(),
        shop_name: businessName.trim(),
        city: city.trim(),
        locality: area.trim(),
        full_address: address.trim(),
        opening_time: openingTime,
        closing_time: closingTime,
        about_shop: description.trim(),
        website_template: templateKey,
      }).select('id').single();
      if (appErr) throw appErr;

      // 3. Save proposal
      const payload = {
        profile: {
          name: businessName.trim(),
          description: description.trim(),
          phone: phone.trim(),
          email: ownerEmail.trim().toLowerCase(),
          address: address.trim(),
          area: area.trim(),
          city: city.trim(),
          opening_hours: { opens: openingTime, closes: closingTime },
        },
        services: [],
        template: { key: templateKey },
      };

      const { error: proposalErr } = await supabase.rpc('save_growth_partner_salon_setup', {
        p_application_id: app.id,
        p_payload: payload,
        p_submit: true
      });

      if (proposalErr) throw proposalErr;
      await onSubmitted();
    } catch (err: any) {
      setMessage(err.message || 'Failed to submit proposal');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 animate-in slide-in-from-bottom duration-300">
      <div className="bg-white p-6 rounded-[28px] border border-[#e8e8e8] shadow-sm flex flex-col gap-4">
        <h3 className="font-bold text-[#26181c]">Salon Identity</h3>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-[#8c7077] uppercase ml-1">Salon Name</label>
          <input required value={businessName} onChange={e => setBusinessName(e.target.value)} className="bg-[#fcf9f8] border border-[#e8e8e8] rounded-xl px-4 py-3 text-sm" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-[#8c7077] uppercase ml-1">Owner Email</label>
          <input required type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} className="bg-[#fcf9f8] border border-[#e8e8e8] rounded-xl px-4 py-3 text-sm" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-[#8c7077] uppercase ml-1">Phone</label>
          <input required value={phone} onChange={e => setPhone(e.target.value)} className="bg-[#fcf9f8] border border-[#e8e8e8] rounded-xl px-4 py-3 text-sm" />
        </div>
      </div>

      <div className="bg-white p-6 rounded-[28px] border border-[#e8e8e8] shadow-sm flex flex-col gap-4">
        <h3 className="font-bold text-[#26181c]">Location & Details</h3>
        <div className="grid grid-cols-2 gap-3">
           <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-[#8c7077] uppercase ml-1">City</label>
            <input required value={city} onChange={e => setCity(e.target.value)} className="bg-[#fcf9f8] border border-[#e8e8e8] rounded-xl px-4 py-3 text-sm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-[#8c7077] uppercase ml-1">Area</label>
            <input required value={area} onChange={e => setArea(e.target.value)} className="bg-[#fcf9f8] border border-[#e8e8e8] rounded-xl px-4 py-3 text-sm" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-[#8c7077] uppercase ml-1">Description</label>
          <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} className="bg-[#fcf9f8] border border-[#e8e8e8] rounded-xl px-4 py-3 text-sm resize-none" />
        </div>
      </div>

      {message && <p className="text-xs text-rose-600 font-bold px-2">{message}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full h-14 bg-[#e6007e] text-white rounded-2xl font-bold active:scale-95 transition-all shadow-md disabled:opacity-70"
      >
        {busy ? 'Submitting...' : 'Submit Website Proposal'}
      </button>
    </form>
  );
}
