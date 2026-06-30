import React, { useState, useRef, useEffect } from 'react';
import { Complaint, CommunityThread } from '../types';
import { getHumanFallbackAddress } from '../utils/locationutils';
import MunicipalInvoice from './MunicipalInvoice';
import { 
  Shield, 
  AlertTriangle, 
  Image as ImageIcon, 
  MapPin, 
  Sparkles, 
  UploadCloud, 
  CheckCircle2, 
  Send, 
  Building,
  HardHat,
  Volume2,
  RefreshCw,
  FileText,
  Locate
} from 'lucide-react';

interface CitizenPortalProps {
  activeComplaint: Complaint | null;
  complaints: Complaint[];
  setComplaints: React.Dispatch<React.SetStateAction<Complaint[]>>;
  setSelectedId: (id: string) => void;
  onAnalyze: (id: string, imageBase64?: string) => Promise<void>;
  onUpload: (imageSrc: string, isSingleUser?: boolean, fileName?: string, additionalImages?: string[], confirmedAddress?: string, userDescription?: string) => Promise<void>;
  addLog: (type: any, text: string) => void;
  communities?: CommunityThread[];
  currentUser?: { name: string; email: string; aadhaar: string; mobile: string; } | null;
  userAddress?: string;
  requestLiveLocation?: () => void;
  locationPermissionStatus?: 'idle' | 'prompting' | 'requesting' | 'granted' | 'denied';
  awardXP?: (points: number) => void;
  unlockBadge?: (badgeId: string) => void;
  setDepartments?: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function CitizenPortal({
  activeComplaint,
  complaints,
  setComplaints,
  setSelectedId,
  onAnalyze,
  onUpload,
  addLog,
  communities = [],
  currentUser,
  userAddress,
  requestLiveLocation,
  locationPermissionStatus,
  awardXP = () => {},
  unlockBadge = () => {},
  setDepartments = () => {},
}: CitizenPortalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [approverName, setApproverName] = useState(currentUser?.name || 'Praveen');

  useEffect(() => {
    if (currentUser?.name) {
      setApproverName(currentUser.name);
    }
  }, [currentUser]);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({
    intake: true,
    consensus: true,
    draft: true,
    repairs: true,
    audit: true,
    resolved: false,
  });
  const [uploadMode, setUploadMode] = useState<'single' | 'batch'>('single');
  const [isSingleUserMode, setIsSingleUserMode] = useState(false);
  const [selectedFilesList, setSelectedFilesList] = useState<{ name: string; base64: string }[]>([]);
  const [confirmedLocationAddress, setConfirmedLocationAddress] = useState<string>(userAddress || "Locating your exact GPS area...");
  const [isAddressConfirmed, setIsAddressConfirmed] = useState<boolean>(false);
  const [userProblemDescription, setUserProblemDescription] = useState<string>("");
  const [localSelectedImage, setLocalSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (userAddress && !isAddressConfirmed) {
      const isPlaceholder = 
        confirmedLocationAddress === "Locating your exact GPS area..." ||
        confirmedLocationAddress === "Checking nearest municipal GPS registry sector..." ||
        !confirmedLocationAddress;
        
      if (isPlaceholder) {
        setConfirmedLocationAddress(userAddress);
      }
    }
  }, [userAddress, isAddressConfirmed, confirmedLocationAddress]);

  useEffect(() => {
    setLocalSelectedImage(null);
  }, [activeComplaint?.id]);

  useEffect(() => {
    if (selectedFilesList.length > 0) {
      if (!userAddress && requestLiveLocation) {
        addLog('SYSTEM', '📡 Image selected: Requesting high-precision GPS satellite address synchronization for exact problem area...');
        requestLiveLocation();
      }
    }
  }, [selectedFilesList.length, requestLiveLocation, userAddress]);

  useEffect(() => {
    if (requestLiveLocation && locationPermissionStatus === 'idle') {
      addLog('SYSTEM', 'Autopilot: Requesting high-precision GPS satellite address synchronization...');
      requestLiveLocation();
    }
  }, [requestLiveLocation, locationPermissionStatus]);

  const [batchQueue, setBatchQueue] = useState<Array<{ tempId: string; name: string; status: string; progress: number; error?: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  // Distance helper
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const dLat = lat1 - lat2;
    const dLng = lng1 - lng2;
    return parseFloat((Math.sqrt(dLat * dLat + dLng * dLng) * 111).toFixed(2));
  };

  // Helper to find range and closest community
  const getCommunityInfo = (comp: Complaint) => {
    if (!communities || communities.length === 0) return null;
    
    // Find closest community
    let closestComm = communities[0];
    let minDistance = calculateDistance(comp.coordinates.lat, comp.coordinates.lng, closestComm.lat, closestComm.lng);
    
    for (let i = 1; i < communities.length; i++) {
      const dist = calculateDistance(comp.coordinates.lat, comp.coordinates.lng, communities[i].lat, communities[i].lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestComm = communities[i];
      }
    }
    
    const isWithinRange = minDistance <= closestComm.radius;
    return {
      communityName: closestComm.name,
      distance: minDistance,
      radius: closestComm.radius,
      isWithinRange,
    };
  };

