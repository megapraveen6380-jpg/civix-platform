import React, { useState, useEffect } from 'react';
import { Complaint, Department } from '../types';
import MunicipalInvoice from './MunicipalInvoice';
import { 
  Building, 
  Send, 
  HardHat, 
  FileText, 
  Check, 
  DollarSign, 
  RefreshCw, 
  AlertTriangle, 
  Fingerprint, 
  LogOut, 
  CheckCircle, 
  Mail, 
  Sparkles,
  AlertCircle
 } from 'lucide-react';
import { googleSignIn, getAccessToken, logoutGoogle, getCachedGoogleUser } from '../lib/firebaseAuth';
import GmailInboxFeed from './GmailInboxFeed';
import AiReplyAnalyzer from './AiReplyAnalyzer';

interface DepartmentPortalProps {
  activeComplaint: Complaint;
  setComplaints: React.Dispatch<React.SetStateAction<Complaint[]>>;
  addLog: (type: any, text: string) => void;
  onDispatchSuccess: () => void;
  onProgressStepChange: (status: any) => void;
  awardXP?: (points: number) => void;
  unlockBadge?: (badgeId: string) => void;
  setDepartments?: React.Dispatch<React.SetStateAction<Department[]>>;
  onResolveComplete?: () => void;
  setSelectedId?: React.Dispatch<React.SetStateAction<string>>;
}

