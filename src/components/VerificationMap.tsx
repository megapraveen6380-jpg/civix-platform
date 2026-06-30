/// <reference types="google.maps" />//
import React, { useEffect, useRef, useState } from 'react';
import { Complaint } from '../types';
import { getHumanFallbackAddress } from '../utils/locationutils';

declare const google: any;
import { 
  Map as MapIcon, 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  Navigation, 
  Truck, 
  Compass, 
  Zap, 
  Shield, 
  Crosshair, 
  Radio 
} from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import * as LeafletNamespace from 'leaflet';
import LDefault from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Safe robust Leaflet resolver to handle ESM/CommonJS/UMD interop in Vite bundling
const L = (LDefault && (LDefault as any).map) 
  ? LDefault 
  : ((LeafletNamespace && (LeafletNamespace as any).map) 
    ? LeafletNamespace 
    : (window as any).L);

// Retrieve Google Maps Platform Key from environment or fallback
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY.startsWith('AIzaSy') && API_KEY.length >= 30;

interface VerificationMapProps {
  activeComplaint: Complaint;
  setComplaints: React.Dispatch<React.SetStateAction<Complaint[]>>;
  onVerificationComplete: () => void;
  addLog: (type: any, text: string) => void;
  complaints?: Complaint[];
}

// Map Recenter Component to pan map dynamically
function MapRecenter({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    if (map && center) {
      map.panTo(center);
    }
  }, [map, center.lat, center.lng]);
  return null;
}

// Google Maps Circle component helper (CF5 compliant)
interface CircleProps {
  center: { lat: number; lng: number };
  radius: number;
  options?: any;
}

function MapCircle({ center, radius, options }: CircleProps) {
  const map = useMap();
  const circleRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;
    if (typeof google === 'undefined' || !google || !google.maps) {
      console.warn("Google Maps API is not loaded yet.");
      return;
    }

    const circle = new google.maps.Circle({
      map,
      center,
      radius,
      fillColor: '#10b981',
      fillOpacity: 0.1,
      strokeColor: '#10b981',
      strokeOpacity: 0.5,
      strokeWeight: 1.5,
      ...options,
    });

    circleRef.current = circle;

    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
    };
  }, [map, center.lat, center.lng, radius, JSON.stringify(options)]);

  return null;
}

// Google Maps Polyline component helper
interface PolylineProps {
  path: { lat: number; lng: number }[];
  options?: any;
}

function MapPolyline({ path, options }: PolylineProps) {
  const map = useMap();
  const polylineRef = useRef<any>(null);

  useEffect(() => {
    if (!map || path.length === 0) return;
    if (typeof google === 'undefined' || !google || !google.maps) {
      console.warn("Google Maps API is not loaded yet.");
      return;
    }

    const polyline = new google.maps.Polyline({
      map,
      path,
      strokeColor: '#059669', // Emerald-600
      strokeOpacity: 0.8,
      strokeWeight: 4,
      ...options,
    });

    polylineRef.current = polyline;

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, path, JSON.stringify(options)]);

  return null;
}

