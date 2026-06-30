import React, { useState, useEffect } from 'react';
import { Complaint, EmailAnalysis } from '../types';
import { 
  Sparkles, 
  Upload, 
  Mail, 
  Coins, 
  CalendarRange, 
  CheckSquare, 
  UserCheck, 
  FileText, 
  Check, 
  Cpu, 
  RefreshCw,
  TrendingUp,
  Clock,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface AiReplyAnalyzerProps {
  activeComplaint: Complaint;
  setComplaints: React.Dispatch<React.SetStateAction<Complaint[]>>;
  addLog: (type: any, text: string) => void;
  onAnalysisApplied?: () => void;
}

export default function AiReplyAnalyzer({
  activeComplaint,
  setComplaints,
  addLog,
  onAnalysisApplied
}: AiReplyAnalyzerProps) {
  const [emailText, setEmailText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [applySuccess, setApplySuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState<'report' | 'console'>('report');

  // Preloaded template responses for quick parsing demonstration (like sample resumes)
  const templates = [
    {
      name: "✅ Permit Approved & Materials",
      text: `Subject: RE: URGENT RESOLUTION REQUIRED: Pothole Hazard (CASE TICKET: ${activeComplaint.caseId || 'SC-B8F2A3'})
From: municipal.works@chennai.gov.in
To: civxindia@gmail.com
CC: megapraveen6380@gmail.com

We have received and approved your complaint ${activeComplaint.caseId || 'SC-B8F2A3'}. 
The road-digging and bitumen restoration permit has been issued to Contractor Megha Praveen (megapraveen6380@gmail.com) under registration ID megapraveen6380@gmail.com.

Materials Breakdown Scheduled:
- Premium Grade Bitumen 60/70: 12,500 INR
- Crushed Stone Aggregates and Sand Mix: 8,500 INR
- Labour Wages & Local Crew Charges: 5,000 INR
Total approved budget: 26,000 INR.

Estimated Timeline:
- Initial site clearing & barricading: June 30, 2026
- Core physical asphalt laying: July 2, 2026
- Quality verification & road reopening: July 5, 2026

We request citizen support for maintaining traffic diversion during this 4-day clearance permit.`
    },
    {
      name: "🛠️ Repair Completed & Invoice",
      text: `Subject: RE: URGENT RESOLUTION REQUIRED: Pothole Hazard (CASE TICKET: ${activeComplaint.caseId || 'SC-B8F2A3'})
From: water.maintenance@chennai.gov.in
To: civxindia@gmail.com

The water leak and sewer main fracture logged under Ticket ID ${activeComplaint.caseId || 'SC-B8F2A3'} is fully COMPLETED and resolved. 

Our emergency response engineering crew has replaced the fractured 3-inch PVC pipeline and reinforced the bedding.

Billing Clearance Summary (Invoice #INV-245890-C):
- 3" Heavy-Duty PVC Duct pipe casing: 9,000 INR
- Quick-set cement & gravel mix: 4,500 INR
- Heavy machinery excavator lease: 6,000 INR
- Engineering labor (4 technicians): 8,000 INR
Total project expense submitted: 27,500 INR.

The repair has been completed, tested, and pressure checked. The road has been successfully re-asphalted. Attached is the proof-of-completion photo showing the restored layout.`
    },
    {
      name: "⚠️ Standby Delay Order",
      text: `Subject: RE: URGENT RESOLUTION REQUIRED: Pothole Hazard (CASE TICKET: ${activeComplaint.caseId || 'SC-B8F2A3'})
From: traffic.police@chennai.gov.in

Regarding ticket ID ${activeComplaint.caseId || 'SC-B8F2A3'}. 
We must order a temporary STANDBY delay of 6 days on physical road excavations due to ongoing VVIP convoy routes in the Mylapore-Adyar transit corridor. 

Contractor is prohibited from blocking the lanes until safety clearance is signed off by our regional transport superintendent on July 8. Please hold mobilization.`
    }
  ];

  // Auto-load complaint's current reply if available
  useEffect(() => {
    if (activeComplaint.emailAnalysis) {
      // If we already have the analysis, load it immediately!
      const mappedResult = {
        summary: activeComplaint.emailAnalysis.summary,
        sentiment: activeComplaint.emailAnalysis.sentiment,
        actionItems: activeComplaint.emailAnalysis.actionItems,
        deadlines: activeComplaint.emailAnalysis.deadlines,
        status: activeComplaint.status === 'repaired_audit' ? 'completed' : 
                activeComplaint.status === 'repairing' ? 'permitted' : 'standby',
        approvedUserId: activeComplaint.emailAnalysis.extractedSender,
        ticketId: activeComplaint.caseId,
        totalBudget: activeComplaint.funding?.totalBudget || 25000,
        materials: activeComplaint.funding?.materialsBreakdown || [],
        cooperationScore: activeComplaint.emailAnalysis.sentiment === 'Cooperative' ? 95 : 
                           activeComplaint.emailAnalysis.sentiment === 'Neutral' ? 70 : 40,
        timeline: activeComplaint.emailAnalysis.deadlines.map((d, i) => ({
          event: activeComplaint.emailAnalysis?.actionItems[i] || "Milestone Checkpoint",
          date: d
        }))
      };
      setEmailText(activeComplaint.emailReplyBody || '');
      setAnalysisResult(mappedResult);
      setApplySuccess(true);
    } else {
      // Otherwise, set to default template which triggers auto-analysis!
      if (activeComplaint.emailReplyBody) {
        setEmailText(activeComplaint.emailReplyBody);
      } else {
        setEmailText(templates[0].text);
      }
      setAnalysisResult(null);
      setApplySuccess(false);
    }
  }, [activeComplaint.id]);

  // Debounced Auto-analysis Effect (zero-click automated updates)
  useEffect(() => {
    if (!emailText || !emailText.trim()) {
      setAnalysisResult(null);
      setApplySuccess(false);
      return;
    }

    // Skip redundant network parsing if the text matches the active complaint's existing reply
    if (activeComplaint.emailAnalysis && emailText === activeComplaint.emailReplyBody) {
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      autoAnalyzeAndApply(emailText);
    }, 1200);

    return () => clearTimeout(delayDebounceFn);
  }, [emailText]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setEmailText(event.target.result as string);
          addLog('SYSTEM', `📂 AI Reply Analyzer: Loaded file "${file.name}" for automated semantic extraction.`);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setEmailText(event.target.result as string);
          addLog('SYSTEM', `📂 AI Reply Analyzer: Uploaded file "${file.name}" for automated analysis.`);
        }
      };
      reader.readAsText(file);
    }
  };

  const autoAnalyzeAndApply = async (textToAnalyze: string) => {
    setAnalyzing(true);
    setApplySuccess(false);
    try {
      const response = await fetch('/api/analyze-email-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailText: textToAnalyze })
      });
      if (response.ok) {
        const data = await response.json();
        setAnalysisResult(data);
        addLog('AI', `🤖 Resume-style Email Reply Parser: Extraction completed with ${data.cooperationScore}% Cooperation Index.`);
        
        // Immediately and automatically apply the extracted logistics and funding to the portal ticket
        applyDecisionsToPortal(data, textToAnalyze);
      } else {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to analyze mail.");
      }
    } catch (err: any) {
      console.error(err);
      addLog('SYSTEM', `⚠️ AI email extraction failed: ${err.message || 'Check model keys.'}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const applyDecisionsToPortal = (parsedResult: any, rawText: string) => {
    if (!parsedResult) return;

    setComplaints(prev => prev.map(c => {
      if (c.id === activeComplaint.id) {
        // Map extracted status to valid ComplaintStatus
        let nextStatus = c.status;
        if (parsedResult.status === 'completed') {
          nextStatus = 'repaired_audit';
        } else if (parsedResult.status === 'permitted' || parsedResult.status === 'approved') {
          nextStatus = 'repairing';
        } else if (parsedResult.status === 'standby') {
          nextStatus = 'acknowledged';
        }

        const updatedFunding = {
          itemId: c.funding?.itemId || c.id,
          invoiceNumber: c.funding?.invoiceNumber || `INV-AI-${c.caseId.slice(-6)}`,
          totalBudget: parsedResult.totalBudget || 25000,
          materialsCost: Math.round((parsedResult.totalBudget || 25000) * 0.5),
          laborCost: Math.round((parsedResult.totalBudget || 25000) * 0.3),
          equipmentCost: Math.round((parsedResult.totalBudget || 25000) * 0.2),
          materialsBreakdown: parsedResult.materials && parsedResult.materials.length > 0 
            ? parsedResult.materials 
            : [{ name: "AI Extracted Core Supplies", cost: parsedResult.totalBudget || 25000 }],
          clearedByAuditor: false,
          isPublished: true,
          auditConfirmed: false,
          auditNotes: ""
        };

        const updatedAnalysis: EmailAnalysis = {
          summary: parsedResult.summary || "Parsed response detail.",
          sentiment: parsedResult.sentiment || "Neutral",
          actionItems: parsedResult.actionItems || [],
          deadlines: parsedResult.deadlines || [],
          stage: parsedResult.status === 'completed' ? "Completed & Ready for Citizen Audit" : "In Progress / Active Repairs",
          extractedSender: parsedResult.approvedUserId || "meghapraveen9894@gmail.com",
          extractedRecipient: "civxindia@gmail.com",
          extractedSubject: `Re: URGENT RESOLUTION REQUIRED: ${c.title}`,
          extractedContacts: ["+91 98940 12345"],
          extractedLocation: c.locationAddress || "Chennai Ward",
          extractedCost: `₹${(parsedResult.totalBudget || 25000).toLocaleString()}`
        };

        return {
          ...c,
          status: nextStatus,
          emailReplyReceived: true,
          emailReplyBody: rawText,
          emailReplyReceivedAt: new Date().toLocaleTimeString(),
          departmentDecision: parsedResult.status === 'completed' ? 'approval' : 'permission_granted',
          decisionExplanation: parsedResult.summary,
          permissionDays: parsedResult.permitDays || undefined,
          funding: updatedFunding as any,
          emailAnalysis: updatedAnalysis
        };
      }
      return c;
    }));

    addLog('SYSTEM', `✨ Portal Updated Automatically: Applied AI Permit & Funding model to Case ${activeComplaint.caseId}. Assigned Permit ID [${parsedResult.approvedUserId || 'megapraveen6380@gmail.com'}].`);
    setApplySuccess(true);
    
    if (onAnalysisApplied) {
      onAnalysisApplied();
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-150 rounded-xl p-5 flex flex-col gap-5" id="ai-reply-analyzer">
      <div className="flex justify-between items-center pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-display">
              📧 AI Email Reply & Permit Analyzer
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">Auto-extract schedules, materials ledger, and approved contractor IDs</p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100/30 font-mono">
          AUTOMATED LIVE PARSER
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Side: Paste & Upload Form */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">Quick-Load Demo Templates</label>
            <div className="flex flex-wrap gap-1.5">
              {templates.map((tpl, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setEmailText(tpl.text);
                    setAnalysisResult(null);
                    setApplySuccess(false);
                  }}
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded text-[10px] font-bold transition cursor-pointer"
                >
                  {tpl.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold uppercase text-slate-500">Email Reply Body Text</label>
              {activeComplaint.emailReplyReceived && (
                <button
                  onClick={() => {
                    setEmailText(activeComplaint.emailReplyBody || '');
                    setAnalysisResult(null);
                  }}
                  className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-0.5 cursor-pointer"
                >
                  <Mail className="w-3 h-3" /> Load Inbox Reply
                </button>
              )}
            </div>
            
            {/* Drag & Drop File Container */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`relative flex flex-col ${
                dragActive ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200 bg-white'
              } border border-dashed rounded-lg p-1 transition-all duration-200`}
            >
              <textarea
                value={emailText}
                onChange={(e) => setEmailText(e.target.value)}
                placeholder="Paste the email reply body text here to extract, or drop a text file..."
                className="w-full bg-transparent p-3 text-xs font-mono text-slate-700 h-64 resize-y leading-relaxed focus:outline-none"
              />
              
              <div className="bg-slate-50 px-3 py-2 border-t border-slate-100 rounded-b-lg flex justify-between items-center">
                <span className="text-[9px] text-slate-400 font-semibold font-mono">DRAG & DROP EMAIL.TXT</span>
                <label className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer">
                  <Upload className="w-3 h-3" />
                  <span>Upload File</span>
                  <input 
                    type="file" 
                    accept=".txt,.json,.eml" 
                    onChange={handleFileInput} 
                    className="hidden" 
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Fully automated scanning status indicator - NO MANUAL BUTTON! */}
          <div className="w-full py-2.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-lg border border-slate-200 flex items-center justify-center gap-1.5 font-mono">
            {analyzing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span className="text-emerald-700">AI Auto-Extracting Logistics & Ledgers...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                <span>Live AI Auto-Scanning Active</span>
              </>
            )}
          </div>
        </div>

        {/* Right Side: AI Resume-Style Extracted Report Card */}
        <div className="lg:col-span-7 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {!analysisResult ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 gap-3 min-h-[350px]">
              {analyzing ? (
                <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin" />
              ) : (
                <FileText className="w-12 h-12 text-slate-300 animate-pulse" />
              )}
              <div>
                <h4 className="font-bold text-slate-700 text-xs font-display">Awaiting Document Extraction</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                  Pasting text or choosing a demo template will automatically trigger Gemini's structured extraction and apply ticket updates.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Report Header */}
              <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold font-display uppercase tracking-wider">AI EXTRACTED PERMIT REPORT</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-300">Cooperation Index:</span>
                  <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                    <div 
                      className={`h-full ${analysisResult.cooperationScore > 75 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                      style={{ width: `${analysisResult.cooperationScore}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-emerald-400 font-mono">{analysisResult.cooperationScore}%</span>
                </div>
              </div>

              {/* Report Tabs */}
              <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex gap-2 shrink-0">
                <button
                  onClick={() => setActiveReportTab('report')}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition tracking-wider border cursor-pointer font-mono ${
                    activeReportTab === 'report'
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white font-medium'
                  }`}
                >
                  📊 Visual Report
                </button>
                <button
                  onClick={() => setActiveReportTab('console')}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition tracking-wider border cursor-pointer font-mono flex items-center gap-1.5 ${
                    activeReportTab === 'console'
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white font-medium'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  💻 Python AI Console
                </button>
              </div>

              {activeReportTab === 'report' ? (
                /* Report Content Scroll Area */
                <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[380px]">
                  {/* Executive Summary Block */}
                  <div className="bg-slate-50 border-l-4 border-emerald-500 p-3 rounded-r-lg">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">AI Executive Summary</span>
                    <p className="text-[11px] text-slate-600 mt-1 font-medium leading-relaxed font-sans">
                      {analysisResult.summary}
                    </p>
                  </div>

                  {/* Key Extracted Entities Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Approved Contractor / User ID */}
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2.5">
                      <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-800 uppercase tracking-wide">
                        <UserCheck className="w-3 h-3" />
                        Approved User ID
                      </span>
                      <span className="block text-xs font-semibold text-slate-800 mt-1 break-all font-mono" id="extracted-approved-user-id">
                        {analysisResult.approvedUserId || "megapraveen6380@gmail.com"}
                      </span>
                    </div>

                    {/* Extracted Ticket/Case ID */}
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                      <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                        <Mail className="w-3 h-3 text-slate-400" />
                        Case Match ID
                      </span>
                      <span className="block text-xs font-bold text-slate-800 mt-1 font-mono">
                        {analysisResult.ticketId || activeComplaint.caseId}
                      </span>
                    </div>

                    {/* Decision/Classification */}
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Approval Status</span>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide mt-1 ${
                        analysisResult.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                        analysisResult.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                        analysisResult.status === 'standby' ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {analysisResult.status}
                      </span>
                    </div>
                  </div>

                  {/* Materials & Logistics Billing Ledger */}
                  <div className="border border-slate-150 rounded-lg p-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-150 mb-2">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                        Itemized Materials & Costs Ledger
                      </span>
                      <span className="text-xs font-bold text-slate-800 font-mono">
                        Total: ₹{(analysisResult.totalBudget || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto font-sans">
                      {analysisResult.materials && analysisResult.materials.length > 0 ? (
                        analysisResult.materials.map((m: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-[11px] font-mono py-1 border-b border-slate-50 last:border-0">
                            <span className="text-slate-600 truncate max-w-[200px]">{m.name}</span>
                            <span className="font-semibold text-slate-800">₹{m.cost.toLocaleString()}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-[10px] text-slate-400 text-center py-2">No material costs mentioned. Heuristic estimates applied.</div>
                      )}
                    </div>
                  </div>

                  {/* Timeline Gantt / Schedule Tracking */}
                  <div className="border border-slate-150 rounded-lg p-3">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-150 mb-2">
                      <CalendarRange className="w-3.5 h-3.5 text-blue-500" />
                      Projected Milestones & Gantt Timeline
                    </span>
                    <div className="relative border-l border-slate-200 ml-2 pl-4 space-y-3.5 pt-1.5 pb-1.5">
                      {analysisResult.timeline && analysisResult.timeline.length > 0 ? (
                        analysisResult.timeline.map((item: any, idx: number) => (
                          <div key={idx} className="relative">
                            {/* Dot marker */}
                            <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white" />
                            <div className="flex justify-between items-start gap-4">
                              <span className="text-[11px] text-slate-600 font-medium leading-none font-sans">{item.event}</span>
                              <span className="text-[10px] font-mono font-bold text-blue-600 shrink-0">{item.date}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-[10px] text-slate-400 text-center">No schedule metrics detected.</div>
                      )}
                    </div>
                  </div>

                  {/* Action Items Checklist */}
                  {analysisResult.actionItems && analysisResult.actionItems.length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-150">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-200 mb-2">
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                        Extracted Action Items
                      </span>
                      <ul className="space-y-1.5">
                        {analysisResult.actionItems.map((item: string, idx: number) => (
                          <li key={idx} className="flex gap-2 text-[11px] text-slate-600 font-sans">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                /* Python Terminal Logs view */
                <div className="p-4 flex flex-col gap-4 overflow-y-auto max-h-[380px] bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed flex-1">
                  {/* Script Code highlight block */}
                  <div className="bg-slate-900 border border-slate-850 rounded-lg p-3 shadow-inner">
                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-800 mb-2">
                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest font-mono">🐍 python3 email_scanner.py</span>
                      <span className="text-[9px] text-emerald-500 font-bold font-mono">ACTIVE SCRIPT IN USE</span>
                    </div>
                    <pre className="text-cyan-400 text-[10px] leading-relaxed select-all overflow-x-auto whitespace-pre">
{`for e in emails:
    print(f"\\nProcessing: {e['subject']}")
    # Use AI to read and decide
    ai_decision = analyze_email_with_ai(e)
    
    # Print the AI's understanding
    print(json.dumps(ai_decision, indent=2))
    
    # 3. Take Action Based on Content
    if ai_decision["urgency"] == "HIGH":
        print(f"🚨 ALERT: Taking immediate action for: {ai_decision['summary']}")`}
                    </pre>
                  </div>

                  {/* Terminal stdout block */}
                  <div className="flex flex-col gap-1.5">
                    <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest pb-1 border-b border-slate-900 font-mono">
                      Console Standard Output (stdout)
                    </div>
                    <div className="p-3 bg-black border border-slate-900 rounded-lg text-[10px] text-slate-300 font-mono whitespace-pre-wrap leading-relaxed select-all">
                      <span className="text-slate-500 block mb-1">$ python3 email_scanner.py --case-id={activeComplaint.caseId || "SC-B8F2A3"}</span>
                      {analysisResult.pythonConsoleLog || `Found 1 new matching emails.

Processing: Re: URGENT RESOLUTION REQUIRED: Pothole Hazard (CASE TICKET: SC-B8F2A3)
{
  "urgency": "${analysisResult.urgency || 'HIGH'}",
  "summary": "${analysisResult.summary || 'The department has approved the road repairs permit.'}",
  "sentiment": "${analysisResult.sentiment || 'Cooperative'}",
  "actionItems": [
    "Procure initial asphalt and bitumen materials",
    "Obtain local ward traffic safety clearance certificate",
    "Initiate physical crew mobilization to location"
  ],
  "ticketId": "SC-${activeComplaint.caseId ? activeComplaint.caseId.slice(-6) : 'B8F2A3'}",
  "status": "permitted"
}

🚨 ALERT: Taking immediate action for: ${analysisResult.summary || 'The department has approved the road repairs permit.'}`}
                    </div>
                  </div>
                </div>
              )}

              {/* Action sync footer showing automatic application */}
              <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">AUTOMATED SYNC ACTIVE</span>
                </div>
                <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 animate-fade-in" id="apply-success-msg">
                  <Check className="w-4 h-4" />
                  <span>Decisions Applied & Synced Automatically</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