  // Live counters for big category boxes
  const newCount = complaints.filter(c => c.status === 'captured' || c.status === 'scanning' || c.status === 'broadcast' || c.status === 'verified' || c.status === 'email_draft').length;
  const ongoingCount = complaints.filter(c => c.status === 'dispatched' || c.status === 'acknowledged' || c.status === 'scheduled' || c.status === 'repairing' || c.status === 'repaired_audit').length;
  const resolvedCount = complaints.filter(c => c.status === 'resolved').length;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const addFilesToSelection = async (files: FileList) => {
    setIsUploading(true);
    addLog('SYSTEM', `Reading and caching ${files.length} visual file buffers for incident report...`);
    
    const filesArray = Array.from(files);
    for (const file of filesArray) {
      try {
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });

        let finalBase64 = base64String;
        if (file.type.startsWith('image/')) {
          finalBase64 = await resizeImage(base64String);
        }

        setSelectedFilesList(prev => [...prev, { name: file.name, base64: finalBase64 }]);
      } catch (err) {
        addLog('SYSTEM', `Error processing file: ${file.name}`);
      }
    }
    setIsUploading(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await addFilesToSelection(e.dataTransfer.files);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await addFilesToSelection(e.target.files);
    }
  };

  const handleSingleSubmission = async () => {
    if (selectedFilesList.length === 0) return;
    setIsUploading(true);
    try {
      const primaryImage = selectedFilesList[0].base64;
      const additionalImages = selectedFilesList.slice(1).map(f => f.base64);
      const primaryFileName = selectedFilesList[0].name;

      addLog('SYSTEM', `Starting direct submission with ${selectedFilesList.length} images...`);
      await onUpload(
        primaryImage, 
        isSingleUserMode, 
        primaryFileName, 
        additionalImages, 
        confirmedLocationAddress,
        userProblemDescription.trim() || undefined
      );
      setSelectedFilesList([]);
      setUserProblemDescription("");
    } catch (err) {
      addLog('SYSTEM', "Error initializing auto-reporting upload chain.");
    } finally {
      setIsUploading(false);
    }
  };

  const resizeImage = (base64Str: string, maxWidth: number = 640, maxHeight: number = 640): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  };

  const handleFile = async (file: File) => {
    setIsUploading(true);
    addLog('SYSTEM', `Captured local media: "${file.name}" (${(file.size / 1024).toFixed(1)} KB). Reading visual buffers...`);
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      let base64String = reader.result as string;
      try {
        if (file.type.startsWith('image/')) {
          base64String = await resizeImage(base64String);
        }
        await onUpload(base64String, isSingleUserMode, file.name);
      } catch (err) {
        addLog('SYSTEM', "Error initializing auto-reporting upload chain.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleMultiFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleBatchFiles(e.target.files);
    }
  };

  const handleBatchFiles = async (fileList: FileList) => {
    setIsUploading(true);
    addLog('SYSTEM', `Initializing Multi-User Post Room: queuing ${fileList.length} problems for concurrent submission...`);
    
    const filesArray = Array.from(fileList);
    const newQueueItems = filesArray.map((file, idx) => ({
      tempId: `batch-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      name: file.name,
      status: 'Uploading file buffer...',
      progress: 15,
      file
    }));
    
    setBatchQueue(prev => [...prev, ...newQueueItems]);

    // Process all complaints concurrently in parallel!
    await Promise.all(newQueueItems.map(async (item) => {
      try {
        // 1. Read file as base64
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(item.file);
        });

        let finalBase64 = base64String;
        if (item.file.type.startsWith('image/')) {
          finalBase64 = await resizeImage(base64String);
        }

        setBatchQueue(prev => prev.map(q => q.tempId === item.tempId ? { ...q, progress: 45, status: 'Acquiring GPS...' } : q));

        // 2. Fetch coordinates (Chennai sector with random variations for concurrency realism)
        let lat = 12.9716 + (Math.random() - 0.5) * 0.03;
        let lng = 80.2425 + (Math.random() - 0.5) * 0.03;

        setBatchQueue(prev => prev.map(q => q.tempId === item.tempId ? { ...q, progress: 65, status: 'Creating Ticket...' } : q));

        // 3. Create complaint
        const res = await fetch('/api/complaints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: "Diagnosing visual proof...",
            description: "Scanning image files using Gemini Flash...",
            coordinates: { lat, lng },
            image: finalBase64,
            severity: "Medium",
            fileName: item.name
          })
        });
        const newComp = await res.json();
        
        // Add to state
        setComplaints(prev => [...prev, newComp]);

        setBatchQueue(prev => prev.map(q => q.tempId === item.tempId ? { ...q, progress: 85, status: 'AI Computer Vision Scanning...' } : q));

        // 4. Trigger analysis
        const analysisRes = await fetch('/api/analyze-complaint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: newComp.id, imageBase64: finalBase64 })
        });
        const data = await analysisRes.json();

        setComplaints(prev => prev.map(c => {
          if (c.id === newComp.id) {
            return {
              ...c,
              title: data.title || c.title,
              description: data.description || c.description,
              type: data.type,
              department: data.department,
              severity: data.severity,
              funding: data.funding || c.funding,
              emailBody: data.emailBody || c.emailBody,
              emailTemplate: data.emailTemplate || c.emailTemplate,
              status: 'broadcast' as const
            };
          }
          return c;
        }));

        addLog('SYSTEM', `Ticket SC-${newComp.caseId.slice(-6)} concurrently routed to ${data.department} with active consensus pings.`);

        setBatchQueue(prev => prev.map(q => q.tempId === item.tempId ? { ...q, progress: 100, status: `Success: Routed to ${data.department}` } : q));
      } catch (err) {
        console.error(err);
        setBatchQueue(prev => prev.map(q => q.tempId === item.tempId ? { ...q, status: 'Failed', error: 'Routing failed' } : q));
      }
    }));

    setIsUploading(false);
  };

  // Direct Inline Mail Dispatcher
  const handleApproveMail = () => {
    if (!activeComplaint) return;
    setIsSendingMail(true);
    addLog('DISPATCH', `User "${approverName}" approved clearance draft. Official community complaint email is routed to ${activeComplaint.department}...`);
    
    // Persist status change to backend
    fetch(`/api/complaints/${activeComplaint.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'dispatched' })
    }).catch(err => console.error("Failed to update status in backend on dispatch", err));

    setTimeout(() => {
      setComplaints(prev => prev.map(c => {
        if (c.id === activeComplaint.id) {
          return { 
            ...c, 
            status: 'dispatched' as const,
            emailBody: c.emailTemplate || c.emailBody 
          };
        }
        return c;
      }));
      setIsSendingMail(false);
      addLog('DISPATCH', `Dispatch successful! Case Reference Ticket ${activeComplaint.caseId} signed by ${approverName} registered with continuous notification pings active.`);
      
      // Autonomous focus on resolution center
      setTimeout(() => {
        const element = document.getElementById('panel-resolution');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 350);
    }, 250);
  };

  // Regenerate email with custom approver signature
  const handleRegenerateEmailWithApprover = async (name: string) => {
    if (!activeComplaint) return;
    setIsSendingMail(true);
    addLog('SYSTEM', `Re-drafting official complaint email with signature authorization for Citizen Commissioner "${name}"...`);
    try {
      const res = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeComplaint.id, approverName: name })
      });
      const data = await res.json();
      if (data.emailBody) {
        setComplaints(prev => prev.map(c => {
          if (c.id === activeComplaint.id) {
            return { 
              ...c, 
              emailTemplate: data.emailBody, 
              emailBody: data.emailBody 
            };
          }
          return c;
        }));
        addLog('AI', `Gemini successfully cleared official routing clearance signed by: ${name}.`);
      }
    } catch (err) {
      addLog('SYSTEM', "Error updating clearance signature with Gemini.");
    } finally {
      setIsSendingMail(false);
    }
  };

  // Automatically trigger email signature regeneration when first viewed on draft stage
  useEffect(() => {
    if (activeComplaint && (activeComplaint.status === 'verified' || activeComplaint.status === 'email_draft') && !activeComplaint.emailBody?.includes(approverName)) {
      handleRegenerateEmailWithApprover(approverName);
    }
  }, [activeComplaint?.id, activeComplaint?.status]);

  // Determine current active complaint attributes
  const isScanning = activeComplaint ? (activeComplaint.status === 'captured' || activeComplaint.status === 'scanning') : false;
  const isPendingApproval = activeComplaint ? (activeComplaint.status === 'broadcast' || activeComplaint.status === 'verified' || activeComplaint.status === 'email_draft') : false;
  const isClosed = activeComplaint ? (activeComplaint.status === 'resolved') : false;

  const currentDisplayImage = localSelectedImage || activeComplaint?.image;

  const isVideo = currentDisplayImage?.startsWith('data:video/') || 
                  currentDisplayImage?.endsWith('.mp4') || 
                  currentDisplayImage?.includes('mixkit.co') ||
                  currentDisplayImage?.endsWith('.mov') || 
                  currentDisplayImage?.endsWith('.webm') || 
                  currentDisplayImage?.endsWith('.avi');

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full" id="citizen-portal-container">
      
      {/* LEFT COLUMN: Regional Cases Selector Panel */}
      <div className="xl:col-span-3 flex flex-col gap-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl h-full shadow-xs" id="citizen-sidebar">
        <div className="flex flex-col gap-1 pb-3 border-b border-slate-200">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              👥 Concurrency Active
            </span>
            <span className="text-[10px] font-mono text-slate-500 font-semibold bg-slate-200/60 px-1.5 py-0.5 rounded">
              {complaints.length} Tickets
            </span>
          </div>
          <h3 className="font-bold text-slate-800 text-sm font-display mt-2">Civic Incident Registry</h3>
          <p className="text-[10px] text-slate-400">Post concurrently, monitor ongoing processes, and check clearances.</p>
        </div>

        {/* Persistent slot for posting new problems */}
        <button
          onClick={() => setSelectedId('new_problem')}
          className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 border transition duration-150 cursor-pointer ${
            !activeComplaint 
              ? 'bg-emerald-600 hover:bg-emerald-750 text-white border-emerald-600 shadow-sm' 
              : 'bg-white hover:bg-slate-100 text-emerald-700 border-emerald-200 hover:border-emerald-300 shadow-3xs'
          }`}
          id="btn-report-new"
        >
          ➕ Post New Problem
        </button>

        {/* Process Stages Side Category Boxes */}
        <div className="flex flex-col gap-3" id="sidebar-stages-panel">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
            📌 PROCESS STAGES
          </span>
          <div className="flex flex-col gap-2 max-h-[620px] overflow-y-auto pr-1" id="sidebar-complaints-stages">
            {[
              {
                id: 'intake',
                label: 'AI Intake & Scan',
                icon: '🔍',
                statuses: ['captured', 'scanning'],
                color: 'bg-blue-50 text-blue-850 border-blue-150',
                activeColor: 'bg-blue-600 text-white border-blue-600',
                desc: 'Diagnostic vision reading'
              },
              {
                id: 'consensus',
                label: 'Local Consensus',
                icon: '📢',
                statuses: ['broadcast'],
                color: 'bg-amber-50 text-amber-800 border-amber-150',
                activeColor: 'bg-amber-500 text-white border-amber-500',
                desc: '1km network upvoting'
              },
              {
                id: 'draft',
                label: 'Legal Draft & Route',
                icon: '📝',
                statuses: ['verified', 'email_draft'],
                color: 'bg-indigo-50 text-indigo-800 border-indigo-150',
                activeColor: 'bg-indigo-600 text-white border-indigo-600',
                desc: 'Gemini drafting & signature'
              },
              {
                id: 'repairs',
                label: 'Active Repairs',
                icon: '🔧',
                statuses: ['dispatched', 'acknowledged', 'scheduled', 'repairing'],
                color: 'bg-violet-50 text-violet-850 border-violet-150',
                activeColor: 'bg-violet-600 text-white border-violet-600',
                desc: 'Government work order active'
              },
              {
                id: 'audit',
                label: 'Citizen Audit',
                icon: '📸',
                statuses: ['repaired_audit'],
                color: 'bg-rose-50 text-rose-800 border-rose-150',
                activeColor: 'bg-rose-600 text-white border-rose-600 animate-pulse',
                desc: 'Awaiting proof verification'
              },
              {
                id: 'resolved',
                label: 'Resolved & Closed',
                icon: '✅',
                statuses: ['resolved'],
                color: 'bg-emerald-50 text-emerald-800 border-emerald-150',
                activeColor: 'bg-emerald-600 text-white border-emerald-600',
                desc: 'Verified municipal solutions'
              }
            ].map((stage) => {
              const matchingComplaints = complaints.filter(c => stage.statuses.includes(c.status));
              const count = matchingComplaints.length;
              const isExpanded = !!expandedStages[stage.id];
              const hasActiveComplaintInStage = activeComplaint && stage.statuses.includes(activeComplaint.status);

              return (
                <div key={stage.id} className="flex flex-col gap-1.5 border border-slate-200/60 rounded-xl bg-white p-2">
                  <button
                    type="button"
                    onClick={() => setExpandedStages(prev => ({ ...prev, [stage.id]: !prev[stage.id] }))}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-all text-left cursor-pointer ${
                      hasActiveComplaintInStage 
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 font-bold' 
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{stage.icon}</span>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold tracking-tight font-display">{stage.label}</span>
                        <span className="text-[8px] text-slate-400 font-normal leading-none mt-0.5">{stage.desc}</span>
                      </div>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded-full font-mono text-[9px] font-black ${
                      count > 0 
                        ? (hasActiveComplaintInStage ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-800 text-white') 
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="flex flex-col gap-1.5 pl-1.5 border-l border-dashed border-slate-200 mt-1 pb-1">
                      {count === 0 ? (
                        <span className="text-[9px] text-slate-400 italic pl-1">No active tickets</span>
                      ) : (
                        matchingComplaints.map((comp) => {
                          const isActive = activeComplaint?.id === comp.id;
                          return (
                            <button
                              key={comp.id}
                              type="button"
                              onClick={() => setSelectedId(comp.id)}
                              className={`w-full text-left p-1.5 rounded-lg border transition-all flex items-center gap-2 cursor-pointer relative overflow-hidden group ${
                                isActive
                                  ? 'bg-slate-50 border-emerald-500 shadow-3xs ring-1 ring-emerald-500/10 font-medium'
                                  : 'bg-white hover:bg-slate-50 border-slate-150 hover:border-slate-300'
                              }`}
                            >
                              <img 
                                src={comp.image} 
                                className="w-6 h-6 rounded object-cover border border-slate-100 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-[10px] text-slate-700 font-display truncate leading-tight group-hover:text-slate-900">
                                  {comp.title}
                                </p>
                                <span className="text-[8px] text-slate-400 font-mono tracking-tight font-semibold">
                                  SC-{comp.caseId.slice(-6)}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Workspace and Form Submissions */}
      <div className="xl:col-span-9 flex flex-col" id="citizen-main-content">
        {!activeComplaint ? (
          /* Render Empty Onboarding Dashboard State */
          <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-xs flex flex-col gap-6" id="panel-citizen-empty">
            <div className="text-center max-w-xl mx-auto flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
                <Shield className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-2xl font-black font-display text-slate-800 tracking-tight">
                Seamless Regional Problem Reporter
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Zero-form filing architecture. Simply snap or upload a picture or video of the danger in your neighborhood. Our AI vision model automatically processes physical damages, targets your coordinates without hassle, calculates real Rupees (₹) funding bills, and drafts a precise legal mail directly to public cells.
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex justify-center border-b border-slate-100 pb-2 gap-2" id="upload-mode-tabs">
              <button
                type="button"
                onClick={() => setUploadMode('single')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${uploadMode === 'single' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                👤 Single Incident Report
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('batch')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${uploadMode === 'batch' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                👥 Multi-User Parallel Post Room
              </button>
            </div>

            {uploadMode === 'single' ? (
              <>
                {/* Complain Mode Selector Card */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4.5 flex flex-col gap-3">
                  <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider font-mono">📢 Choose Complaint Pathway</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div 
                      onClick={() => setIsSingleUserMode(false)}
                      className={`p-3.5 border rounded-xl flex items-start gap-3 cursor-pointer transition select-none ${
                        !isSingleUserMode 
                          ? 'bg-white border-emerald-500 shadow-3xs ring-2 ring-emerald-500/10' 
                          : 'bg-white/50 border-slate-200 hover:border-slate-350'
                      }`}
                    >
                      <input 
                        type="radio" 
                        checked={!isSingleUserMode}
                        onChange={() => setIsSingleUserMode(false)}
                        className="text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-black text-slate-850 font-display flex items-center gap-1">
                          👥 Co-Signed Campaign
                        </span>
                        <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                          Requires 10 co-signing upvotes from neighbors within 1.0 km consensus boundary to route legally. Ideal for block problems.
                        </p>
                      </div>
                    </div>

                    <div 
                      onClick={() => setIsSingleUserMode(true)}
                      className={`p-3.5 border rounded-xl flex items-start gap-3 cursor-pointer transition select-none ${
                        isSingleUserMode 
                          ? 'bg-white border-emerald-500 shadow-3xs ring-2 ring-emerald-500/10' 
                          : 'bg-white/50 border-slate-200 hover:border-slate-350'
                      }`}
                    >
                      <input 
                        type="radio" 
                        checked={isSingleUserMode}
                        onChange={() => setIsSingleUserMode(true)}
                        className="text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-black text-slate-850 font-display flex items-center gap-1">
                          👤 Direct Single Complaint
                        </span>
                        <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                          Bypasses neighborhood voting completely. Immediately generates verification data and schedules direct routing to public cell.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Drag-and-drop Card Zone or Staged Files Gallery */}
                {selectedFilesList.length > 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col gap-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-pulse" />
                        <span className="text-xs font-bold text-slate-800 font-display">
                          Staged Evidence ({selectedFilesList.length} files)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFilesList([])}
                        className="text-[10px] text-red-500 hover:text-red-600 font-semibold cursor-pointer transition outline-none"
                      >
                        Clear All
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-48 overflow-y-auto pr-1">
                      {selectedFilesList.map((fileItem, idx) => (
                        <div 
                          key={idx} 
                          className="relative border border-slate-150 rounded-xl h-24 overflow-hidden group bg-slate-900 shadow-2xs"
                        >
                          {fileItem.base64.startsWith('data:video/') ? (
                            <video 
                              src={fileItem.base64} 
                              className="w-full h-full object-cover"
                              muted
                            />
                          ) : (
                            <img 
                              src={fileItem.base64} 
                              alt="staged file" 
                              className="w-full h-full object-cover"
                            />
                          )}
                          
                          {/* File Index Badge */}
                          <div className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-md backdrop-blur-xs select-none">
                            #{idx + 1}
                          </div>

                          {/* Delete button overlay on hover */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFilesList(prev => prev.filter((_, itemIdx) => itemIdx !== idx));
                            }}
                            className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition hover:bg-red-700 cursor-pointer shadow-xs border border-red-500 outline-none"
                            title="Remove file"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}

                      {/* Small "+ Add More" card */}
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border border-dashed border-slate-300 rounded-xl h-24 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-slate-100 hover:border-emerald-400 transition"
                      >
                        <UploadCloud className="w-5 h-5 text-slate-450 group-hover:scale-110" />
                        <span className="text-[10px] font-bold text-slate-600 font-mono">+ Add More</span>
                      </div>
                    </div>

                    {/* Confirm Problem Location Form */}
                    <div className={`border rounded-xl p-4 flex flex-col gap-2 shadow-2xs transition-all duration-300 ${
                      !isAddressConfirmed ? 'border-amber-300 bg-amber-50/10' : 'border-emerald-200 bg-emerald-50/5 bg-white'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <MapPin className={`w-4 h-4 ${!isAddressConfirmed ? 'text-amber-500 animate-pulse' : 'text-emerald-600'}`} />
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider font-mono ${
                            !isAddressConfirmed ? 'text-amber-800' : 'text-emerald-700'
                          }`}>
                            📍 {!isAddressConfirmed ? 'Location Verification Required' : 'Location Verified & Confirmed'}
                          </span>
                        </div>
                        {requestLiveLocation && (
                          <button
                            type="button"
                            onClick={() => {
                              addLog('SYSTEM', 'Requesting high-precision GPS satellite address synchronization...');
                              requestLiveLocation();
                            }}
                            className={`text-[10px] px-2.5 py-1 rounded-lg font-mono font-bold flex items-center gap-1.5 transition cursor-pointer shadow-3xs ${
                              locationPermissionStatus === 'granted'
                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-750 hover:bg-emerald-100'
                                : locationPermissionStatus === 'requesting'
                                ? 'bg-amber-50 border border-amber-200 text-amber-750 animate-pulse'
                                : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <Locate className="w-3.5 h-3.5" />
                            {locationPermissionStatus === 'granted' ? 'Sync GPS' : 'Fetch GPS'}
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        To report this problem accurately, please confirm or edit the exact address of the problem uploading area detected via GPS & Google Maps:
                      </p>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={confirmedLocationAddress}
                          onChange={(e) => {
                            setConfirmedLocationAddress(e.target.value);
                            setIsAddressConfirmed(false); // require re-confirmation on edit
                          }}
                          placeholder="e.g. Near Gate 4, OMR Road, Chennai"
                          className="w-full pl-3 pr-10 py-2 border border-slate-250 rounded-lg text-xs font-semibold text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500"
                        />
                        <div className="absolute right-2.5 flex items-center pointer-events-none">
                          {locationPermissionStatus === 'requesting' ? (
                            <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                          ) : (
                            <MapPin className="w-4 h-4 text-slate-450" />
                          )}
                        </div>
                      </div>
                      {userAddress && userAddress !== confirmedLocationAddress && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmedLocationAddress(userAddress);
                            setIsAddressConfirmed(false);
                            addLog('SYSTEM', `Re-applied active GPS address: "${userAddress}"`);
                          }}
                          className="text-[9px] text-emerald-650 font-mono font-bold hover:underline text-left mt-0.5"
                        >
                          Reset to current GPS address: {userAddress}
                        </button>
                      )}

                      <div className="flex items-start gap-2.5 mt-2 pt-2.5 border-t border-slate-200/60">
                        <input
                          type="checkbox"
                          id="confirm-address-checkbox"
                          checked={isAddressConfirmed}
                          onChange={(e) => {
                            setIsAddressConfirmed(e.target.checked);
                            if (e.target.checked) {
                              addLog('SYSTEM', `✅ Citizen confirmed exact problem location: "${confirmedLocationAddress}"`);
                            }
                          }}
                          className="w-4 h-4 text-emerald-650 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer mt-0.5"
                        />
                        <label htmlFor="confirm-address-checkbox" className="text-[11px] font-semibold text-slate-700 cursor-pointer select-none leading-snug">
                          Yes, I confirm that the problem is located at this exact uploading area: <span className="text-emerald-700 font-extrabold font-mono">"{confirmedLocationAddress}"</span>.
                        </label>
                      </div>
                    </div>

                    {/* Optional Problem Description Form */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2 shadow-2xs">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-emerald-600 animate-pulse" />
                        <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider font-mono">
                          📝 Problem Description (Optional)
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Add a description or details about the problem (AI will prioritize your text as critical ground truth):
                      </p>
                      <textarea
                        value={userProblemDescription}
                        onChange={(e) => setUserProblemDescription(e.target.value)}
                        placeholder="Describe what's wrong, e.g. 'A dangerous 3-foot deep pothole is open right next to the school entrance...'"
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs font-semibold text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 resize-none"
                      />
                    </div>

                     <button
                      type="button"
                      onClick={handleSingleSubmission}
                      disabled={isUploading || !isAddressConfirmed}
                      className={`w-full py-3 px-4 text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 outline-none group duration-150 ${
                        !isAddressConfirmed && !isUploading
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer hover:-translate-y-0.5'
                      }`}
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Routing Complaint with AI clarity...</span>
                        </>
                      ) : !isAddressConfirmed ? (
                        <>
                          <MapPin className="w-4.5 h-4.5 text-amber-500 animate-bounce" />
                          <span>Please Verify & Confirm Exact Address Above</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 group-hover:animate-spin" />
                          <span>Analyze and Route Complaint with AI ({selectedFilesList.length} Files)</span>
                        </>
                      )}
                    </button>
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      className="hidden" 
                      accept="image/*,video/*"
                      multiple
                      onChange={handleFileInput}
                      disabled={isUploading}
                    />
                  </div>
                ) : (
                  <div 
                    className={`border-3 border-dashed rounded-2xl p-10 h-72 transition-all flex flex-col justify-center items-center cursor-pointer select-none gap-4 group ${
                      dragActive 
                        ? 'border-emerald-500 bg-emerald-50/20 scale-[0.99]' 
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-emerald-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    id="single-dropzone"
                  >
                    {isUploading ? (
                      <div className="text-center flex flex-col items-center gap-2">
                        <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin" />
                        <p className="text-sm font-semibold text-slate-800 font-display">Acquiring automated GPS lock...</p>
                        <p className="text-xs text-slate-400">Locking regional satellites and caching visual buffers</p>
                      </div>
                    ) : (
                      <div className="text-center flex flex-col items-center gap-2.5">
                        <div className="w-14 h-14 bg-white border border-slate-150 rounded-full shadow-sm flex items-center justify-center text-slate-450 group-hover:scale-110 duration-200">
                          <UploadCloud className="w-7 h-7 text-emerald-500" />
                        </div>
                        <p className="text-sm font-bold text-slate-700 font-display">
                          Drop your image or video proof here
                        </p>
                        <p className="text-xs text-slate-450 leading-relaxed max-w-xs">
                          Or click to browse storage files. Supports multiple file uploads.
                        </p>
                      </div>
                    )}
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      className="hidden" 
                      accept="image/*,video/*"
                      multiple
                      onChange={handleFileInput}
                      disabled={isUploading}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-5" id="batch-upload-panel">
                <div 
                  className={`border-3 border-dashed rounded-2xl p-10 h-60 transition-all flex flex-col justify-center items-center cursor-pointer select-none gap-4 group ${
                    dragActive 
                      ? 'border-emerald-500 bg-emerald-50/20 scale-[0.99]' 
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-emerald-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragActive(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      await handleBatchFiles(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => multiFileInputRef.current?.click()}
                  id="batch-dropzone"
                >
                  <div className="text-center flex flex-col items-center gap-2.5">
                    <div className="w-14 h-14 bg-white border border-slate-150 rounded-full shadow-sm flex items-center justify-center text-slate-450 group-hover:scale-110 duration-200">
                      <UploadCloud className="w-7 h-7 text-emerald-500 animate-pulse" />
                    </div>
                    <p className="text-sm font-bold text-slate-700 font-display">
                      Multi-User Parallel Submission Zone
                    </p>
                    <p className="text-xs text-slate-450 leading-relaxed max-w-sm">
                      Select or drop <b>multiple files at the same time</b>. The system will simulate multiple users posting different problems concurrently, routing all of them using parallel AI vision processes.
                    </p>
                  </div>
                  <input 
                    ref={multiFileInputRef}
                    type="file" 
                    multiple
                    className="hidden" 
                    accept="image/*,video/*"
                    onChange={handleMultiFileInput}
                    disabled={isUploading}
                  />
                </div>

                {/* Queue status list */}
                {batchQueue.length > 0 && (
                  <div className="flex flex-col gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4" id="batch-queue-container">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">
                      Concurrent Post Queue ({batchQueue.filter(q => q.progress === 100).length}/{batchQueue.length} Done)
                    </p>
                    <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                      {batchQueue.map((item) => (
                        <div key={item.tempId} className="bg-white border border-slate-150 rounded-xl p-3 flex flex-col gap-2 shadow-3xs animate-fade-in">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700 truncate max-w-xs">📁 {item.name}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.progress === 100 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              item.status === 'Failed' ? 'bg-red-50 text-red-700 border border-red-100' :
                              'bg-indigo-50 text-indigo-700 border border-indigo-100 animate-pulse'
                            }`}>
                              {item.status}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                item.status === 'Failed' ? 'bg-red-500' :
                                item.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                              }`} 
                              style={{ width: `${item.progress}%` }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sandbox Quick-Start Scenarios */}
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono text-center">
                Or Click a Sandbox Demo to Test Instantly
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  onClick={() => onUpload('https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=800')}
                  disabled={isUploading}
                  className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200/60 rounded-xl transition text-left group cursor-pointer animate-fade-in"
                >
                  <img
                    src="https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=120"
                    className="w-12 h-12 object-cover rounded-lg shrink-0 border border-slate-100 shadow-3xs"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <span className="block text-[11px] font-bold text-slate-705 group-hover:text-emerald-850">
                      🛣️ Road Pothole
                    </span>
                    <span className="text-[10px] text-slate-450 block mt-0.5">Test Road Damage AI routing & ₹ budget</span>
                  </div>
                </button>

                <button
                  onClick={() => onUpload('https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=800')}
                  disabled={isUploading}
                  className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200/60 rounded-xl transition text-left group cursor-pointer animate-fade-in"
                >
                  <img
                    src="https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=120"
                    className="w-12 h-12 object-cover rounded-lg shrink-0 border border-slate-100 shadow-3xs"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <span className="block text-[11px] font-bold text-slate-750 group-hover:text-emerald-850">
                      🗑️ Trash Mound
                    </span>
                    <span className="text-[10px] text-slate-450 block mt-0.5">Test Sanitation dispatch & ₹ cleaning bill</span>
                  </div>
                </button>

                <button
                  onClick={() => onUpload('https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&q=80&w=800')}
                  disabled={isUploading}
                  className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200/60 rounded-xl transition text-left group cursor-pointer animate-fade-in"
                >
                  <img
                    src="https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&q=80&w=120"
                    className="w-12 h-12 object-cover rounded-lg shrink-0 border border-slate-100 shadow-3xs"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <span className="block text-[11px] font-bold text-slate-750 group-hover:text-emerald-850">
                      💡 Street Lighting
                    </span>
                    <span className="text-[10px] text-slate-450 block mt-0.5">Test Electricity Board & replacement pricing</span>
                  </div>
                </button>

                <button
                  onClick={() => onUpload('https://assets.mixkit.co/videos/preview/mixkit-clogged-draining-system-after-heavy-rain-43615-large.mp4')}
                  disabled={isUploading}
                  className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200/60 rounded-xl transition text-left group cursor-pointer animate-fade-in"
                >
                  <div className="w-12 h-12 bg-slate-900 text-emerald-450 rounded-lg shrink-0 flex items-center justify-center border border-slate-700 shadow-3xs text-xs font-bold font-mono">
                    📹 VIDEO
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold text-slate-750 group-hover:text-emerald-850">
                      🌊 Clogged Drain
                    </span>
                    <span className="text-[10px] text-slate-450 block mt-0.5">Test Water & Sewage AI routing (Video)</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Informational safeguards panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-6">
              <div className="flex gap-2.5 items-start">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mt-1.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-755 font-display uppercase tracking-wider">No Forms Asked</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">Title, description, category, and department routing are fully managed by server-side vision nodes.</p>
                </div>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mt-1.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-755 font-display uppercase tracking-wider">INR Billing Estimates</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">AI automatically computes a granular materials bill-of-materials in Rupees for community transparency audits.</p>
                </div>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mt-1.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-755 font-display uppercase tracking-wider">1km Broadcast Alert</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">Pings neighbor feeds automatically with coordinate fences to trigger consensus overvotes before dispatching.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Render active complaint states */
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex flex-col gap-6" id="panel-citizen-active">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-500" />
                  Incident Active Reporter Workspace
                </h2>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Case ID Reference: {activeComplaint.caseId} (Incident ID: {activeComplaint.id})
                </span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold font-display flex items-center gap-1.5 ${
                isScanning ? 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse' :
                isClosed ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold' :
                'bg-amber-50 text-amber-700 border border-amber-100 font-bold'
              }`}>
                {isScanning ? '⚡ AI Vision Reading...' :
                 isClosed ? '✅ Case Resolved' : '🔄 Ongoing Process'}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column (Span 5): Image display with scanning visual indicator overlays */}
              <div className="lg:col-span-5 flex flex-col gap-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Citizen Visual Evidence
                </span>
                <div className="relative border border-slate-150 rounded-2xl h-80 overflow-hidden bg-slate-900 group shadow-lg">
                  {currentDisplayImage ? (
                    isVideo ? (
                      <video 
                        src={currentDisplayImage} 
                        controls
                        autoPlay
                        muted
                        loop
                        className="w-full h-full object-cover select-none"
                      />
                    ) : (
                      <img 
                        src={currentDisplayImage} 
                        alt="Active visual proof" 
                        className="w-full h-full object-cover select-none"
                        referrerPolicy="no-referrer"
                      />
                    )
                  ) : (
                    <div className="w-full h-full bg-slate-950 flex items-center justify-center p-4">
                      <ImageIcon className="w-12 h-12 text-slate-700" />
                    </div>
                  )}

                  {/* AI HUD scanning scanner laser bar overlay */}
                  {isScanning && (
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10 select-none">
                      <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent top-0 animate-[bounce_4s_infinite]" />
                      <Sparkles className="w-10 h-10 text-emerald-400 animate-spin mb-3" />
                      <h3 className="font-display font-medium text-white text-sm tracking-widest uppercase">
                        AI Computer Vision Active
                      </h3>
                      <p className="text-[10px] text-emerald-450 font-mono tracking-wide mt-1.5">
                        Scanning surface damage metrics...
                      </p>
                      <div className="w-40 bg-slate-800 h-1 rounded-full overflow-hidden mt-3 max-w-xs border border-slate-700">
                        <div className="bg-emerald-450 h-full w-2/3 rounded-full animate-[ping_1.5s_infinite]" />
                      </div>
                    </div>
                  )}

                  {/* Verified label overlay on active cards */}
                  {!isScanning && (
                    <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-white/10 shadow-md">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[10px] uppercase font-bold text-white tracking-widest font-mono">GPS Anchored & Cataloged</span>
                    </div>
                  )}
                </div>

                {/* Multiple Images Thumbnail Gallery */}
                {activeComplaint.images && activeComplaint.images.length > 1 && (
                  <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl flex flex-col gap-1.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      📷 Visual Proof Gallery ({activeComplaint.images.length} files)
                    </span>
                    <div className="grid grid-cols-5 gap-2">
                      {activeComplaint.images.map((imgUrl, idx) => (
                        <div 
                          key={idx}
                          onClick={() => setLocalSelectedImage(imgUrl)}
                          className={`h-12 rounded-lg overflow-hidden border-2 cursor-pointer transition relative group ${
                            currentDisplayImage === imgUrl 
                              ? 'border-emerald-500 shadow-xs' 
                              : 'border-slate-250 hover:border-slate-400'
                          }`}
                        >
                          <img 
                            src={imgUrl} 
                            alt={`Proof thumbnail ${idx + 1}`} 
                            className="w-full h-full object-cover select-none"
                          />
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent duration-150" />
                          <div className="absolute bottom-0.5 right-0.5 bg-black/75 text-white font-mono text-[8px] px-1 rounded-sm">
                            #{idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 flex flex-col gap-1.5 shadow-3xs">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Sensor Metrics</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-600 pt-0.5 border-t border-slate-100">
                    <span className="flex items-center gap-1 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-red-500" /> Location:
                    </span>
                    <span className="font-semibold text-slate-800 text-right truncate max-w-[200px]" title={activeComplaint.locationAddress || `${activeComplaint.coordinates.lat.toFixed(6)}, ${activeComplaint.coordinates.lng.toFixed(6)}`}>
                      {activeComplaint.locationAddress || getHumanFallbackAddress(activeComplaint.coordinates.lat, activeComplaint.coordinates.lng)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-600 pt-1">
                    <span className="text-slate-400">Case Reference ID:</span>
                    <span className="font-mono font-bold text-emerald-700">{activeComplaint.caseId}</span>
                  </div>

                  {(() => {
                    const commInfo = getCommunityInfo(activeComplaint);
                    if (!commInfo) return null;
                    return (
                      <div className="flex flex-col gap-1 border-t border-slate-200/60 pt-1.5 mt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium">📍 Nearest Community:</span>
                          <span className="font-bold text-slate-800 truncate max-w-[170px]" title={commInfo.communityName}>
                            {commInfo.communityName}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium font-mono">📏 Range / Proximity:</span>
                          <span className={`font-mono font-extrabold px-1.5 py-0.25 rounded text-[10px] ${
                            commInfo.isWithinRange
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {commInfo.distance} km {commInfo.isWithinRange ? `(In ${commInfo.radius}km Range)` : `(Out of Range)`}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Right Column (Span 7): Identified parameters, pricing ledgers, and direct email dispatch approval */}
              <div className="lg:col-span-7 flex flex-col gap-5 justify-between">
                
                <div className="flex flex-col gap-4">
                  
                  {/* Header diagnostic summary block */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold tracking-wider rounded-md uppercase font-mono">
                        {activeComplaint.type}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold tracking-wider rounded-md uppercase font-mono border ${
                        activeComplaint.severity === 'High' || activeComplaint.severity === 'Critical'
                          ? 'bg-red-50 text-red-600 border-red-100'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                        Severity: {activeComplaint.severity}
                      </span>
                    </div>

                    <h3 className="font-display font-black text-slate-800 text-lg leading-tight mt-1">
                      {activeComplaint.title}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                      {activeComplaint.description}
                    </p>
                  </div>

                  {/* Detailed circumstance and environmental metrics */}
                  {(activeComplaint.locationAddress || activeComplaint.circumstance || activeComplaint.environmentalImpact) && (
                    <div className="bg-blue-50/20 border border-blue-100/70 rounded-xl p-3.5 flex flex-col gap-2.5 text-xs" id="detailed-circumstance-panel">
                      {activeComplaint.locationAddress && (
                        <div className="flex gap-2 items-start" id="landmark-loc">
                          <span className="font-bold text-blue-900 shrink-0 font-display">📍 Specific Location:</span>
                          <span className="text-slate-700">{activeComplaint.locationAddress}</span>
                        </div>
                      )}
                      {activeComplaint.circumstance && (
                        <div className="flex gap-2 items-start" id="circumstance-context">
                          <span className="font-bold text-blue-900 shrink-0 font-display">🔍 Circumstance Context:</span>
                          <span className="text-slate-700">{activeComplaint.circumstance}</span>
                        </div>
                      )}
                      {activeComplaint.environmentalImpact && (
                        <div className="flex gap-2 items-start" id="env-impact">
                          <span className="font-bold text-blue-900 shrink-0 font-display">🌱 Environmental/Public Care:</span>
                          <span className="text-slate-700">{activeComplaint.environmentalImpact}</span>
                        </div>
                      )}
                      {activeComplaint.userPointsEarned && (
                        <div className="mt-1.5 pt-1.5 border-t border-blue-100/50 flex justify-between items-center text-[11px] font-bold text-emerald-800" id="goodwill-pts">
                          <span>💖 Community Goodwill & Care Points Awarded:</span>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-mono">+ {activeComplaint.userPointsEarned} GP</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dynamic Rupee Pricing Card */}
                  {activeComplaint.funding && (
                    <MunicipalInvoice 
                      funding={activeComplaint.funding}
                      department={activeComplaint.department}
                      category={activeComplaint.type}
                      caseId={activeComplaint.caseId}
                      title={activeComplaint.title}
                      status={activeComplaint.status}
                    />
                  )}

                  {/* Targeted Department routing summary */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-start gap-2.5">
                    <Building className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Target Government Department</span>
                      <span className="text-xs font-bold text-slate-700 font-display mt-0.5 block">{activeComplaint.department}</span>
                    </div>
                  </div>
                </div>

                {/* Action section based on active state of ticket */}
                <div className="border-t border-slate-100 pt-5 mt-3">
                  {activeComplaint.status === 'captured' || activeComplaint.status === 'scanning' ? (
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
                      <span className="text-xs font-semibold text-slate-700 font-display">Awaiting AI diagnostic scan complete...</span>
                    </div>
                  ) : activeComplaint.status === 'broadcast' ? (
                    <div className="bg-amber-50/70 border border-amber-100 p-4 rounded-xl flex flex-col gap-2">
                      <div className="flex gap-2 items-start">
                        <Volume2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 animate-bounce" />
                        <div>
                          <h4 className="text-xs font-bold text-amber-900 font-display uppercase tracking-wider">Broadcasting 1km Network Alert</h4>
                          <p className="text-[11px] text-slate-600 leading-normal mt-0.5">
                            Issue successfully categorized! We are currently notifying people in the 1km area of your GPS coordinate. <b>{activeComplaint.upvotes}/10</b> local neighbor verifications required on the Map tab before generating the final government envelope.
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-1">
                        <a 
                          href="#panel-map"
                          onClick={(e) => {
                            e.preventDefault();
                            const tabButton = document.querySelectorAll('nav button')[1] as HTMLButtonElement;
                            if (tabButton) tabButton.click();
                          }}
                          className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg shadow-sm transition"
                        >
                          Go to Verification Map & Vote
                        </a>
                      </div>
                    </div>
                  ) : activeComplaint.status === 'verified' || activeComplaint.status === 'email_draft' ? (
                    <div className="bg-indigo-50/40 border border-indigo-100 p-4 rounded-xl flex flex-col gap-3">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4.5 h-4.5 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-indigo-900 font-display uppercase tracking-wider">AI Legal Draft Formulated</h4>
                          <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                            Local neighbor upvotes completed. Gemini has compiled the metrics, location grids, and Rupee bill into an envelope. Kindly review and approve below to dispatch to {activeComplaint.department}.
                          </p>
                        </div>
                      </div>

                      {/* User Approver Name Input Slot */}
                      <div className="flex flex-col gap-1.5 bg-white border border-indigo-100 rounded-xl p-3" id="approver-name-field">
                        <label className="text-[9px] font-bold text-indigo-900 uppercase tracking-wider font-display flex items-center gap-1">
                          <span>👤 Citizen Approving Commissioner:</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={approverName}
                            onChange={(e) => setApproverName(e.target.value)}
                            placeholder="Enter your name to sign clearance..."
                            className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium text-slate-700"
                          />
                          <button
                            onClick={() => handleRegenerateEmailWithApprover(approverName)}
                            disabled={isSendingMail}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shrink-0 transition flex items-center gap-1 cursor-pointer"
                          >
                            {isSendingMail ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                            Update Signature
                          </button>
                        </div>
                        <p className="text-[8px] text-slate-400">
                          Your name is woven dynamically into the clearance, signature, and routing segments of the mail template.
                        </p>
                      </div>

                      <div className="bg-white/80 border border-indigo-100/50 rounded-lg p-2.5 font-mono text-[9px] leading-relaxed max-h-40 overflow-y-auto text-slate-650 shadow-inner">
                        {activeComplaint.emailTemplate || activeComplaint.emailBody}
                      </div>

                      <div className="flex justify-end mt-1">
                        <button
                          onClick={handleApproveMail}
                          disabled={isSendingMail}
                          className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-md transition outline-none cursor-pointer"
                        >
                          {isSendingMail ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          Approve & Send Complaint Mail
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex gap-3.5 items-start">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-emerald-900 font-display uppercase tracking-wider">Mail Dispatched & Under Investigation</h4>
                          <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                            The complaint has been dispatched under case ID <b>SC-{activeComplaint.caseId.slice(-6)}</b> by Citizen Commissioner <b>{approverName}</b>. Track and progress the repair status below.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        )}
      </div>

    </div>
  );
}