export default function VerificationMap({
  activeComplaint,
  setComplaints,
  onVerificationComplete,
  addLog,
  complaints = [],
}: VerificationMapProps) {
  // Coordinates setup
  const lat = activeComplaint?.coordinates?.lat ?? 12.9716;
  const lng = activeComplaint?.coordinates?.lng ?? 80.2425;

  // Local state for neighbor simulation (co-voting gameplay)
  const [autoUpvote, setAutoUpvote] = useState(true);
  const [virtualNeighbors, setVirtualNeighbors] = useState<{ id: number; lat: number; lng: number }[]>([]);

  // User Real-time GPS Tracking State
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [userTextLocation, setUserTextLocation] = useState<string>('');
  const [isTrackingUser, setIsTrackingUser] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsHeading, setGpsHeading] = useState<number | null>(null);
  const [gpsSpeed, setGpsSpeed] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userCoords) {
      setUserTextLocation('');
      return;
    }

    const fetchUserTextLocation = async () => {
      try {
        const res = await fetch(`/api/geocode?lat=${userCoords.lat}&lng=${userCoords.lng}`);
        if (res.ok) {
          const data = await res.json();
          setUserTextLocation(data.formattedAddress || data.address || getHumanFallbackAddress(userCoords.lat, userCoords.lng));
        } else {
          setUserTextLocation(getHumanFallbackAddress(userCoords.lat, userCoords.lng));
        }
      } catch (err) {
        setUserTextLocation(getHumanFallbackAddress(userCoords.lat, userCoords.lng));
      }
    };

    fetchUserTextLocation();
  }, [userCoords?.lat, userCoords?.lng]);

  // Municipal Repair Crew Rig-4A GPS Tracker State
  const [crewCoords, setCrewCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [crewStatus, setCrewStatus] = useState<'idle' | 'transit' | 'working' | 'completed'>('idle');
  const [crewEta, setCrewEta] = useState<string>('');
  const [crewDistance, setCrewDistance] = useState<string>('');
  const [crewSpeed, setCrewSpeed] = useState<number>(0);
  const [crewProgress, setCrewProgress] = useState<number>(0);
  const [crewRoutePath, setCrewRoutePath] = useState<{ lat: number; lng: number }[]>([]);

  // Center reference to feed back to Google Maps
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat, lng });

  // Google Maps Auth failure self-healing and Leaflet fallback
  const [googleMapsAuthFailed, setGoogleMapsAuthFailed] = useState(false);
  const useLeaflet = !hasValidKey || googleMapsAuthFailed;

  // Intercept Google Maps auth failures
  useEffect(() => {
    const previousAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      console.warn("Google Maps API Key validation failed. Falling back to OpenStreetMap Leaflet Engine.");
      setGoogleMapsAuthFailed(true);
      addLog('SYSTEM', "⚠️ Google Maps authentication failure detected. Gracefully fell back to offline Leaflet/OpenStreetMap engine.");
      if (previousAuthFailure) {
        try {
          previousAuthFailure();
        } catch (e) {}
      }
    };
    return () => {
      // Maintain listener for stability
    };
  }, []);

  // Leaflet refs
  const leafletContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const leafletUserMarkerRef = useRef<any>(null);
  const leafletCrewMarkerRef = useRef<any>(null);
  const leafletRoutePolylineRef = useRef<any>(null);
  const leafletCircleRef = useRef<any>(null);
  const leafletNeighborsRef = useRef<any[]>([]);
  const leafletMainMarkerRef = useRef<any>(null);
  const leafletOtherMarkersRef = useRef<any[]>([]);

  // Sync Leaflet map rendering
  useEffect(() => {
    if (!useLeaflet || !leafletContainerRef.current) {
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.remove();
        } catch (e) {
          console.error(e);
        }
        leafletMapRef.current = null;
      }
      return;
    }

    const container = leafletContainerRef.current;
    if (container && (container as any)._leaflet_id) {
      (container as any)._leaflet_id = null;
    }

    let map = leafletMapRef.current;
    if (!map) {
      try {
        map = L.map(container, {
          zoomControl: true,
          scrollWheelZoom: true,
        }).setView([mapCenter.lat, mapCenter.lng], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);

        leafletMapRef.current = map;
      } catch (err) {
        console.warn("Leaflet Map init error:", err);
        return;
      }
    }

    // Move map view to mapCenter
    map.setView([mapCenter.lat, mapCenter.lng], map.getZoom() || 15);

    // Update main marker
    if (leafletMainMarkerRef.current) {
      map.removeLayer(leafletMainMarkerRef.current);
    }
    const mainIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full bg-red-500/30 animate-ping"></div>
          <div class="w-5 h-5 rounded-full bg-red-600 border-2 border-white shadow-md flex items-center justify-center">
            <div class="w-2 h-2 rounded-full bg-white"></div>
          </div>
        </div>
      `,
      className: '',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    leafletMainMarkerRef.current = L.marker([lat, lng], { icon: mainIcon })
      .addTo(map)
      .bindPopup(`<b class="font-sans text-xs">${activeComplaint.title}</b>`);

    // Update other complaints markers with approved/permitted highlights
    leafletOtherMarkersRef.current.forEach(m => map.removeLayer(m));
    leafletOtherMarkersRef.current = [];

    if (complaints && complaints.length > 0) {
      complaints.forEach(c => {
        // Skip active complaint since it has its own main marker
        if (c.id === activeComplaint.id) return;

        const cLat = c.coordinates?.lat;
        const cLng = c.coordinates?.lng;
        if (!cLat || !cLng) return;

        // Check if approved/permitted
        const isApprovedOrPermitted = ['dispatched', 'acknowledged', 'scheduled', 'repairing', 'repaired_audit', 'resolved'].includes(c.status) || c.emailReplyReceived;
        const approvedId = c.emailAnalysis?.extractedSender || c.reporterEmail || 'megapraveen6380@gmail.com';

        let markerHtml = '';
        if (isApprovedOrPermitted) {
          markerHtml = `
            <div class="relative flex flex-col items-center">
              <div class="absolute w-8 h-8 rounded-full bg-emerald-500/20"></div>
              <div class="w-5 h-5 rounded-full bg-emerald-600 border-2 border-white shadow-md flex items-center justify-center text-[10px] font-bold text-white">
                ✓
              </div>
              <div class="absolute top-5 bg-emerald-950 text-white font-mono text-[8px] font-bold px-1 py-0.5 rounded shadow-sm border border-emerald-500/50 whitespace-nowrap z-30">
                SC-${c.caseId.slice(-6)} [${approvedId.slice(0, 15)}...]
              </div>
            </div>
          `;
        } else {
          markerHtml = `
            <div class="relative flex flex-col items-center">
              <div class="w-3 h-3 rounded-full bg-slate-500 border border-white shadow-md"></div>
              <div class="absolute top-3 bg-slate-950 text-white font-mono text-[8px] px-1 py-0.5 rounded shadow-xs whitespace-nowrap z-20">
                SC-${c.caseId.slice(-6)}
              </div>
            </div>
          `;
        }

        const otherIcon = L.divIcon({
          html: markerHtml,
          className: '',
          iconSize: [24, 40],
          iconAnchor: [12, 12],
        });

        const m = L.marker([cLat, cLng], { icon: otherIcon })
          .addTo(map)
          .bindPopup(`<b class="font-sans text-xs text-slate-800">${c.title}</b><br/><span class="text-[10px] font-mono text-slate-400">Approved: ${approvedId}</span>`);
        leafletOtherMarkersRef.current.push(m);
      });
    }

    // Update geofence circle
    if (leafletCircleRef.current) {
      map.removeLayer(leafletCircleRef.current);
    }
    if (activeComplaint.status !== 'captured' && activeComplaint.status !== 'scanning') {
      leafletCircleRef.current = L.circle([lat, lng], {
        radius: 1000,
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.1,
        weight: 1.5,
      }).addTo(map);
    }

    // Update neighbor markers
    leafletNeighborsRef.current.forEach(m => map.removeLayer(m));
    leafletNeighborsRef.current = [];
    if (activeComplaint.status !== 'captured' && activeComplaint.status !== 'scanning') {
      virtualNeighbors.forEach((neigh, idx) => {
        const hasVerifiedSlot = idx < activeComplaint.upvotes;
        const color = hasVerifiedSlot ? '#10b981' : '#94a3b8';
        const shadow = hasVerifiedSlot ? 'rgba(16, 185, 129, 0.5)' : 'none';

        const neighborIcon = L.divIcon({
          html: `
            <div 
              style="background-color: ${color}; box-shadow: 0 0 6px ${shadow};" 
              class="w-3 h-3 rounded-full border border-white transition-all duration-300"
            ></div>
          `,
          className: '',
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });

        const m = L.marker([neigh.lat, neigh.lng], { icon: neighborIcon }).addTo(map);
        leafletNeighborsRef.current.push(m);
      });
    }

    // Update user coordinate marker
    if (leafletUserMarkerRef.current) {
      map.removeLayer(leafletUserMarkerRef.current);
    }
    if (userCoords) {
      const userIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping"></div>
            <div class="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-md flex items-center justify-center">
              <div class="w-2 h-2 rounded-full bg-white"></div>
            </div>
          </div>
        `,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      leafletUserMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon }).addTo(map);
    }

    // Update crew vehicle marker
    if (leafletCrewMarkerRef.current) {
      map.removeLayer(leafletCrewMarkerRef.current);
    }
    if (crewCoords) {
      const crewIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center bg-amber-500 border border-white shadow-md rounded-lg text-white p-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-2.18-2.725A1 1 0 0 0 16.82 9H15"/><circle cx="7.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          </div>
        `,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      leafletCrewMarkerRef.current = L.marker([crewCoords.lat, crewCoords.lng], { icon: crewIcon }).addTo(map);
    }

    // Update crew route path polyline
    if (leafletRoutePolylineRef.current) {
      map.removeLayer(leafletRoutePolylineRef.current);
    }
    if (crewRoutePath.length > 0) {
      leafletRoutePolylineRef.current = L.polyline(
        crewRoutePath.map(p => [p.lat, p.lng]),
        {
          color: '#d97706',
          weight: 4,
          opacity: 0.8,
          dashArray: '5, 10'
        }
      ).addTo(map);
    }

  }, [useLeaflet, mapCenter.lat, mapCenter.lng, lat, lng, activeComplaint.status, activeComplaint.upvotes, virtualNeighbors, userCoords, crewCoords, crewRoutePath, complaints]);

  // Handle active complaint shifts - recenter maps and generate neighbors once
  useEffect(() => {
    setMapCenter({ lat, lng });
    
    // Generate neighbor coordinate nodes if not already populated for this coordinate
    if (activeComplaint.status !== 'captured' && activeComplaint.status !== 'scanning') {
      const neighbors = generateMockNeighbors(lat, lng, activeComplaint.totalNeighbors);
      setVirtualNeighbors(neighbors);
    } else {
      setVirtualNeighbors([]);
    }
  }, [activeComplaint.id, lat, lng]);

  // Generate simulated road-bending route path from a starting point (depot) to the hazard
  const generateRoadPath = (start: { lat: number; lng: number }, end: { lat: number; lng: number }, segmentsCount = 12) => {
    const path = [];
    for (let i = 0; i <= segmentsCount; i++) {
      const fraction = i / segmentsCount;
      let curLat = start.lat + (end.lat - start.lat) * fraction;
      let curLng = start.lng + (end.lng - start.lng) * fraction;
      
      // Introduce structural bends for realistic city street-mesh routing
      if (i > 0 && i < segmentsCount) {
        const factor = Math.sin(fraction * Math.PI) * 0.0012;
        curLat += (i % 2 === 0 ? 1 : -1) * factor;
        curLng += (i % 3 === 0 ? 1 : -1) * factor;
      }
      path.push({ lat: curLat, lng: curLng });
    }
    return path;
  };

  // Municipal Rig-4A Dispatch Tracking Simulation
  useEffect(() => {
    const status = activeComplaint?.status;
    const isDispatchState = ['dispatched', 'acknowledged', 'scheduled', 'repairing'].includes(status);
    
    if (!isDispatchState) {
      setCrewCoords(null);
      setCrewStatus('idle');
      setCrewSpeed(0);
      setCrewRoutePath([]);
      setCrewProgress(0);
      return;
    }

    // Set starting municipal depot roughly 1.3 km away
    const depotLat = lat + 0.008;
    const depotLng = lng + 0.010;
    
    const routePoints = generateRoadPath({ lat: depotLat, lng: depotLng }, { lat, lng });
    setCrewRoutePath(routePoints);
    
    let pointIndex = 0;
    setCrewCoords(routePoints[0]);
    setCrewStatus('transit');
    setCrewSpeed(45);
    setCrewProgress(0);
    
    addLog('DISPATCH', `🚒 Dispatch tracking initiated for Rig-4A from Northern Municipal Depot! Route path plotted on GPS.`);

    const interval = setInterval(() => {
      if (pointIndex < routePoints.length - 1) {
        pointIndex++;
        const currentLoc = routePoints[pointIndex];
        setCrewCoords(currentLoc);
        
        const progressPct = Math.round((pointIndex / (routePoints.length - 1)) * 100);
        setCrewProgress(progressPct);

        const pointsLeft = routePoints.length - 1 - pointIndex;
        const remainingDistKm = (pointsLeft * 0.12).toFixed(2);
        setCrewDistance(`${remainingDistKm} km`);
        
        const remainingTimeSeconds = pointsLeft * 3;
        setCrewEta(`${remainingTimeSeconds} seconds`);
        setCrewSpeed(Math.round(38 + Math.random() * 14)); // Speed fluctuation

        if (pointIndex % 3 === 0) {
          addLog('DISPATCH', `🛰️ Live Vehicle GPS tracking: Rig-4A position progressing towards ${activeComplaint.locationAddress || 'the hazard location'}.`);
        }
      } else {
        // Arrived at the incident site!
        setCrewCoords(routePoints[routePoints.length - 1]);
        setCrewStatus('working');
        setCrewSpeed(0);
        setCrewDistance('0.00 km');
        setCrewEta('Arrived - In Progress');
        setCrewProgress(100);
        clearInterval(interval);
        addLog('SYSTEM', "🚨 Dispatch Alert: Municipal repair workforce has safely arrived on-site and initiated active repair protocols.");
      }
    }, 3000); // Progress update tick

    return () => clearInterval(interval);
  }, [activeComplaint?.id, activeComplaint?.status, lat, lng]);

  // Real-time user GPS tracking controls
  const handleToggleUserTracking = () => {
    if (isTrackingUser) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      addLog('SYSTEM', "❌ GPS tracking failed: Browser Geolocation not supported. Activating fallback.");
      startUserSimulation();
      return;
    }
    
    addLog('SYSTEM', "🛰️ Requesting high-accuracy real-time GPS tracking lock...");
    setIsTrackingUser(true);
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const uLat = position.coords.latitude;
        const uLng = position.coords.longitude;
        const coordsObj = { lat: uLat, lng: uLng };
        setUserCoords(coordsObj);
        setGpsAccuracy(position.coords.accuracy);
        setGpsHeading(position.coords.heading);
        setGpsSpeed(position.coords.speed);
        
        // Center on tracked user location on first initial lock
        setMapCenter(coordsObj);
        addLog('SYSTEM', `📍 Real-time GPS Track update: [${uLat.toFixed(6)}, ${uLng.toFixed(6)}] Accuracy: ±${position.coords.accuracy.toFixed(1)}m`);
      },
      (error) => {
        console.warn("GPS Watch Position Error, falling back to simulated walk path:", error);
        addLog('SYSTEM', `⚠️ Real-time GPS lock denied/unavailable. Activating high-precision sandbox walking simulator.`);
        startUserSimulation();
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const startUserSimulation = () => {
    setIsTrackingUser(true);
    let angle = 0;
    const baseLat = lat;
    const baseLng = lng;
    // Walk offset circle radius of 120m
    const latOffset = 120 / 111000;
    const lngOffset = 120 / (111000 * Math.cos(baseLat * Math.PI / 180));

    const initialCoords = {
      lat: baseLat + latOffset * Math.cos(angle),
      lng: baseLng + lngOffset * Math.sin(angle)
    };
    setUserCoords(initialCoords);
    setGpsAccuracy(7.5);
    setGpsSpeed(1.3); // standard walking pace m/s
    setGpsHeading(45);
    addLog('SYSTEM', "🛰️ High-accuracy citizen GPS simulator online. Walking circular patrol path around the hazard area.");
    
    // Pan to starting simulated coordinate
    setMapCenter(initialCoords);
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTrackingUser(false);
    setUserCoords(null);
    setGpsAccuracy(null);
    setGpsHeading(null);
    setGpsSpeed(null);
    addLog('SYSTEM', "🛑 Real-time GPS tracking suspended.");
  };

  // Clean up watchers on component unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Update simulator position tick for simulated user walk
  useEffect(() => {
    let intervalId: any = null;
    if (isTrackingUser && watchIdRef.current === null) {
      let angle = 0;
      const baseLat = lat;
      const baseLng = lng;
      const latOffset = 0.0011; // 120 meters
      const lngOffset = 0.0011 / Math.cos(baseLat * Math.PI / 180);

      intervalId = setInterval(() => {
        angle += 0.08; // speed of circling path
        const nextCoords = {
          lat: baseLat + latOffset * Math.cos(angle),
          lng: baseLng + lngOffset * Math.sin(angle)
        };
        setUserCoords(nextCoords);
        setGpsAccuracy(Math.random() * 2.5 + 4.5); // ±4-7m jitter
        setGpsSpeed(1.1 + Math.random() * 0.4);
        setGpsHeading(Math.round((angle * 180 / Math.PI + 90) % 360));
      }, 1500);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isTrackingUser, lat, lng]);

  // Center map on tracked user coordinates
  const handleCenterOnUser = () => {
    if (userCoords) {
      setMapCenter(userCoords);
      addLog('SYSTEM', `🎯 Re-centering map viewport on tracked device location: [${userCoords.lat.toFixed(5)}, ${userCoords.lng.toFixed(5)}]`);
    }
  };

  // Original auto-upvote interval logic preserved
  useEffect(() => {
    let timer: any = null;
    if (autoUpvote && activeComplaint.status === 'broadcast' && activeComplaint.upvotes < activeComplaint.requiredUpvotes) {
      timer = setInterval(() => {
        handleUpvote();
      }, 150);
    }
    return () => clearInterval(timer);
  }, [autoUpvote, activeComplaint.status, activeComplaint.upvotes, virtualNeighbors]);

  function generateMockNeighbors(centerLat: number, centerLng: number, count: number) {
    const list = [];
    const r = 1000 / 111000; // 1km converted to latitude delta
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const u = Math.random();
      const w = r * Math.sqrt(u);
      const x = w * Math.cos(theta);
      const y = w * Math.sin(theta);

      const offsetLat = x;
      const offsetLng = y / Math.cos(centerLat * Math.PI / 180);

      list.push({
        id: i,
        lat: centerLat + offsetLat,
        lng: centerLng + offsetLng,
      });
    }
    return list;
  }

  const handleUpvote = () => {
    if (activeComplaint.status !== 'broadcast') return;
    if (activeComplaint.upvotes >= activeComplaint.requiredUpvotes) {
      setAutoUpvote(false);
      return;
    }

    setComplaints(prev => prev.map(c => {
      if (c.id === activeComplaint.id) {
        const nextUpvotes = c.upvotes + 1;
        addLog('VERIFY', `Local Resident #${c.upvotes + 1} living near ${c.locationAddress || 'the hazard location'} audited & upvoted file.`);

        if (nextUpvotes >= c.requiredUpvotes) {
          addLog('AI', `System reached target quorum consensus (${c.requiredUpvotes}/${c.requiredUpvotes}). Issue verified by local citizens!`);
          setTimeout(() => {
            onVerificationComplete();
          }, 200);
          return { ...c, upvotes: nextUpvotes, status: 'verified' as const };
        }
        return { ...c, upvotes: nextUpvotes };
      }
      return c;
    }));
  };

  const isBroadcastState = activeComplaint.status === 'broadcast';

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex flex-col gap-5" id="panel-map">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-emerald-500" />
            Real-Time GPS Tracking Map
          </h2>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5 font-mono uppercase tracking-wider">
            {useLeaflet ? '🗺️ ENGINE: Leaflet OpenStreetMap (Resilient Offline Fallback)' : '🛰️ ENGINE: Google Maps Real-time GPS Track'}
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold font-display flex items-center gap-1.5 ${
          isBroadcastState ? 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse' :
          activeComplaint.status === 'captured' || activeComplaint.status === 'scanning' ? 'bg-slate-50 text-slate-400 border border-slate-100' :
          'bg-emerald-50 text-emerald-600 border border-emerald-100'
        }`}>
          {isBroadcastState && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />}
          {isBroadcastState ? 'Broadcast Active' :
           activeComplaint.status === 'captured' || activeComplaint.status === 'scanning' ? 'Awaiting Broadcast' : 'Consensus Verified'}
        </span>
      </div>

      {/* Map and Sidebar Registry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 relative h-96 rounded-xl overflow-hidden border border-slate-200">
          {useLeaflet ? (
            <div ref={leafletContainerRef} className="w-full h-full bg-slate-100 z-0"></div>
          ) : (
            <APIProvider apiKey={API_KEY} version="weekly">
              <Map
                center={mapCenter}
                defaultZoom={15}
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                style={{ width: '100%', height: '100%' }}
                disableDefaultUI={false}
              >
                {/* Map Recenter Side-effect */}
                <MapRecenter center={mapCenter} />

                {/* 1km Geofence Ring */}
                {activeComplaint.status !== 'captured' && activeComplaint.status !== 'scanning' && (
                  <MapCircle 
                    center={{ lat, lng }} 
                    radius={1000} 
                  />
                )}

                {/* Main Complaint Hazard Marker */}
                <AdvancedMarker
                  position={{ lat, lng }}
                  title={activeComplaint.title}
                >
                  <Pin
                    background="#ef4444"
                    borderColor="#ffffff"
                    glyphColor="#ffffff"
                    glyph="!"
                    scale={1.1}
                  />
                </AdvancedMarker>

                {/* Other Complaints Markers with Approved/Permitted highlights */}
                {complaints && complaints.map(c => {
                  if (c.id === activeComplaint.id) return null;
                  const cLat = c.coordinates?.lat;
                  const cLng = c.coordinates?.lng;
                  if (!cLat || !cLng) return null;

                  const isApprovedOrPermitted = ['dispatched', 'acknowledged', 'scheduled', 'repairing', 'repaired_audit', 'resolved'].includes(c.status) || c.emailReplyReceived;
                  const approvedId = c.emailAnalysis?.extractedSender || c.reporterEmail || 'megapraveen6380@gmail.com';

                  return (
                    <AdvancedMarker
                      key={`other-${c.id}`}
                      position={{ lat: cLat, lng: cLng }}
                      title={c.title}
                    >
                      {isApprovedOrPermitted ? (
                        <div className="relative flex flex-col items-center">
                          <Pin
                            background="#10b981"
                            borderColor="#ffffff"
                            glyphColor="#ffffff"
                            glyph="✓"
                            scale={0.9}
                          />
                          <div className="absolute top-10 bg-emerald-950 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md border border-emerald-500/50 whitespace-nowrap z-30 flex flex-col items-center">
                            <span>SC-${c.caseId.slice(-6)}</span>
                            <span className="text-[7px] text-emerald-300 font-medium">{approvedId.slice(0, 15)}...</span>
                          </div>
                        </div>
                      ) : (
                        <div className="relative flex flex-col items-center">
                          <Pin
                            background="#94a3b8"
                            borderColor="#ffffff"
                            glyphColor="#ffffff"
                            scale={0.7}
                          />
                          <div className="absolute top-7 bg-slate-900 text-white font-mono text-[8px] px-1 py-0.5 rounded shadow-xs whitespace-nowrap z-20">
                            SC-${c.caseId.slice(-6)}
                          </div>
                        </div>
                      )}
                    </AdvancedMarker>
                  );
                })}

                {/* Local Neighbor Nodes Markers (Co-verification) */}
                {virtualNeighbors.map((neigh, idx) => {
                  const hasVerifiedSlot = idx < activeComplaint.upvotes;
                  const pinBg = hasVerifiedSlot ? '#10b981' : '#94a3b8';
                  const pinGlyph = hasVerifiedSlot ? '✓' : '';
                  
                  return (
                    <AdvancedMarker
                      key={`neigh-${neigh.id}`}
                      position={{ lat: neigh.lat, lng: neigh.lng }}
                      title={`Neighbor #${neigh.id + 1}`}
                    >
                      <Pin
                        background={pinBg}
                        borderColor="#ffffff"
                        glyphColor="#ffffff"
                        glyph={pinGlyph}
                        scale={0.7}
                      />
                    </AdvancedMarker>
                  );
                })}

                {/* User Real-time GPS Location Marker (CF3 Sized) */}
                {userCoords && (
                  <AdvancedMarker
                    position={userCoords}
                    title="My Live Position"
                  >
                    <div style={{ width: '32px', height: '32px' }} className="relative flex items-center justify-center">
                      <div className="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping"></div>
                      <div className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-md flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      </div>
                    </div>
                  </AdvancedMarker>
                )}

                {/* Municipal Repair Crew Rig-4A GPS Marker (CF3 Sized) */}
                {crewCoords && (
                  <AdvancedMarker
                    position={crewCoords}
                    title={`Rig-4A: ${crewStatus.toUpperCase()}`}
                  >
                    <div style={{ width: '36px', height: '36px' }} className="relative flex items-center justify-center bg-amber-500 border-2 border-white shadow-md rounded-xl text-white transform -translate-y-1 transition-all duration-300">
                      <Truck className="w-5 h-5" />
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full animate-ping"></div>
                    </div>
                  </AdvancedMarker>
                )}

                {/* Simulated route path drawn on maps */}
                {crewRoutePath.length > 0 && (
                  <MapPolyline path={crewRoutePath} />
                )}
              </Map>
            </APIProvider>
          )}

          {/* Backdrop if complaint is completely raw */}
          {(!isBroadcastState && activeComplaint.status !== 'verified' && activeComplaint.status !== 'email_draft' && activeComplaint.status !== 'dispatched' && activeComplaint.status !== 'resolved' && activeComplaint.status !== 'acknowledged' && activeComplaint.status !== 'scheduled' && activeComplaint.status !== 'repairing' && activeComplaint.status !== 'repaired_audit') && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-6 text-center z-10">
              <div className="bg-white rounded-xl p-5 max-w-sm border border-slate-100 shadow-lg">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2 animate-bounce" />
                <h3 className="font-bold text-slate-800 text-sm font-display">Awaiting AI Submission Scan</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Please submit the complaint via the Citizen Portal first. Once AI registers the coordinates, the fanning-out map will activate!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Approved & Permitted Active Registry List */}
        <div className="lg:col-span-4 border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col gap-3 h-96 overflow-y-auto">
          <div className="pb-2 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-display flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                Permits & Approved IDs
              </h3>
              <p className="text-[9px] text-slate-400 font-medium font-mono">ACTIVE MUNICIPAL VERIFICATIONS</p>
            </div>
            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-md font-mono">
              {(complaints || []).filter(c => ['dispatched', 'acknowledged', 'scheduled', 'repairing', 'repaired_audit', 'resolved'].includes(c.status) || c.emailReplyReceived).length} Total
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {(complaints || []).filter(c => ['dispatched', 'acknowledged', 'scheduled', 'repairing', 'repaired_audit', 'resolved'].includes(c.status) || c.emailReplyReceived).length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs flex flex-col gap-1 items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-slate-300" />
                <span>No active permits registered.</span>
              </div>
            ) : (
              (complaints || [])
                .filter(c => ['dispatched', 'acknowledged', 'scheduled', 'repairing', 'repaired_audit', 'resolved'].includes(c.status) || c.emailReplyReceived)
                .map(c => {
                  const approvedId = c.emailAnalysis?.extractedSender || c.reporterEmail || 'megapraveen6380@gmail.com';
                  const isActive = activeComplaint.id === c.id;

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setMapCenter({ lat: c.coordinates.lat, lng: c.coordinates.lng });
                        addLog('SYSTEM', `🎯 Viewpoint Shift: Focused map on Case SC-${c.caseId.slice(-6)} under Permit ID [${approvedId}].`);
                      }}
                      className={`p-2.5 border rounded-lg cursor-pointer transition-all duration-200 text-left ${
                        isActive
                          ? 'bg-emerald-50 border-emerald-300 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-100/50 px-1.5 py-0.5 rounded border border-emerald-200/50">
                          SC-${c.caseId.slice(-6)}
                        </span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                          c.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                          c.status === 'repairing' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        } uppercase tracking-wider font-mono`}>
                          {c.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-700 mt-1.5 truncate leading-tight">{c.title}</h4>
                      <div className="flex flex-col gap-0.5 mt-2 text-[10px] text-slate-500 font-mono">
                        <span className="truncate">Approved ID: <strong className="text-slate-800 font-semibold" title={approvedId}>{approvedId}</strong></span>
                        <span className="truncate">Locality: {c.locationAddress || `${c.coordinates.lat.toFixed(4)}, ${c.coordinates.lng.toFixed(4)}`}</span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* Real-time GPS Telemetry Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Citizen Live GPS Lock */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 font-display">
                <Navigation className="w-3.5 h-3.5 text-blue-500 rotate-45" />
                Citizen GPS Tracking
              </h3>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono tracking-wide ${
                isTrackingUser ? 'bg-blue-100 text-blue-700 animate-pulse' : 'bg-slate-200 text-slate-500'
              }`}>
                {isTrackingUser ? 'LIVE_TRACK' : 'STANDBY'}
              </span>
            </div>

            {/* GPS Telemetry Readout */}
            <div className="mt-3 space-y-1 text-[11px] font-mono text-slate-600">
              <div className="flex flex-col gap-0.5 pb-1 border-b border-dashed border-slate-200">
                <span className="text-[10px] text-slate-400">Position Address:</span>
                <span className="font-semibold text-slate-800 break-words leading-tight" title={userTextLocation || (userCoords ? `${userCoords.lat.toFixed(6)}, ${userCoords.lng.toFixed(6)}` : '--')}>
                  {userTextLocation || (userCoords ? getHumanFallbackAddress(userCoords.lat, userCoords.lng) : 'Awaiting GPS lock...')}
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span>Accuracy:</span>
                <span className="font-semibold text-slate-800">
                  {gpsAccuracy ? `±${gpsAccuracy.toFixed(1)}m` : '--'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Speed:</span>
                <span className="font-semibold text-slate-800">
                  {gpsSpeed ? `${(gpsSpeed * 3.6).toFixed(1)} km/h` : '0.0 km/h'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 flex gap-2">
            <button
              onClick={handleToggleUserTracking}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer ${
                isTrackingUser 
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              {isTrackingUser ? 'Disconnect' : 'Connect GPS'}
            </button>
            {userCoords && (
              <button
                onClick={handleCenterOnUser}
                className="px-2 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                title="Recenter Map on Me"
              >
                🎯
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Crew Dispatch Monitor (Real-time moving vehicle) */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 font-display">
                <Truck className="w-3.5 h-3.5 text-amber-500" />
                Rig-4A Crew GPS
              </h3>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono tracking-wide ${
                crewStatus === 'transit' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                crewStatus === 'working' ? 'bg-emerald-100 text-emerald-700' :
                'bg-slate-200 text-slate-500'
              }`}>
                {crewStatus.toUpperCase()}
              </span>
            </div>

            {/* Dispatch Telemetry Readout */}
            <div className="mt-3 space-y-1 text-[11px] font-mono text-slate-600">
              <div className="flex justify-between">
                <span>Truck Speed:</span>
                <span className="font-semibold text-slate-800">{crewSpeed} km/h</span>
              </div>
              <div className="flex justify-between">
                <span>Distance Left:</span>
                <span className="font-semibold text-slate-800">{crewDistance || '--'}</span>
              </div>
              <div className="flex justify-between">
                <span>Est. ETA:</span>
                <span className="font-semibold text-slate-800">{crewEta || '--'}</span>
              </div>
              <div className="flex justify-between">
                <span>Crew Location:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[150px]" title={crewCoords ? getHumanFallbackAddress(crewCoords.lat, crewCoords.lng) : ''}>
                  {crewCoords ? getHumanFallbackAddress(crewCoords.lat, crewCoords.lng) : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* Transit progress bar */}
          <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col gap-1.5">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              <span>Transit Progress</span>
              <span>{crewProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div 
                style={{ width: `${crewProgress}%` }} 
                className="h-full bg-amber-500 transition-all duration-300 rounded-full"
              ></div>
            </div>
          </div>
        </div>

        {/* Card 3: 1km Consensus Metrics */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 font-display">
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                Community Consensus
              </h3>
              <span className="text-[10px] font-bold font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/30">
                1.0 km RADIUS
              </span>
            </div>

            {/* Original game simulation controls and stats */}
            <div className="mt-3 space-y-1 text-[11px] font-mono text-slate-600">
              <div className="flex justify-between">
                <span>Residents Tagged:</span>
                <span className="font-semibold text-slate-800">
                  {activeComplaint.status !== 'captured' && activeComplaint.status !== 'scanning' ? activeComplaint.totalNeighbors : 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Consensus Votes:</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  {activeComplaint.upvotes} / {activeComplaint.requiredUpvotes}
                  {activeComplaint.upvotes >= activeComplaint.requiredUpvotes && (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 inline" />
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1.5 pt-2 select-none">
                <input 
                  type="checkbox" 
                  id="auto-up-check"
                  checked={autoUpvote}
                  onChange={(e) => setAutoUpvote(e.target.checked)}
                  className="w-3.5 h-3.5 text-emerald-600 border-slate-300 rounded-md focus:ring-emerald-500 cursor-pointer"
                  disabled={!isBroadcastState}
                />
                <label htmlFor="auto-up-check" className="text-[10px] font-semibold text-slate-500 cursor-pointer">
                  Auto-upvoting loop
                </label>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200">
            <button 
              type="button"
              onClick={handleUpvote}
              disabled={!isBroadcastState}
              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 text-white disabled:text-slate-400 font-bold text-xs rounded-lg flex items-center justify-center gap-1 border border-emerald-500/10 shadow-sm transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              Simulate Upvote (+1)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
