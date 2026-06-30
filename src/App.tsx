import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Complaint, Department, NotificationLog, LogType, ComplaintStatus, CommunityThread } from './types';
import CitizenPortal from './components/CitizenPortal';
import VerificationMap from './components/VerificationMap';
import DepartmentPortal from './components/DepartmentPortal';
import GamificationCenter from './components/GamificationCenter';
import NotificationConsole from './components/NotificationConsole';
import CivicAuditLedger from './components/CivicAuditLedger';
import { LocalCommunities } from './components/LocalCommunities';
import { Megaphone, Map, Building, Trophy, Sparkles, RefreshCw, Info, Users, LogOut, Compass, MapPin, Locate } from 'lucide-react';
import LoginPage from './components/LoginPage';
import AnimatedAvatar from './components/AnimatedAvatar';
import { getHumanFallbackAddress } from './utils/locationutils';

export default function App() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [communities, setCommunities] = useState<CommunityThread[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [activeTab, setActiveTab] = useState<'citizen' | 'map' | 'admin' | 'gamification' | 'communities'>('citizen');

  // Authenticated user state
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    aadhaar: string;
    mobile: string;
  } | null>(() => {
    const saved = localStorage.getItem('social_constraint_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Gamification tracking (local-state synced on citizen audits)
  const [citizenXP, setCitizenXP] = useState(10);
  const [unlockedBadgeIds, setUnlockedBadgeIds] = useState<string[]>([]);
  const [citizenRank, setCitizenRank] = useState('Novice Sentinel');

  // Real-time GPS location state
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [userAddress, setUserAddress] = useState<string>('');
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'idle' | 'prompting' | 'requesting' | 'granted' | 'denied'>('idle');
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);

  // Refs for tracking notification states and previous complaint statuses
  const alertedIdsRef = useRef<string[]>([]);
  const previousStatusesRef = useRef<Record<string, ComplaintStatus>>({});
  const userLocationRef = useRef<{lat: number; lng: number} | null>(null);
  const userAddressRef = useRef<string>('');

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  useEffect(() => {
    userAddressRef.current = userAddress;
  }, [userAddress]);

  // Helper to trigger operating system-level notifications
  const triggerSystemNotification = (title: string, body: string) => {
    if (!('Notification' in window)) {
      console.warn('System notifications are not supported by this browser.');
      return;
    }
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body });
      } catch (e) {
        console.error('Error creating system notification:', e);
      }
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      });
    }
  };

  // Watch for complaints status transitions and trigger operating system level notifications
  useEffect(() => {
    complaints.forEach(c => {
      const prevStatus = previousStatusesRef.current[c.id];
      if (prevStatus !== undefined && prevStatus !== c.status) {
        // Status changed! Notify via native system notification
        let title = '';
        let body = '';

        switch (c.status) {
          case 'scanning':
            title = '🔍 AI Scan Initiated';
            body = `AI Vision model is analyzing your ticket: "${c.title}"`;
            break;
          case 'broadcast':
            title = '📢 1km Area Broadcast';
            body = `Ticket "${c.title}" fanned out to ${c.totalNeighbors} neighbors in your 1km grid.`;
            break;
          case 'verified':
            title = '✅ Community Verified';
            body = `Consensus met! Neighbors verified your ticket: "${c.title}"`;
            break;
          case 'email_draft':
            title = '✉️ Dispatch Email Generated';
            body = `Gemini generated dispatch work order email for "${c.title}". Ready for review.`;
            break;
          case 'dispatched':
            title = '🚀 Dispatched to Agency';
            body = `Case dispatched directly to ${c.department}. Continuously pinging updates.`;
            break;
          case 'acknowledged':
            title = '⚡ Work Order Approved!';
            body = `${c.department} approved Case SC-${c.caseId.slice(-6)}: "${c.title}"`;
            break;
          case 'scheduled':
            title = '📅 Repair Crew Scheduled';
            body = `A repair crew has been scheduled for SC-${c.caseId.slice(-6)}.`;
            break;
          case 'repairing':
            title = '🔧 Crew On Site / Repairing';
            body = `Repair crew has arrived on site. Repairs are in progress!`;
            break;
          case 'repaired_audit':
            title = '📸 Proof of Work Uploaded';
            body = `${c.department} uploaded repair photo! Click "Audit Feedback" to inspect.`;
            break;
          case 'resolved':
            title = '🎉 Ticket Resolved & Restored!';
            body = `Excellent! Ticket SC-${c.caseId.slice(-6)} has been officially closed and resolved.`;
            break;
        }

        if (title && body) {
          triggerSystemNotification(title, body);
        }
      } else if (prevStatus === undefined) {
        // A new complaint was created! (if there was already some data to avoid startup noise)
        const isLoadedInitially = Object.keys(previousStatusesRef.current).length > 0;
        if (isLoadedInitially) {
          triggerSystemNotification(
            '🆕 Ticket Created Successfully',
            `New municipal ticket logged: "${c.title}". AI vision diagnosis initiated!`
          );
        }
      }
      // Keep track of the last known status
      previousStatusesRef.current[c.id] = c.status;
    });
  }, [complaints]);

  // Fetch initial collections from full-stack Express API
  const fetchData = async () => {
    try {
      const compRes = await fetch('/api/complaints');
      const compiledComp = await compRes.json();
      setComplaints(compiledComp);

      const deptRes = await fetch('/api/departments');
      const compiledDepts = await deptRes.json();
      setDepartments(compiledDepts);

      const commRes = await fetch('/api/communities');
      const compiledComm = await commRes.json();
      setCommunities(compiledComm);

      const logsRes = await fetch('/api/logs');
      const compiledLogs = await logsRes.json();
      const uniqueLogs: NotificationLog[] = [];
      const seenIds = new Set<string>();
      for (const log of compiledLogs) {
        if (!seenIds.has(log.id)) {
          seenIds.add(log.id);
          uniqueLogs.push(log);
        }
      }
      setLogs(uniqueLogs);
    } catch (err) {
      console.error("Initial data load error: ", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addLog = useCallback(async (type: LogType, text: string) => {
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, text }),
      });
      const newLog = await res.json();
      setLogs(prev => {
        if (prev.some(l => l.id === newLog.id)) return prev;
        return [...prev, newLog];
      });
    } catch (err) {
      // Offline fallback
      const randomPart = Math.floor(Math.random() * 1000000);
      const fallbackId = `log-fallback-${Date.now()}-${randomPart}-${Math.random().toString(36).substr(2, 9)}`;
      setLogs(prev => {
        if (prev.some(l => l.id === fallbackId)) return prev;
        return [
          ...prev,
          {
            id: fallbackId,
            timestamp: new Date().toLocaleTimeString(),
            type,
            text,
          },
        ];
      });
    }
  }, []);

  // Using imported getHumanFallbackAddress

  const requestLiveLocation = useCallback(() => {
    setLocationPermissionStatus('requesting');
    addLog('SYSTEM', "📡 Initiating live satellite connection to fetch real-time GPS coordinates...");
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            lat: parseFloat(position.coords.latitude.toFixed(6)),
            lng: parseFloat(position.coords.longitude.toFixed(6))
          };
          setUserLocation(coords);
          setLocationPermissionStatus('granted');
          localStorage.setItem('gps_permission_status', 'granted');
          addLog('SYSTEM', `📍 GPS satellite lock acquired: [${coords.lat}, ${coords.lng}]. Querying Google Maps Geocoding API...`);
          
          try {
            const res = await fetch(`/api/geocode?lat=${coords.lat}&lng=${coords.lng}`);
            const data = await res.json();
            if (data.address) {
              setUserAddress(data.address);
              addLog('SYSTEM', `🗺️ Google Maps Location Identified: "${data.formattedAddress || data.address}"`);
            } else {
              setUserAddress(getHumanFallbackAddress(coords.lat, coords.lng));
            }
          } catch (e) {
            console.error(e);
            setUserAddress(getHumanFallbackAddress(coords.lat, coords.lng));
          }
        },
        async (error) => {
          console.warn('GPS location access restricted (common in iframe sandboxes):', error.code, error.message);
          setLocationPermissionStatus('denied');
          localStorage.setItem('gps_permission_status', 'denied');
          
          let mockLat = userLocationRef.current?.lat;
          let mockLng = userLocationRef.current?.lng;
          const hasExistingLocation = !!(mockLat && mockLng);

          if (!hasExistingLocation) {
            // Generate a high-fidelity dynamic Chennai location fallback instead of a blank state
            const baseLat = 12.9716;
            const baseLng = 80.2425;
            const offsetLat = (Math.random() - 0.5) * 0.02;
            const offsetLng = (Math.random() - 0.5) * 0.02;
            mockLat = parseFloat((baseLat + offsetLat).toFixed(6));
            mockLng = parseFloat((baseLng + offsetLng).toFixed(6));
            setUserLocation({ lat: mockLat, lng: mockLng });
            addLog('SYSTEM', `⚠️ GPS lock unavailable (Error ${error.code}: ${error.message || 'Restricted'}). Geocoding dynamic Chennai sandbox GPS sector [${mockLat}, ${mockLng}]...`);
          } else {
            addLog('SYSTEM', `⚠️ GPS lock restricted. Re-using active verified GPS coordinates [${mockLat!.toFixed(6)}, ${mockLng!.toFixed(6)}].`);
          }
          
          if (hasExistingLocation && userAddressRef.current) {
            setUserAddress(userAddressRef.current);
            return;
          }
          
          try {
            const res = await fetch(`/api/geocode?lat=${mockLat}&lng=${mockLng}`);
            const data = await res.json();
            if (data.address) {
              setUserAddress(data.address);
              addLog('SYSTEM', `🗺️ Geocoded Current Location: "${data.formattedAddress || data.address}"`);
            } else {
              setUserAddress(getHumanFallbackAddress(mockLat!, mockLng!));
            }
          } catch (e) {
            console.error(e);
            setUserAddress(getHumanFallbackAddress(mockLat!, mockLng!));
          }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationPermissionStatus('denied');
      addLog('SYSTEM', `⚠️ Geolocation is not supported by this browser.`);
    }
  }, [addLog, getHumanFallbackAddress]);

  // Automatically request GPS location permission and browser system notification permission on platform launch
  useEffect(() => {
    if (currentUser) {
      requestLiveLocation();

      // Ask for standard system notification permission
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              addLog('SYSTEM', "🔔 System notification permission granted! Native browser notifications are active.");
              try {
                new Notification("Social Constraint Portal", {
                  body: "Live system notifications activated successfully!",
                });
              } catch (err) {
                console.error(err);
              }
            } else {
              addLog('SYSTEM', "⚠️ System notification permission denied. To receive instant system notifications, enable them in browser settings.");
            }
          });
        } else if (Notification.permission === 'granted') {
          addLog('SYSTEM', "🔔 System notification permission is already active. Ready to dispatch alert notifications.");
        }
      }
    }
  }, [currentUser, requestLiveLocation, addLog]);

  const handleClearLogs = async () => {
    setLogs([]);
    addLog('SYSTEM', "System terminal logs cleared by the user.");
  };

  // State calculations
  const activeComplaint = selectedId === 'new_problem' ? null : (complaints.find(c => c.id === selectedId) || complaints[0] || null);

  // Autonomously poll the gmail check-replies in the background every 4 seconds when in dispatched state
  useEffect(() => {
    if (!activeComplaint || activeComplaint.status !== 'dispatched' || activeComplaint.emailReplyReceived) {
      return;
    }

    let isPolling = false;
    const intervalId = setInterval(async () => {
      if (isPolling) return;
      isPolling = true;

      try {
        const res = await fetch('/api/gmail-check-replies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: activeComplaint.id })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.replyFound) {
            setComplaints(prev => prev.map(c => {
              if (c.id === activeComplaint.id) {
                return {
                  ...c,
                  status: data.status,
                  emailReplyReceived: data.replyFound,
                  emailReplyBody: data.emailReplyBody,
                  emailReplyReceivedAt: data.emailReplyReceivedAt,
                  funding: data.funding || c.funding,
                  repairedImage: data.status === 'repaired_audit' ? (data.repairedImage || undefined) : undefined,
                  departmentDecision: data.departmentDecision,
                  decisionExplanation: data.decisionExplanation,
                  permissionDays: data.permissionDays,
                  completedWithoutProof: data.completedWithoutProof,
                  emailAnalysis: data.emailAnalysis
                };
              }
              return c;
            }));

            if (data.status === 'repaired_audit') {
              addLog('REWARD', `✨ Gemini Scan complete! Proof of repair verified. Unlocking accomplishment photo & itemized bill ledger.`);
              awardXP(15);
            } else {
              addLog('SYSTEM', `📬 Gemini background scan detected reply! Status updated autonomously to ${data.status}`);
            }

            if (data.emailAnalysis?.urgency === 'HIGH') {
              addLog('ALERT', `🚨 ALERT: Taking immediate action for: ${data.emailAnalysis.summary || data.confirmationSummary || "Official response received"}`);
            }
          }
        }
      } catch (err) {
        console.error("Background poll error:", err);
      } finally {
        isPolling = false;
      }
    }, 4000);

    return () => clearInterval(intervalId);
  }, [activeComplaint?.id, activeComplaint?.status, activeComplaint?.emailReplyReceived]);

  // Real-time Automated Geolocation and Complaint Initialization Pipeline
  const handleUploadAndCreateComplaint = async (imageSrc: string, isSingleUser: boolean = false, fileName?: string, additionalImages?: string[], confirmedAddress?: string, userDescription?: string) => {
    addLog('SYSTEM', "Initiating browser GPS geolocation lock...");

    let lat = 12.9716; // Default Chennai, Tamil Nadu latitude
    let lng = 80.2425; // Default Chennai, Tamil Nadu longitude

    const getCoords = (): Promise<{lat: number, lng: number}> => {
      return new Promise((resolve) => {
        if (userLocation) {
          addLog('SYSTEM', `Using pre-verified real-time GPS location: [${userLocation.lat}, ${userLocation.lng}]`);
          resolve(userLocation);
          return;
        }
        if (navigator.geolocation) {
          try {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                addLog('SYSTEM', `Automatic GPS lock acquired: [${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}]`);
                resolve({ lat: parseFloat(position.coords.latitude.toFixed(6)), lng: parseFloat(position.coords.longitude.toFixed(6)) });
              },
              (error) => {
                const offsetLat = (Math.random() - 0.5) * 0.02;
                const offsetLng = (Math.random() - 0.5) * 0.02;
                const mockLat = parseFloat((lat + offsetLat).toFixed(6));
                const mockLng = parseFloat((lng + offsetLng).toFixed(6));
                
                let reason = "access restricted/denied";
                if (error.code === error.TIMEOUT) reason = "request timed out";
                else if (error.code === error.POSITION_UNAVAILABLE) reason = "position unavailable";
                
                addLog('SYSTEM', `📍 Geolocation fallback activated (${reason}). Assigned sandbox GPS lock: Chennai sector [${mockLat}, ${mockLng}]`);
                resolve({ lat: mockLat, lng: mockLng });
              },
              { enableHighAccuracy: false, timeout: 10000 }
            );
          } catch (err) {
            const offsetLat = (Math.random() - 0.5) * 0.02;
            const offsetLng = (Math.random() - 0.5) * 0.02;
            const mockLat = parseFloat((lat + offsetLat).toFixed(6));
            const mockLng = parseFloat((lng + offsetLng).toFixed(6));
            addLog('SYSTEM', `Geolocation lock block exception: ${err instanceof Error ? err.message : String(err)}. Assigned fallback GPS lock: Chennai sector [${mockLat}, ${mockLng}]`);
            resolve({ lat: mockLat, lng: mockLng });
          }
        } else {
          resolve({ lat, lng });
        }
      });
    };

    const coords = await getCoords();

    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: "Diagnosing visual proof...",
          description: userDescription || "Scanning image files using Gemini Flash...",
          coordinates: coords,
          image: imageSrc,
          images: additionalImages ? [imageSrc, ...additionalImages] : [imageSrc],
          severity: "Medium",
          isSingleUser: isSingleUser,
          fileName: fileName,
          reporterEmail: currentUser?.email,
          locationAddress: confirmedAddress
        })
      });
      const newComp = await res.json();
      
      setComplaints(prev => [...prev, newComp]);
      setSelectedId(newComp.id);

      addLog('SYSTEM', `New problem ticket created with ID: ${newComp.caseId}. Starting AI Vision analysis...`);
      await handleAnalyzeComplaint(newComp.id, imageSrc);

    } catch (err) {
      console.error(err);
      addLog('SYSTEM', "Error establishing connection to community registers.");
    }
  };

  useEffect(() => {
    // Dynamically adjust citizen rank based on XP accumulator
    if (citizenXP < 30) {
      setCitizenRank('Novice Sentinel');
    } else if (citizenXP < 85) {
      setCitizenRank('Active Guardian');
    } else {
      setCitizenRank('Lead Civic Commissioner');
    }
  }, [citizenXP]);

  const awardXP = (points: number) => {
    setCitizenXP(prev => prev + points);
  };

  const unlockBadge = (badgeId: string) => {
    setUnlockedBadgeIds(prev => {
      if (!prev.includes(badgeId)) {
        return [...prev, badgeId];
      }
      return prev;
    });
  };

  // REST RESTORE Simulator DB clean
  const handleResetSimulation = async () => {
    try {
      await fetch('/api/reset-dashboard', { method: 'POST' });
      setCitizenXP(10);
      setUnlockedBadgeIds([]);
      setCitizenRank('Novice Sentinel');
      setActiveTab('citizen');
      setSelectedId('');
      await fetchData();
    } catch (err) {
      window.location.reload();
    }
  };

  // Automatic repair, citizen notification and resolution loop once dispatched!
  useEffect(() => {
    // Find the first complaint in an active workflow state
    const activeWorkflow = complaints.find(c => 
      c.status === 'dispatched' || 
      c.status === 'acknowledged' || 
      c.status === 'scheduled' || 
      c.status === 'repairing' ||
      c.status === 'repaired_audit'
    );

    if (!activeWorkflow) return;

    if (activeWorkflow.emailReplyReceived) {
      // If a reply has been received, the workflow transitions are driven entirely
      // by the scanned email contents and user interactive actions, not by this automatic loop.
      return;
    }

    const currentStatus = activeWorkflow.status;
    let nextStatus: ComplaintStatus | null = null;
    let logText = '';
    let logType: LogType = 'SYSTEM';
    let delay = 3500;

    switch (currentStatus) {
      case 'dispatched':
        if (!activeWorkflow.emailReplyReceived) {
          // Process on hold until email reply verified
          return;
        }
        nextStatus = 'acknowledged';
        logType = 'DISPATCH';
        logText = `[Progress Broadcast] ${activeWorkflow.department} has officially Acknowledged Case Ticket SC-${activeWorkflow.caseId.slice(-6)} and dispatched local repair inspector.`;
        delay = 3500;
        break;
      case 'acknowledged':
        nextStatus = 'scheduled';
        logType = 'SYSTEM';
        logText = `[Progress Broadcast] Repair schedule established for Case Ticket SC-${activeWorkflow.caseId.slice(-6)}. Tools, hardware supplies & engineering crew allocated.`;
        delay = 3500;
        break;
      case 'scheduled':
        nextStatus = 'repairing';
        logType = 'SYSTEM';
        logText = `[Progress Broadcast] Mobile workforce arrived at ${activeWorkflow.locationAddress || 'the hazard location'}. Operations actively underway.`;
        delay = 3500;
        break;
      case 'repairing':
        nextStatus = 'repaired_audit';
        logType = 'SYSTEM';
        logText = `[Progress Broadcast] Refit and repair works successfully completed! Before-after photographic proofs cataloged. Waiting for citizen completion verification...`;
        delay = 4500;
        break;
    }

    if (!nextStatus) return;

    const timer = setTimeout(() => {
      // 1. Log the broadcast message
      addLog(logType, logText);

      // If we are moving to resolved, award performance scores and citizen points!
      if (nextStatus === 'resolved') {
        const completionTime = (Math.random() * 1.5 + 1.2).toFixed(1); // implicit turnaround time
        const performanceBonus = 120; // Honor points
        
        // Notify all users in the logs system
        addLog('INFO', `[Speed Metric] Resolved in record speed (${completionTime} hours). Department turnaround efficiency rated: OUTSTANDING.`);
        addLog('REWARD', `[Score Awarded] ${activeWorkflow.department} awarded +${performanceBonus} Performance Points for record minimum completion time!`);
        
        // Give points to user for care for the public and interaction (e.g. +75 GP)
        const citizenPoints = activeWorkflow.userPointsEarned || 50;
        awardXP(citizenPoints);
        addLog('REWARD', `[Citizen Points] ${currentUser?.email || 'megapraveen6380@gmail.com'} awarded +${citizenPoints} Citizen Care Points for public interaction and outstanding civic responsibility!`);

        // Unlock Voice Badge for checking and voting
        unlockBadge('voice');

        // Update departments leaderboard state
        setDepartments(prevD => prevD.map(d => {
          if (d.name === activeWorkflow.department) {
            const currentBadges = [...d.badges];
            if (!currentBadges.includes("Super-Fast Turnaround")) {
              currentBadges.push("Super-Fast Turnaround");
            }
            if (!currentBadges.includes("Honourable Response")) {
              currentBadges.push("Honourable Response");
            }
            return {
              ...d,
              resolvedCount: d.resolvedCount + 1,
              rating: parseFloat(Math.min(5.0, d.rating + 0.4).toFixed(1)),
              badges: currentBadges,
              performancePoints: (d.performancePoints || 0) + performanceBonus,
              totalFundingAllocated: d.totalFundingAllocated + (activeWorkflow.funding?.totalBudget || 10500)
            };
          }
          return d;
        }));
      }

      // Update complaints state locally
      setComplaints(prev => prev.map(c => {
        if (c.id === activeWorkflow.id) {
          const updated: Complaint = { 
            ...c, 
            status: nextStatus as any 
          };
          if (nextStatus === 'repaired_audit') {
            // Before-after images based on type
            let proofPhoto = "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=600";
            if (c.type.toLowerCase().includes('waste')) {
              proofPhoto = "https://images.unsplash.com/photo-1516216628859-9bccecab13ca?auto=format&fit=crop&q=80&w=600";
            } else if (c.type.toLowerCase().includes('light')) {
              proofPhoto = "https://images.unsplash.com/photo-1513829096999-49786022c4f5?auto=format&fit=crop&q=80&w=600";
            } else if (c.type.toLowerCase().includes('water')) {
              proofPhoto = "https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&q=80&w=600";
            }
            updated.repairedImage = proofPhoto;
          }
          return updated;
        }
        return c;
      }));

      // Post status update to server database to persist
      fetch(`/api/complaints/${activeWorkflow.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      }).catch(err => console.error(err));

    }, delay);

    return () => clearTimeout(timer);
  }, [complaints]);

  // Stage 2: AI visual inspection call back
  const handleAnalyzeComplaint = async (id: string, imageBase64?: string) => {
    try {
      const res = await fetch('/api/analyze-complaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, imageBase64 })
      });
      const data = await res.json();

      // Update in-memory complaint
      setComplaints(prev => prev.map(c => {
        if (c.id === id) {
          const isSingle = c.isSingleUser || data.status === 'verified' || data.status === 'email_draft';
          addLog('SYSTEM', `AI Image Scan Success: Classed as "${data.type}" assigned to agency "${data.department}". Severity level matched: ${data.severity}.`);
          addLog('AI', `Diagnosis Remarks: "${data.analysisSummary}"`);
          if (!isSingle) {
            addLog('BROADCAST', `Geographic fanning fanned out notification pings to ${c.totalNeighbors} local devices inside a 1km grid.`);
          }
          
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
            status: isSingle ? 'email_draft' as const : 'broadcast' as const
          };
        }
        return c;
      }));

      // Award "Community Guardian" badge for reporting!
      awardXP(30);
      unlockBadge('guardian');
      addLog('REWARD', "Citizen XP +30 points awarded! Sentinel Badge 'Community Guardian' unlocked.");

      // Check if this is a single user complaint
      const activeC = complaints.find(comp => comp.id === id);
      const isSingleUserComplaint = activeC?.isSingleUser || data.status === 'verified' || data.status === 'email_draft';

      if (isSingleUserComplaint) {
        setTimeout(async () => {
          addLog('SYSTEM', "Direct Single-User Complaint bypass activated. Using auto-scanned dynamic email draft...");
          if (data.emailBody) {
            setComplaints(prev => prev.map(comp => {
              if (comp.id === id) {
                return { 
                  ...comp, 
                  emailBody: data.emailBody, 
                  emailTemplate: data.emailTemplate || data.emailBody,
                  status: 'email_draft' as const 
                };
              }
              return comp;
            }));
            addLog('AI', `Draft email composed during image scan for single-user dispatch directly to ${data.department}. Redirecting to routing page.`);
          } else {
            try {
              const emailRes = await fetch('/api/generate-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
              });
              const emailObj = await emailRes.json();
              if (emailObj.emailBody) {
                setComplaints(prev => prev.map(comp => {
                  if (comp.id === id) {
                    return { 
                      ...comp, 
                      emailBody: emailObj.emailBody, 
                      emailTemplate: emailObj.emailTemplate || emailObj.emailBody,
                      status: 'email_draft' as const 
                    };
                  }
                  return comp;
                }));
                addLog('AI', `Draft email composed for single-user dispatch directly to ${data.department}. Redirecting to routing page.`);
              }
            } catch (err) {
              console.error(err);
            }
          }
          setActiveTab('admin');
        }, 800);
      } else {
        // Automatically transition user viewport to Map for broadcast verification checking
        setTimeout(() => {
          setActiveTab('map');
        }, 300);
      }

    } catch (error) {
      console.error(error);
      addLog('SYSTEM', "Analysis failure. Running on mock predictions fallback.");
    }
  };

  // Event handler when verified overvotes hit maximum quorum
  const handleNeighborVerificationComplete = async () => {
    // 1. Shift state to draft routing email
    setComplaints(prev => prev.map(c => {
      if (c.id === selectedId) {
        return { ...c, status: 'email_draft' as const };
      }
      return c;
    }));

    // 2. Award XP and unlock sentinel badges
    awardXP(20);
    unlockBadge('sentinel');
    addLog('REWARD', "Consensus reached! Citizen XP +20 points awarded! Unlocked 'Sentinel Badge' for local overvoting.");

    // 3. Ask Express server to use Gemini to draft the dynamic authority emails
    addLog('SYSTEM', `Routing case metrics to ${activeComplaint.department}. Invoking Gemini email engine...`);
    try {
      const res = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedId })
      });
      const emailObj = await res.json();
      if (emailObj.emailBody) {
        setComplaints(prev => prev.map(c => {
          if (c.id === selectedId) {
            return { ...c, emailBody: emailObj.emailBody, status: 'email_draft' as const };
          }
          return c;
        }));
        addLog('AI', `Email successfully composed for ${activeComplaint.department}. Redirecting user review tab...`);
      }
    } catch (err) {
      console.error(err);
    }

    // Redirect to Department Portal tab to review routing
    setActiveTab('admin');
  };

  const handleDispatchSuccess = () => {
    // XP bonus on Dispatching
    awardXP(10);
  };

  const handleProgressStepChange = (status: ComplaintStatus) => {
    if (status === 'repaired_audit') {
      // Transition tab so citizen can auditley progress proof
      setActiveTab('citizen');
    }
  };

  // Helper banner guides translating the active states
  const getWalkthroughHelper = () => {
    if (activeTab === 'communities') {
      return {
        title: "🗺️ Location-Based Civic Forums & Reviews",
        desc: "Discuss local issues with neighbors around your environment, join nearby geo-fenced groups, and post reviews regarding department performance and dispatch speed."
      };
    }
    if (!activeComplaint) return { title: "Step 1: Upload a Regional Problem", desc: "Drag and drop or select an image of a municipal problem in your area. Geolocation locks, AI vision diagnostics, and INR budgeting will start automatically!" };

    switch (activeComplaint.status) {
      case 'captured':
        return {
          title: "Step 1: Upload a Regional Problem",
          desc: "Welcome citizen! Drag & drop or upload visual proof and approve the drafted mail, with zero manual input forms required."
        };
      case 'scanning':
        return {
          title: "Step 2: AI Analyzing Complaint proof",
          desc: "Gemini is performing computer vision analysis: categorizing hazard type, estimating damage severity, and designating corresponding municipal routing."
        };
      case 'broadcast':
        return {
          title: "Step 3: 1km Neighborhood Verification Consensus",
          desc: "Alerts broadcasted to all neighbor devices within 1.0 km. We need 5 local overvoting confirmations to establish consensus. Click 'Simulate Upvote' (+1) or verify auto-upvotes."
        };
      case 'verified':
      case 'email_draft':
        return {
          title: "Step 4: AI Complaint Routing & Email Drafting",
          desc: "The case is routed to your local department. Read the Gemini-drafted email, edit parameters if you desire, and click 'Approve & Dispatch Mail'."
        };
      case 'dispatched':
      case 'acknowledged':
      case 'scheduled':
      case 'repairing':
        return {
          title: "Step 5: Municipal Dispatch Tracking Hub",
          desc: "The email is successfully sent. The platform continuously broadcasts updates to neighbors. Go and use the 'Department Progress Checklist' controls below to step through municipal investigations and repairs."
        };
      case 'repaired_audit':
        return {
          title: "Step 6: Community Audit Feedback",
          desc: "The department reports work completed and uploaded a repaired photo! Audit this repair on the Complaint Resolution Center card by clicking 'Yes, Resolved' or 'No, Reopen'."
        };
      case 'resolved':
        return {
          title: "Step 7: Case Closed & Restored!",
          desc: "Simulation completed! Feedback is affirmative. Congratulations letters fanned out. Click 'Restart Sandbox' below to start another local hazard case."
        };
      default:
        return { title: "Portal Standby", desc: "Browse other portal screens." };
    }
  };

  const helper = getWalkthroughHelper();

  if (!currentUser) {
    return (
      <LoginPage 
        onLoginSuccess={(u) => {
          setCurrentUser(u);
          addLog('SYSTEM', `🔐 SECURE GATEWAY CLEARED: Citizen "${u.name}" authenticated via Aadhaar.`);
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none antialiased">

      {/* Visual Header Grid Panel */}
      <header className="bg-white/85 flex flex-col lg:flex-row justify-between items-center gap-4 px-6 py-4 border-b border-slate-100 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black font-display text-slate-800 tracking-tight leading-none">Social Constraint</h1>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">Community AI Complaint Platform</p>
            </div>
          </div>

          {/* GPS Location Pill Indicator with Google Maps Integration */}
          <div className="flex items-center shrink-0">
            <button
              onClick={requestLiveLocation}
              className={`px-3 py-1.5 rounded-xl border text-[10.5px] font-bold flex items-center gap-2.5 transition-all duration-200 shadow-sm cursor-pointer select-none max-w-xs truncate ${
                locationPermissionStatus === 'granted'
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-200'
                  : locationPermissionStatus === 'requesting'
                  ? 'bg-amber-50 border-amber-100 text-amber-800 animate-pulse'
                  : 'bg-slate-50 border-slate-200/60 text-slate-500 hover:bg-slate-100/80'
              }`}
              title="Click to manually refresh your high-precision GPS coordinates via Google Maps"
            >
              <span className="flex h-1.5 w-1.5 relative shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  locationPermissionStatus === 'granted' ? 'bg-emerald-400' : locationPermissionStatus === 'requesting' ? 'bg-amber-400' : 'bg-slate-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                  locationPermissionStatus === 'granted' ? 'bg-emerald-500' : locationPermissionStatus === 'requesting' ? 'bg-amber-500' : 'bg-slate-500'
                }`}></span>
              </span>
              <span className="truncate font-sans font-semibold">
                {locationPermissionStatus === 'granted' && userAddress
                  ? `GPS Locked: ${userAddress}`
                  : locationPermissionStatus === 'requesting'
                  ? 'Establishing GPS lock...'
                  : 'GPS Standby (Chennai Fallback)'}
              </span>
              <Locate className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 shrink-0" />
            </button>
          </div>
        </div>

        {/* Tab Navigator */}
        <div className="flex items-center gap-3.5 flex-wrap md:flex-nowrap">
          <nav className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200">
            <button 
              onClick={() => setActiveTab('citizen')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'citizen' ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              Citizen Portal
            </button>
            <button 
              onClick={() => setActiveTab('map')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'map' ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              Verification Map
            </button>
            <button 
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'admin' ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              Department Portal
            </button>
            <button 
              onClick={() => setActiveTab('gamification')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'gamification' ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              Gamification Center
            </button>
          </nav>

          {/* Elegant Divider */}
          <div className="hidden md:block w-[1px] h-6 bg-slate-200"></div>

          {/* Separately Highlighted Live Chat Button */}
          <button 
            onClick={() => setActiveTab('communities')}
            className={`px-4 py-2.5 text-xs font-black rounded-xl flex items-center gap-2 transition-all duration-150 border cursor-pointer select-none whitespace-nowrap ${
              activeTab === 'communities' 
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/10' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200'
            }`}
          >
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <Users className="w-3.5 h-3.5" />
            Local Chat Hub
            <span className={`px-1 py-0.2 text-[8px] font-black uppercase tracking-widest rounded ${
              activeTab === 'communities' ? 'bg-emerald-700 text-white' : 'bg-emerald-600 text-white'
            }`}>
              LIVE
            </span>
          </button>
        </div>

        {/* Dynamic Citizen Profile Badge */}
        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-4 w-full md:w-auto justify-end">
          <div className="flex flex-col items-end text-right">
            <span className="text-xs font-black text-slate-800 font-display flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {currentUser.name}
            </span>
            <span className="text-[9px] font-mono font-bold text-slate-400">UID: {currentUser.aadhaar}</span>
          </div>
          
          <AnimatedAvatar 
            seed={currentUser.aadhaar + currentUser.mobile + currentUser.name} 
            size={40} 
            isAnimated={true} 
          />

          <button
            onClick={() => {
              localStorage.removeItem('social_constraint_current_user');
              setCurrentUser(null);
              addLog('SYSTEM', "Logged out. Session cleared.");
            }}
            className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition border border-transparent hover:border-rose-100 cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 w-full flex-1 flex flex-col gap-6">
        {/* Step Walkthrough Banner */}
        <section className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3.5 items-start">
          <div className="bg-emerald-100 rounded-lg p-2 text-emerald-600 shrink-0">
            <Info className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-slate-850 text-sm font-display">{helper.title}</h3>
            <p className="text-xs text-slate-600 leading-normal mt-0.5">{helper.desc}</p>
          </div>
        </section>

        {/* Conditional Layout for Communities vs Normal Grid */}
        {activeTab === 'communities' ? (
          <div className="w-full flex-1 flex flex-col animate-in fade-in duration-200">
            <LocalCommunities 
              communities={communities}
              setCommunities={setCommunities}
              departments={departments}
              userCoordinates={activeComplaint?.coordinates}
              addLog={addLog}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-6 w-full flex-1">
            {/* Dashboard Grid Container */}
            <main className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start flex-1">
            {/* Main workspace section (Left Column - Span 3) */}
            <div className="lg:col-span-3 flex flex-col gap-6">
              
              {/* Conditional Perspective Renderers */}
              {activeTab === 'citizen' && (
                <CitizenPortal 
                  activeComplaint={activeComplaint}
                  complaints={complaints}
                  setComplaints={setComplaints}
                  setSelectedId={setSelectedId}
                  onAnalyze={handleAnalyzeComplaint}
                  onUpload={handleUploadAndCreateComplaint}
                  addLog={addLog}
                  communities={communities}
                  currentUser={currentUser}
                  userAddress={userAddress}
                  requestLiveLocation={requestLiveLocation}
                  locationPermissionStatus={locationPermissionStatus}
                  awardXP={awardXP}
                  unlockBadge={unlockBadge}
                  setDepartments={setDepartments}
                />
              )}

              {activeTab === 'gamification' && (
                <GamificationCenter 
                  citizenXP={citizenXP}
                  citizenRank={citizenRank}
                  unlockedBadgeIds={unlockedBadgeIds}
                  departments={departments}
                  complaints={complaints}
                />
              )}

              {activeComplaint ? (
                <>
                  {activeTab === 'map' && (
                    <VerificationMap 
                      activeComplaint={activeComplaint}
                      setComplaints={setComplaints}
                      onVerificationComplete={handleNeighborVerificationComplete}
                      addLog={addLog}
                      complaints={complaints}
                    />
                  )}

                  {activeTab === 'admin' && (
                    <DepartmentPortal 
                      activeComplaint={activeComplaint}
                      setComplaints={setComplaints}
                      addLog={addLog}
                      onDispatchSuccess={handleDispatchSuccess}
                      onProgressStepChange={handleProgressStepChange}
                      awardXP={awardXP}
                      unlockBadge={unlockBadge}
                      setDepartments={setDepartments}
                      onResolveComplete={() => {
                        setSelectedId('new_problem');
                        setActiveTab('citizen');
                      }}
                      setSelectedId={setSelectedId}
                    />
                  )}


                </>
              ) : (
                activeTab !== 'citizen' && activeTab !== 'gamification' && (
                  <div className="bg-white border border-slate-100 p-8 rounded-2xl text-center flex flex-col items-center justify-center gap-2">
                    <Info className="w-8 h-8 text-emerald-500 animate-bounce" />
                    <p className="text-sm text-slate-800 font-semibold font-display">Awaiting Incident Upload</p>
                    <p className="text-xs text-slate-500 max-w-sm">Please head over to the Citizen Portal to upload an image of a municipal problem in your area first.</p>
                  </div>
                )
              )}

            </div>

            {/* Sidebar System Console (Right Column - Span 1) */}
            <aside className="lg:col-span-1 flex flex-col gap-6 lg:sticky lg:top-24">
              
              {/* System Status Tracker */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col gap-1.5">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest font-mono text-slate-400">Simulation Steps</h3>
                <div className="flex flex-col gap-2 mt-2">
                  <div className={`flex items-center gap-2 text-xs font-semibold ${
                    activeComplaint?.status === 'captured' ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${activeComplaint?.status === 'captured' ? 'bg-emerald-600 animate-pulse' : 'bg-slate-300'}`} />
                    1. Capture Problem Proof
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-semibold ${
                    activeComplaint?.status === 'scanning' ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${activeComplaint?.status === 'scanning' ? 'bg-emerald-600 animate-pulse' : 'bg-slate-300'}`} />
                    2. AI Vision Categorization
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-semibold ${
                    activeComplaint?.status === 'broadcast' ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${activeComplaint?.status === 'broadcast' ? 'bg-emerald-600 animate-pulse' : 'bg-slate-300'}`} />
                    3. 1km Neighbor Overvotes
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-semibold ${
                    activeComplaint?.status === 'verified' || activeComplaint?.status === 'email_draft' ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${activeComplaint?.status === 'verified' || activeComplaint?.status === 'email_draft' ? 'bg-emerald-600 animate-pulse' : 'bg-slate-300'}`} />
                    4. AI Draft & Route Mail
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-semibold ${
                    activeComplaint?.status === 'dispatched' || activeComplaint?.status === 'acknowledged' || activeComplaint?.status === 'scheduled' || activeComplaint?.status === 'repairing' ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      activeComplaint?.status === 'dispatched' || activeComplaint?.status === 'acknowledged' || activeComplaint?.status === 'scheduled' || activeComplaint?.status === 'repairing'
                        ? 'bg-emerald-600 animate-pulse' : 'bg-slate-300'
                    }`} />
                    5. Dispatch & Continuous Pings
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-semibold ${
                    activeComplaint?.status === 'repaired_audit' || activeComplaint?.status === 'resolved' ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      activeComplaint?.status === 'repaired_audit' || activeComplaint?.status === 'resolved'
                        ? 'bg-emerald-600 animate-pulse' : 'bg-slate-300'
                    }`} />
                    6. Citizen Audit Feedback
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3.5 mt-2">
                  <button 
                    onClick={handleResetSimulation}
                    className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition outline-none cursor-pointer"
                  >
                    Restart Sandbox Demo
                  </button>
                </div>
              </div>
              
              {/* Live Civic Audit Ledger Widget */}
              <CivicAuditLedger 
                complaints={complaints} 
                departments={departments} 
              />

              {/* Scrolling terminal output */}
              <NotificationConsole 
                logs={logs}
                onClear={handleClearLogs}
              />
            </aside>
          </main>
          </div>
        )}
      </div>

      {/* Visually Humble Footer Credit */}
      <footer className="text-center py-5 text-[10px] text-slate-400 tracking-wider font-mono shrink-0 select-none bg-white border-t border-slate-100 mt-12">
        SOCIAL CONSTRAINT INC • MULTI-PHASE CITIZEN COMPLAINT SIMULATOR • 2026
      </footer>
    </div>
  );
}
