import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Screen } from '../types';

interface OwnerDashboardProps {
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

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  user,
  onNavigate,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'proposals' | 'settings'>('overview');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerReady, setOwnerReady] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const loadProposals = useCallback(async () => {
    setLoading(true);
    try {
      if (!supabase) return;
      
      // Check if owner has a salon registered
      const { data: salons, error: salonError } = await supabase.from('salons').select('id').limit(1);
      if (salonError) throw salonError;
      setOwnerReady(salons && salons.length > 0);

      const { data, error: queryError } = await supabase
        .from('salon_setup_proposals')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (queryError) throw queryError;
      setProposals(data || []);
    } catch (err: any) {
      console.error('Error loading proposals:', err);
      setError('Failed to load website proposals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  const reviewProposal = async (proposalId: string, action: string) => {
    setBusyId(proposalId);
    setError("");
    try {
      if (!supabase) return;
      const { error: rpcError } = await supabase.rpc('review_salon_setup', {
        p_proposal_id: proposalId,
        p_action: action,
        p_notes: action === 'request_changes' ? "Changes requested from the dashboard." : null
      });
      if (rpcError) throw rpcError;
      await loadProposals();
    } catch (err: any) {
      setError(err.message || "Failed to review proposal.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto pb-32 animate-in fade-in duration-200">
      <div className="flex flex-col gap-6 p-6">
        <header className="flex flex-col gap-1">
          <span className="text-[12px] font-bold text-[#e6007e] uppercase tracking-widest">Shop Owner</span>
          <h1 className="text-2xl font-extrabold text-[#26181c]">Welcome, {user.user_metadata?.full_name || 'Owner'}</h1>
          <p className="text-sm text-[#5a3f47]">Review proposals and manage your salon storefront.</p>
        </header>

        {!ownerReady ? (
          <OwnerSetup onReady={loadProposals} />
        ) : (
          <>
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
                Proposals ({proposals.filter(p => p.status === 'submitted').length})
              </button>
            </div>

            {activeTab === 'overview' && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-[#e8e8e8] shadow-sm">
                    <span className="text-[10px] font-bold text-[#8c7077] uppercase">Daily Bookings</span>
                    <p className="text-2xl font-bold text-[#26181c]">0</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-[#e8e8e8] shadow-sm">
                    <span className="text-[10px] font-bold text-[#8c7077] uppercase">Daily Revenue</span>
                    <p className="text-2xl font-bold text-[#26181c]">₹0</p>
                  </div>
                </div>

                <div className="bg-[#26181c] p-6 rounded-[24px] text-white shadow-lg">
                  <h3 className="font-bold text-lg mb-1">Store Status</h3>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <p className="text-sm font-bold uppercase tracking-wider">Live on Nexora</p>
                  </div>
                  <button 
                    onClick={() => onNavigate('home')}
                    className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-colors border border-white/20"
                  >
                    View Public Catalog
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'proposals' && (
              <div className="flex flex-col gap-4">
                {loading ? (
                  <p className="text-center py-10 text-[#8c7077]">Loading proposals...</p>
                ) : proposals.length === 0 ? (
                  <div className="bg-white p-10 rounded-2xl border border-[#e8e8e8] text-center">
                    <span className="material-symbols-outlined text-4xl text-[#e0bec6] mb-2">mark_email_unread</span>
                    <p className="text-sm font-semibold text-[#5a3f47]">No pending proposals from Growth Partners.</p>
                  </div>
                ) : (
                  proposals.map(proposal => (
                    <div key={proposal.id} className="bg-white p-5 rounded-[24px] border border-[#e8e8e8] shadow-sm flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            proposal.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {proposal.status}
                          </span>
                          <h3 className="font-bold text-[#26181c] text-lg mt-1">{proposal.payload?.profile?.name || 'New Salon Setup'}</h3>
                          <p className="text-[11px] text-[#5a3f47]">{proposal.owner_email}</p>
                        </div>
                      </div>

                      <div className="bg-[#fcf9f8] p-3 rounded-xl border border-dashed border-[#e8e8e8]">
                        <p className="text-[11px] text-[#5a3f47] italic">"{proposal.payload?.profile?.description?.slice(0, 100)}..."</p>
                      </div>

                      <div className="flex gap-2">
                         {proposal.status === 'submitted' && (
                           <button 
                             disabled={busyId === proposal.id}
                             onClick={() => reviewProposal(proposal.id, 'approve')}
                             className="flex-1 h-10 bg-white border border-[#e8e8e8] rounded-xl text-xs font-bold hover:bg-slate-50"
                           >
                             Approve
                           </button>
                         )}
                         {(proposal.status === 'submitted' || proposal.status === 'approved') && (
                           <button 
                             disabled={busyId === proposal.id}
                             onClick={() => reviewProposal(proposal.id, 'publish')}
                             className="flex-1 h-10 bg-[#e6007e] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#c9006e]"
                           >
                             {busyId === proposal.id ? 'Processing...' : 'Approve & Publish'}
                           </button>
                         )}
                      </div>
                      
                      {error && proposal.id === busyId && <p className="text-[10px] text-rose-600 font-bold">{error}</p>}
                    </div>
                  ))
                )}
              </div>
            )}
          </>
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

function OwnerSetup({ onReady }: { onReady: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Salon");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (!supabase) throw new Error("Supabase not configured");
      const { error } = await supabase.rpc('bootstrap_shop_owner', {
        p_business_name: name.trim(),
        p_business_category: category.trim(),
        p_contact_number: phone.trim() || null
      });
      if (error) throw error;
      await onReady();
    } catch (err: any) {
      setMessage(err.message || 'Failed to connect workspace');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white p-6 rounded-[28px] border border-[#e8e8e8] shadow-sm flex flex-col gap-4">
      <h3 className="font-bold text-[#26181c]">Connect Your Salon Workspace</h3>
      <p className="text-xs text-[#5a3f47]">Set up your owner account to manage proposals and live bookings.</p>
      
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-[#8c7077] uppercase ml-1">Business Name</label>
        <input required value={name} onChange={e => setName(e.target.value)} className="bg-[#fcf9f8] border border-[#e8e8e8] rounded-xl px-4 py-3 text-sm" />
      </div>
      
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-[#8c7077] uppercase ml-1">Category</label>
        <select value={category} onChange={e => setCategory(e.target.value)} className="bg-[#fcf9f8] border border-[#e8e8e8] rounded-xl px-4 py-3 text-sm">
          <option value="Salon">Salon</option>
          <option value="Spa">Spa</option>
          <option value="Tattoo Studio">Tattoo Studio</option>
          <option value="Clinic">Clinic</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-[#8c7077] uppercase ml-1">Phone</label>
        <input value={phone} onChange={e => setPhone(e.target.value)} className="bg-[#fcf9f8] border border-[#e8e8e8] rounded-xl px-4 py-3 text-sm" />
      </div>

      {message && <p className="text-xs text-rose-600 font-bold">{message}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full h-12 bg-[#26181c] text-white rounded-xl font-bold active:scale-95 transition-all shadow-md disabled:opacity-70 mt-2"
      >
        {busy ? 'Connecting...' : 'Connect Owner Workspace'}
      </button>
    </form>
  );
}