export default function DepartmentPortal({
  activeComplaint,
  setComplaints,
  addLog,
  onDispatchSuccess,
  onProgressStepChange,
  awardXP = () => {},
  unlockBadge = () => {},
  setDepartments = () => {},
  onResolveComplete = () => {},
  setSelectedId = () => {},
}: DepartmentPortalProps) {
  const [emailText, setEmailText] = useState(activeComplaint.emailBody || '');
  const [routedDept, setRoutedDept] = useState(activeComplaint.department);
  const [caseId, setCaseId] = useState(activeComplaint.caseId);
  const [loading, setLoading] = useState(false);
  const [loadingBill, setLoadingBill] = useState(false);

  // Google integration states
  const [googleLinked, setGoogleLinked] = useState(false);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<any | null>(null);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [simulateType, setSimulateType] = useState<'confirmation' | 'completion' | 'rejection' | 'permission'>('confirmation');

  // Sync state with active complaint
  useEffect(() => {
    setEmailText(activeComplaint.emailBody || '');
    setRoutedDept(activeComplaint.department);
    setCaseId(activeComplaint.caseId);
  }, [activeComplaint]);

  useEffect(() => {
    // Check if token already exists in memory or cache (e.g. from the login page!)
    const token = getAccessToken();
    const cachedUser = getCachedGoogleUser();
    if (token && cachedUser) {
      setGoogleToken(token);
      setGoogleLinked(true);
      setGoogleUser(cachedUser);
    }
  }, []);

  const handleLinkGoogle = async () => {
    setGmailError(null);
    setLoading(true);
    try {
      addLog('SYSTEM', 'Requesting Google OAuth permissions for Gmail send/read with your consent...');
      const res = await googleSignIn();
      if (res) {
        setGoogleToken(res.accessToken);
        setGoogleUser(res.user);
        setGoogleLinked(true);
        addLog('SYSTEM', `✅ Google Account linked successfully: ${res.user.email}`);
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || 'Failed to authenticate Google account.';
      if (errMsg.includes('popup-closed-by-user') || errMsg.includes('auth/popup-closed-by-user')) {
        errMsg = "Google Sign-In failed because the authorization popup was closed. (Note: Inside the AI Studio preview iframe, browser policies may block or automatically close popups. We recommend using the 'Bypass & Switch to Sandbox Simulator' mode to test the app seamlessly!)";
      }
      setGmailError(errMsg);
      addLog('SYSTEM', `❌ Google Account link failed: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    setLoading(true);
    try {
      await logoutGoogle();
      setGoogleToken(null);
      setGoogleUser(null);
      setGoogleLinked(false);
      addLog('SYSTEM', '🔌 Google Account disconnected successfully.');
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Regenerate email template from Express backend using server-side Gemini
  const handleRegenerateEmail = async () => {
    setLoading(true);
    addLog('SYSTEM', `Requesting Gemini to draft professional complaint email for "${activeComplaint.title}"...`);
    try {
      const res = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeComplaint.id })
      });
      const data = await res.json();
      if (data.emailBody) {
        setEmailText(data.emailBody);
        setComplaints(prev => prev.map(c => {
          if (c.id === activeComplaint.id) {
            return { ...c, emailTemplate: data.emailBody, emailBody: data.emailBody };
          }
          return c;
        }));
        addLog('AI', "Gemini has custom-drafted a highly professional and tailored legal complaint email template.");
      }
    } catch (err) {
      addLog('SYSTEM', "Error calling backend email draft builder. Utilizing prepackaged template.");
    } finally {
      setLoading(false);
    }
  };

  // Generate detailed funding/billing transparency values using server-side Gemini
  const handleGenerateTransparency = async () => {
    setLoadingBill(true);
    addLog('SYSTEM', `Consulting Gemini to generate detailed materials bidding & billing breakdown for "${activeComplaint.title}"...`);
    try {
      const res = await fetch('/api/generate-transparency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeComplaint.id })
      });
      const fundingData = await res.json();
      if (fundingData.totalBudget) {
        setComplaints(prev => prev.map(c => {
          if (c.id === activeComplaint.id) {
            return { ...c, funding: fundingData };
          }
          return c;
        }));
        addLog('AI', `Simulated funding ledger successfully generated for ${activeComplaint.department}. Invoice Number: ${fundingData.invoiceNumber}`);
      }
    } catch (err) {
      addLog('SYSTEM', "Error building billing transparency framework.");
    } finally {
      setLoadingBill(false);
    }
  };

  const handleDispatch = async () => {
    if (activeComplaint.status !== 'email_draft' && activeComplaint.status !== 'verified') return;
    setLoading(true);
    setGmailError(null);
    
    let senderEmail = "civxindia@gmail.com";
    
    let appLoginEmail = activeComplaint.reporterEmail || "megapraveen6380@gmail.com";
    const cachedUserStr = localStorage.getItem('social_constraint_current_user');
    if (cachedUserStr) {
      try {
        const parsed = JSON.parse(cachedUserStr);
        if (parsed && parsed.email) {
          appLoginEmail = parsed.email;
        }
      } catch (e) {
        console.error(e);
      }
    }

    addLog('DISPATCH', `Dispatching OFFICIAL complaint email from civxindia@gmail.com to meghapraveen9894@gmail.com (with ${appLoginEmail} in CC)...`);
    try {
      const res = await fetch('/api/gmail-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeComplaint.id,
          emailText: emailText,
          ccEmail: appLoginEmail
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error || "Official email dispatch failed.");
      }

      const data = await res.json();
      setComplaints(prev => prev.map(c => {
        if (c.id === activeComplaint.id) {
          return { 
            ...c, 
            status: 'dispatched' as const, 
            emailBody: emailText,
            emailReplyReceived: false 
          };
        }
        return c;
      }));

      if (data.sentRealEmail) {
        addLog('DISPATCH', `✉️ [SMTP Dispatch Success] Real email successfully sent from civxindia@gmail.com to meghapraveen9894@gmail.com! CC copy delivered to ${appLoginEmail}.`);
      } else {
        addLog('DISPATCH', `✉️ [Official Portal Sandbox Dispatch] Email successfully dispatched from civxindia@gmail.com to meghapraveen9894@gmail.com! CC copy delivered to ${appLoginEmail}.`);
      }
      onDispatchSuccess();
    } catch (err: any) {
      console.error(err);
      setGmailError(err.message || "Failed to dispatch email.");
      addLog('SYSTEM', `❌ Dispatch Error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReply = async () => {
    setLoading(true);
    setGmailError(null);

    addLog('SYSTEM', `📬 Draft/Simulate department reply on the backend (type: "${simulateType}")...`);
    try {
      // 1. Post to simulate-reply first so the response exists in the simulated inbox
      const simRes = await fetch('/api/simulate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeComplaint.id, simulateType })
      });
      if (!simRes.ok) {
        throw new Error("Failed to prepare simulated reply.");
      }

      addLog('SYSTEM', `🔍 Scanning civxindia@gmail.com inbox... Parsing official reply from meghapraveen9894@gmail.com referencing Case Ticket SC-${activeComplaint.caseId ? activeComplaint.caseId.slice(-6) : "unknown"} with Gemini...`);

      // 2. Scan and parse using /api/gmail-check-replies (runs real Gemini parsing on it)
      const res = await fetch('/api/gmail-check-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeComplaint.id
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error || "Inbox scanning failed.");
      }

      const data = await res.json();

      if (data.replyFound) {
        const finalStatus = data.status || 'acknowledged';
        setComplaints(prev => prev.map(c => {
          if (c.id === activeComplaint.id) {
            return { 
              ...c, 
              status: finalStatus, 
              emailReplyReceived: true, 
              emailReplyBody: data.emailReplyBody,
              emailReplyReceivedAt: data.emailReplyReceivedAt,
              funding: data.funding || c.funding,
              repairedImage: data.repairedImage || c.repairedImage,
              departmentDecision: data.departmentDecision || c.departmentDecision,
              decisionExplanation: data.decisionExplanation || c.decisionExplanation,
              permissionDays: data.permissionDays || c.permissionDays,
              completedWithoutProof: data.completedWithoutProof,
              emailAnalysis: data.emailAnalysis
            };
          }
          return c;
        }));
        
        addLog('DISPATCH', `🛡️ [Official Inbox Match] Official reply from meghapraveen9894@gmail.com verified successfully!`);
        
        if (data.emailAnalysis?.urgency === 'HIGH') {
          addLog('ALERT', `🚨 ALERT: Taking immediate action for: ${data.emailAnalysis.summary || data.confirmationSummary || "Official response received"}`);
        }

        if (data.confirmationSummary) {
          addLog('AI', `✨ Gemini parsed response: "${data.confirmationSummary}"`);
        }
        if (finalStatus === 'repaired_audit') {
          addLog('SYSTEM', `✨ [Completed] Reply attached with itemized billing invoices and visual proof of repair. Status: Completed / Awaiting Citizen Audit!`);
        } else {
          addLog('SYSTEM', `Verification Check PASSED. Releasing active process hold state! Current Status: ${finalStatus.toUpperCase()}`);
        }
        onProgressStepChange(finalStatus);
      } else {
        setGmailError(data.message || "No matching replies found in civxindia@gmail.com inbox yet.");
        addLog('SYSTEM', `🔍 Scanning finished: No matching replies for Case SC-${activeComplaint.caseId.slice(-6)} found in civxindia@gmail.com inbox. Waiting...`);
      }
    } catch (err: any) {
      console.error(err);
      setGmailError(err.message || "Failed to scan official inbox.");
      addLog('SYSTEM', `❌ Error reading inbox: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Status handlers inside Department Portal
  const advanceStep = (nextStatus: any, logText: string) => {
    setComplaints(prev => prev.map(c => {
      if (c.id === activeComplaint.id) {
        return { ...c, status: nextStatus };
      }
      return c;
    }));
    addLog('SYSTEM', logText);
    onProgressStepChange(nextStatus);
  };

  const handleAccept = () => {
    advanceStep('acknowledged', `Municipal Department accepts investigation order for Ticket ID: ${activeComplaint.caseId}`);
  };

  const handleSchedule = () => {
    advanceStep('scheduled', `Safety engineers dispatched to location coordinate coordinates for on-site damage assessment.`);
  };

  const handleRepair = () => {
    advanceStep('repairing', `Work crew mobilized. Direct material application underway.`);
  };

  const handleResolveSubmit = () => {
    // Dynamically choose a nice Unsplash repaired photo link to simulate uploaded proof of work
    let proofPhoto = "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=600"; // filled asphalt road
    if (activeComplaint.type.includes('Waste')) {
      proofPhoto = "https://images.unsplash.com/photo-1516216628859-9bccecab13ca?auto=format&fit=crop&q=80&w=600"; // beautifully clean empty leaf street
    } else if (activeComplaint.type.includes('Light')) {
      proofPhoto = "https://images.unsplash.com/photo-1513829096999-49786022c4f5?auto=format&fit=crop&q=80&w=600"; // fully illuminated streets at night
    }

    setComplaints(prev => prev.map(c => {
      if (c.id === activeComplaint.id) {
        return { ...c, status: 'repaired_audit', repairedImage: proofPhoto };
      }
      return c;
    }));
    addLog('SYSTEM', "Department reports work is successfully completed! Proof-of-work visual cataloged and dispatched for community audit.");
    onProgressStepChange('repaired_audit');
  };

  const currentStatus = activeComplaint.status;
  const isPendingVerified = currentStatus === 'captured' || currentStatus === 'scanning' || currentStatus === 'broadcast';

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex flex-col gap-6" id="panel-admin">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
          <Building className="w-5 h-5 text-emerald-500" />
          Municipal Department Dispatch Portal
        </h2>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold font-display flex items-center gap-1.5 ${
          currentStatus === 'dispatched' && !activeComplaint.emailReplyReceived ? 'bg-rose-50 text-rose-600 border border-rose-100 animate-pulse' :
          ['acknowledged', 'scheduled', 'repairing', 'repaired_audit', 'resolved'].includes(currentStatus) ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
          isPendingVerified ? 'bg-slate-50 text-slate-400 border border-slate-100' :
          'bg-emerald-50 text-emerald-600 border border-emerald-100'
        }`}>
          {currentStatus === 'email_draft' || currentStatus === 'verified' ? 'Draft Ready' :
           isPendingVerified ? 'Awaiting Verification' :
           currentStatus === 'dispatched' && !activeComplaint.emailReplyReceived ? 'Awaiting Department Reply' :
           'Approved & Active'}
        </span>
      </div>

      {isPendingVerified ? (
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-2">
          <AlertTriangle className="w-10 h-10 text-amber-500 animate-bounce" />
          <h3 className="font-bold text-slate-800 font-display text-base">Wait for Neighborhood Overvotes</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            We require 5 neighborhood upvotes on the Verification Map to ensure authenticity. Currently: <b>{activeComplaint.upvotes}/5</b> verifications.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Official Portal Sender Configuration Card */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-display flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-emerald-600 animate-pulse" />
                Official Portal Dispatch (civxindia@gmail.com)
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Official notifications are securely dispatched directly using the application's system account (<strong className="font-mono text-slate-700">civxindia@gmail.com</strong>) to the assigned municipal department head (<strong className="font-mono text-slate-700">meghapraveen9894@gmail.com</strong>).
              </p>
              <p className="text-[10px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                Active Citizen Email CC Enabled: {localStorage.getItem('social_constraint_current_user') ? JSON.parse(localStorage.getItem('social_constraint_current_user')!).email : 'megapraveen6380@gmail.com'}
              </p>
              {gmailError && (
                <div className="mt-2 bg-rose-50 border border-rose-100 p-3 rounded-xl">
                  <p className="text-[11px] text-rose-700 font-semibold flex items-center gap-1">
                    <span className="text-xs">⚠️</span>
                    <span>{gmailError}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Email dispatch section */}
          {(currentStatus === 'verified' || currentStatus === 'email_draft') && (
            <div className="flex flex-col gap-4 bg-slate-50 border border-slate-150 p-4 rounded-xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Assigned Department</span>
                  <div className="text-sm font-semibold text-slate-700">{routedDept}</div>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Ticket ID</span>
                  <div className="text-sm font-mono text-slate-700 font-bold">{caseId}</div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Draft Complaint Email (AI Generated)
                  </label>
                  <button 
                    type="button"
                    onClick={handleRegenerateEmail}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 transitionoutline-none cursor-pointer"
                    disabled={loading}
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    Regenerate with AI
                  </button>
                </div>
                <textarea 
                  className="w-full bg-white p-3 border border-slate-200 rounded-lg text-xs font-mono leading-relaxed text-slate-700 shadow-inner resize-y h-64 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={emailText || `Loading template... Click Regenerate with AI to speed it up!`}
                  onChange={(e) => setEmailText(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 mt-1">
                <button 
                  onClick={handleDispatch}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg flex items-center gap-2 shadow-md transition outline-none cursor-pointer"
                  disabled={loading || !emailText}
                >
                  <Send className="w-4 h-4" />
                  Approve & Dispatch Mail
                </button>
              </div>
            </div>
          )}

          {/* Funding & Transparency section (Always shown for active verified tickets to satisfy request) */}
          <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4">
            <div className="flex justify-between items-center mb-1.5 pb-1.5 border-b border-emerald-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                Department Funding & Billing Transparency
              </h3>
              {!activeComplaint.funding && (
                <button 
                  type="button"
                  onClick={handleGenerateTransparency}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer transition outline-none"
                  disabled={loadingBill}
                >
                  <RefreshCw className={`w-3 h-3 ${loadingBill ? 'animate-spin' : ''}`} />
                  Build Itemized Budget
                </button>
              )}
            </div>

            {loadingBill ? (
              <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                AI is calculating engineering labor, safety equipment and materials estimates...
              </div>
            ) : activeComplaint.funding ? (
              <MunicipalInvoice 
                funding={activeComplaint.funding}
                department={activeComplaint.department}
                category={activeComplaint.type}
                caseId={activeComplaint.caseId}
                title={activeComplaint.title}
                status={activeComplaint.status}
              />
            ) : (
              <p className="text-[11px] text-slate-500 leading-normal">
                Department leads must authorize full transparency. Click "Build Itemized Budget" above to trigger Gemini to design a realistic materials ledger for citizen auditing.
              </p>
            )}
          </div>

          {/* AI Email & Permit Analyzer section */}
          {activeComplaint.status !== 'email_draft' && activeComplaint.status !== 'verified' && (
            <AiReplyAnalyzer 
              activeComplaint={activeComplaint}
              setComplaints={setComplaints}
              addLog={addLog}
            />
          )}

        </div>
      )}

      {/* Gmail Inbox Live Feed */}
      <GmailInboxFeed 
        onSelectCase={(caseIdStr) => {
          setComplaints(prev => {
            const match = prev.find(c => c.caseId.toLowerCase() === caseIdStr.toLowerCase() || c.caseId.toLowerCase().endsWith(caseIdStr.toLowerCase()) || c.id.toLowerCase().includes(caseIdStr.toLowerCase()));
            if (match) {
              setSelectedId(match.id);
              addLog('SYSTEM', `📂 Live Inbox Selection: Switched focus to Complaint Case ${match.caseId} ("${match.title}").`);
            } else {
              addLog('SYSTEM', `⚠️ Complaint Ticket ${caseIdStr} from email match is not loaded in local system database.`);
            }
            return prev;
          });
        }}
      />
    </div>
  );
}
