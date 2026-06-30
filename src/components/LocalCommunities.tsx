import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, 
  MessageSquare, 
  Plus, 
  MapPin, 
  ThumbsUp, 
  Send, 
  Check, 
  Heart, 
  Shield, 
  Compass, 
  Search, 
  ArrowLeft, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Info,
  ChevronLeft
} from 'lucide-react';
import { CommunityThread, Department } from '../types';
import { getHumanFallbackAddress } from '../utils/locationutils';

interface LocalCommunitiesProps {
  communities: CommunityThread[];
  setCommunities: React.Dispatch<React.SetStateAction<CommunityThread[]>>;
  departments: Department[];
  userCoordinates?: { lat: number; lng: number };
  addLog: (type: any, text: string) => Promise<void>;
}

export const LocalCommunities: React.FC<LocalCommunitiesProps> = ({
  communities,
  setCommunities,
  departments,
  userCoordinates = { lat: 12.9716, lng: 80.2425 },
  addLog,
}) => {
  const [selectedId, setSelectedId] = useState<string>(communities[0]?.id || '');
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  
  // Create New Community Form States
  const [newCommName, setNewCommName] = useState('');
  const [newCommDesc, setNewCommDesc] = useState('');
  const [newCommRadius, setNewCommRadius] = useState(1.0);
  const [newCommCategory, setNewCommCategory] = useState('Municipal Geo-Forums');

  // New Message States
  const [newMessageText, setNewMessageText] = useState('');
  const [attachFeedback, setAttachFeedback] = useState(false);
  const [selectedDept, setSelectedDept] = useState(departments[0]?.name || '');
  const [opinionRating, setOpinionRating] = useState('Highly cooperative!');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const activeCommunity = communities.find(c => c.id === selectedId);

  // Auto-scroll to the bottom when messages change or community is selected
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeCommunity?.messages, selectedId]);

  // Sync selected ID if active community becomes empty but list is loaded
  useEffect(() => {
    if (!selectedId && communities.length > 0) {
      setSelectedId(communities[0].id);
    }
  }, [communities, selectedId]);

  // Helper to calculate distance in kilometers
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const dLat = lat1 - lat2;
    const dLng = lng1 - lng2;
    return parseFloat((Math.sqrt(dLat * dLat + dLng * dLng) * 111).toFixed(2));
  };

  const handleJoinLeave = async (commId: string) => {
    try {
      const res = await fetch(`/api/communities/${commId}/join`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setCommunities(prev => prev.map(c => {
          if (c.id === commId) {
            const isJoining = !c.isJoined;
            addLog(
              'SYSTEM', 
              isJoining 
                ? `📍 JOINED COMMUNITY: You successfully subscribed to the '${c.name}' geo-channel.`
                : `📍 LEFT COMMUNITY: Unsubscribed from '${c.name}' discussion updates.`
            );
            return {
              ...c,
              isJoined: isJoining,
              memberCount: isJoining ? c.memberCount + 1 : c.memberCount - 1
            };
          }
          return c;
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommName.trim() || !newCommDesc.trim()) return;

    try {
      const res = await fetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCommName,
          description: newCommDesc,
          radius: newCommRadius,
          category: newCommCategory,
          lat: userCoordinates.lat,
          lng: userCoordinates.lng,
          creatorName: "You (Citizen Sentinel)"
        })
      });
      const newComm = await res.json();
      setCommunities(prev => [...prev, newComm]);
      setSelectedId(newComm.id);
      setIsCreating(false);
      setNewCommName('');
      setNewCommDesc('');
      setNewCommRadius(1.0);
      setNewCommCategory('Municipal Geo-Forums');
      setMobileView('chat');
      addLog('SYSTEM', `✨ NEW REGIONAL GROUP CREATED: '${newComm.name}' has been geo-fenced around '${getHumanFallbackAddress(userCoordinates.lat, userCoordinates.lng)}' with a ${newComm.radius}km boundary.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeCommunity) return;

    const payload: any = {
      senderName: "You (Citizen Sentinel)",
      senderRole: "Lead Commissioner",
      text: newMessageText,
    };

    if (attachFeedback) {
      payload.departmentFeedback = {
        deptName: selectedDept,
        opinion: opinionRating
      };
    }

    try {
      const res = await fetch(`/api/communities/${activeCommunity.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const updatedMessages = await res.json();

      setCommunities(prev => prev.map(c => {
        if (c.id === activeCommunity.id) {
          return { ...c, messages: updatedMessages };
        }
        return c;
      }));

      setNewMessageText('');
      setAttachFeedback(false);
      addLog('AI', `💬 Message broadcasted successfully on '${activeCommunity.name}' geo-board. Nearby neighbors received live notifications.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLikeMessage = async (msgId: string) => {
    if (!activeCommunity) return;
    try {
      const res = await fetch(`/api/communities/${activeCommunity.id}/messages/${msgId}/like`, {
        method: 'POST'
      });
      const updatedMessages = await res.json();
      setCommunities(prev => prev.map(c => {
        if (c.id === activeCommunity.id) {
          return { ...c, messages: updatedMessages };
        }
        return c;
      }));
    } catch (err) {
      console.error(err);
    }
  };

  // Filter communities by search term
  const filteredCommunities = communities.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = ["Municipal Geo-Forums", "Neighborhood Social Hubs", "Eco & Green Initiatives"];

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex h-[760px] md:h-[820px] lg:h-[calc(100vh-220px)] min-h-[640px] md:min-h-[720px] w-full" id="communities-wrapper">
      
      {/* SIDEBAR - CHAT LISTINGS (Hidden on mobile if looking at a chat thread) */}
      <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col border-r border-slate-150 bg-slate-50/40 ${
        mobileView === 'chat' ? 'hidden md:flex' : 'flex'
      }`}>
        
        {/* Sidebar Header */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] font-extrabold tracking-widest uppercase text-emerald-600 font-mono">Geo-Fence Hub</span>
              <h3 className="text-lg font-black text-slate-850 font-display flex items-center gap-1.5 leading-tight">
                <Users className="w-5 h-5 text-emerald-600" />
                Live Chat Hub
              </h3>
            </div>
            
            {!isCreating && (
              <button
                onClick={() => setIsCreating(true)}
                className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="Start New Geo-Chat"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New</span>
              </button>
            )}
          </div>

          {/* Search bar (only visible if not creating a group) */}
          {!isCreating && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input 
                type="text"
                placeholder="Search local channels..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.8 text-xs bg-slate-100 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium placeholder:text-slate-450"
              />
            </div>
          )}
        </div>

        {/* Dynamic Sidebar Body: Create Form OR Chat Lists */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isCreating ? (
            <form onSubmit={handleCreateCommunity} className="p-4 flex flex-col gap-3.5 animate-in slide-in-from-left duration-200">
              <div className="flex items-center gap-2 mb-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider font-display">Create New Group</span>
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Group Name</label>
                <input
                  type="text"
                  required
                  value={newCommName}
                  onChange={(e) => setNewCommName(e.target.value)}
                  placeholder="e.g. Sector 12 Waste Response"
                  className="px-2.5 py-1.8 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Coverage Area (Radius)</label>
                <select
                  value={newCommRadius}
                  onChange={(e) => setNewCommRadius(parseFloat(e.target.value))}
                  className="px-2.5 py-1.8 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                >
                  <option value={0.5}>0.5 km (Immediate Streets)</option>
                  <option value={1.0}>1.0 km (Sector Block)</option>
                  <option value={2.0}>2.0 km (Neighborhood Ward)</option>
                  <option value={5.0}>5.0 km (Constituency Zone)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Forum Topic Category</label>
                <select
                  value={newCommCategory}
                  onChange={(e) => setNewCommCategory(e.target.value)}
                  className="px-2.5 py-1.8 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                >
                  <option value="Municipal Geo-Forums">📢 Municipal Geo-Forums</option>
                  <option value="Neighborhood Social Hubs">🏡 Neighborhood Social Hubs</option>
                  <option value="Eco & Green Initiatives">🌿 Eco & Green Initiatives</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Mission / Description</label>
                <textarea
                  required
                  value={newCommDesc}
                  onChange={(e) => setNewCommDesc(e.target.value)}
                  placeholder="Focusing on regional community coordination, reporting leaks, delays, and green setups..."
                  rows={3}
                  className="px-2.5 py-1.8 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-medium resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer text-center"
              >
                Launch Geo-Fence Channel
              </button>
            </form>
          ) : (
            <div className="p-3 flex flex-col gap-4">
              {filteredCommunities.length === 0 ? (
                <div className="text-center py-12 px-4 flex flex-col items-center gap-2">
                  <Compass className="w-8 h-8 text-slate-300 animate-spin-slow" />
                  <p className="text-xs font-bold text-slate-500">No matching channels found</p>
                  <p className="text-[10px] text-slate-400">Clear search or create a new group nearby.</p>
                </div>
              ) : (
                categories.map((catName) => {
                  const catCommunities = filteredCommunities.filter(c => (c.category || "Municipal Geo-Forums") === catName);
                  if (catCommunities.length === 0) return null;

                  return (
                    <div key={catName} className="flex flex-col gap-1.5">
                      {/* Category Label Section */}
                      <div className="flex items-center gap-1.5 px-1.5 py-0.5 select-none sticky top-0 bg-slate-50/80 backdrop-blur-xs z-10">
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-450 font-mono">
                          {catName === "Municipal Geo-Forums" ? "📢 " : catName === "Neighborhood Social Hubs" ? "🏡 " : "🌿 "}
                          {catName}
                        </span>
                        <div className="h-[1px] bg-slate-200/50 flex-grow"></div>
                        <span className="text-[8px] font-black text-slate-450 px-1 rounded bg-slate-200/40">
                          {catCommunities.length}
                        </span>
                      </div>

                      {/* Chat Rows */}
                      <div className="flex flex-col gap-1 pl-1 border-l border-slate-200/60 ml-1">
                        {catCommunities.map((comm) => {
                          const distance = calculateDistance(userCoordinates.lat, userCoordinates.lng, comm.lat, comm.lng);
                          const isSelected = comm.id === selectedId;
                          const lastMsg = comm.messages[comm.messages.length - 1];

                          return (
                            <div
                              key={comm.id}
                              onClick={() => {
                                setSelectedId(comm.id);
                                setMobileView('chat');
                              }}
                              className={`p-2.5 rounded-xl flex items-start gap-2.5 transition cursor-pointer select-none border border-transparent ${
                                isSelected
                                  ? 'bg-white border-slate-200 shadow-3xs ring-1 ring-emerald-500/10'
                                  : 'hover:bg-white/80'
                              }`}
                            >
                              {/* Avatar Block */}
                              <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-sm font-bold relative ${
                                isSelected 
                                  ? 'bg-emerald-600 text-white shadow-xs' 
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {catName === "Municipal Geo-Forums" ? "📢" : catName === "Neighborhood Social Hubs" ? "🏡" : "🌿"}
                                {comm.isJoined && (
                                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 rounded-full border-2 border-white"></span>
                                )}
                              </div>

                              {/* Text Block */}
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline">
                                  <span className={`text-[11px] font-black truncate font-display ${
                                    isSelected ? 'text-emerald-700' : 'text-slate-750'
                                  }`}>
                                    {comm.name}
                                  </span>
                                  <span className="text-[8px] font-bold text-slate-400 shrink-0 ml-1">
                                    {distance} km
                                  </span>
                                </div>
                                
                                <p className="text-[10px] text-slate-500 truncate leading-snug mt-0.5">
                                  {lastMsg ? (
                                    <span>
                                      <strong className="font-semibold text-slate-650">{lastMsg.senderName.split(' ')[0]}: </strong>
                                      {lastMsg.text}
                                    </span>
                                  ) : (
                                    comm.description
                                  )}
                                </p>

                                <div className="flex items-center gap-1.5 mt-1 text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                                  <span>👥 {comm.memberCount} Members</span>
                                  <span>•</span>
                                  <span>📍 {comm.radius}km coverage</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANE - CHAT WORKSPACE (Full width on mobile if looking at a thread) */}
      <div className={`flex-1 flex flex-col bg-slate-50/30 relative h-full ${
        mobileView === 'list' ? 'hidden md:flex' : 'flex'
      }`}>
        {activeCommunity ? (
          <>
            {/* WhatsApp Styled Chat Header */}
            <div className="p-4 bg-white border-b border-slate-150 flex justify-between items-center z-10 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {/* Back button visible only on mobile */}
                <button
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-1.5 -ml-1 text-slate-500 hover:bg-slate-100 rounded-lg transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg font-black shrink-0 shadow-3xs">
                  {activeCommunity.category === "Municipal Geo-Forums" ? "📢" : activeCommunity.category === "Neighborhood Social Hubs" ? "🏡" : "🌿"}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-850 font-display truncate">
                      {activeCommunity.name}
                    </h3>
                    <span className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200/50 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                      {activeCommunity.category || "Municipal Geo-Forums"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-450 line-clamp-1 mt-0.5">
                    📍 {activeCommunity.description}
                  </p>
                </div>
              </div>

              {/* Join Channel Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleJoinLeave(activeCommunity.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer select-none border shadow-3xs flex items-center gap-1 ${
                    activeCommunity.isJoined
                      ? 'bg-slate-50 border-slate-250 text-slate-650 hover:bg-slate-100'
                      : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-700'
                  }`}
                >
                  {activeCommunity.isJoined ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Joined
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Join Chat
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Scrollable Chat Bubbles Container */}
            <div 
              className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 min-h-0 bg-[#f7f9fa] relative"
              style={{
                backgroundImage: 'radial-gradient(#e2e8f0 1.2px, transparent 1.2px)',
                backgroundSize: '20px 20px',
              }}
              id="community-chat-messages"
            >
              {activeCommunity.messages.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-full gap-2 p-6 text-center max-w-sm mx-auto select-none mt-20">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-1 border border-emerald-100">
                    <MessageSquare className="w-6 h-6 text-emerald-600 animate-pulse" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Silence is beautiful, but feedback is better!</p>
                  <p className="text-[10px] text-slate-400">Be the first to post a municipal report or community coordinate concern.</p>
                </div>
              ) : (
                activeCommunity.messages.map((msg) => {
                  const isMe = msg.senderName.includes('You');
                  
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col w-full max-w-[85%] md:max-w-[70%] animate-in fade-in-50 duration-150 ${
                        isMe ? 'ml-auto items-end' : 'mr-auto items-start'
                      }`}
                    >
                      {/* Message Bubble */}
                      <div className={`p-3.5 shadow-4xs border relative ${
                        isMe 
                          ? 'bg-emerald-600 text-white border-emerald-600 rounded-2xl rounded-tr-none' 
                          : 'bg-white text-slate-800 border-slate-150 rounded-2xl rounded-tl-none'
                      }`}>
                        
                        {/* Sender Info (Only if not me) */}
                        {!isMe && (
                          <div className="flex items-center gap-1.5 mb-1 select-none">
                            <span className="font-extrabold text-[10px] text-emerald-700 font-display">
                              {msg.senderName}
                            </span>
                            <span className="px-1 py-0.1 rounded bg-slate-100 text-[7px] font-black text-slate-500 uppercase tracking-widest border border-slate-200/50">
                              {msg.senderRole}
                            </span>
                          </div>
                        )}

                        {/* Message Text */}
                        <p className="text-xs leading-relaxed font-medium break-words">
                          {msg.text}
                        </p>

                        {/* Interactive Department Opinion Tag embedded inside Bubble */}
                        {msg.departmentFeedback && (
                          <div className={`mt-2.5 p-2 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 shadow-5xs ${
                            isMe 
                              ? 'bg-emerald-700/60 border-emerald-600 text-emerald-100' 
                              : 'bg-slate-50 border-slate-100 text-slate-700'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <Shield className={`w-3 h-3 shrink-0 ${isMe ? 'text-emerald-300' : 'text-indigo-500'}`} />
                              <span className="text-[9px] font-bold">
                                Dept: <strong className={isMe ? 'text-white' : 'text-slate-850'}>{msg.departmentFeedback.deptName}</strong>
                              </span>
                            </div>
                            <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase tracking-wider border shrink-0 ${
                              isMe 
                                ? 'bg-emerald-800/40 text-emerald-200 border-emerald-600/50'
                                : 'bg-white text-emerald-700 border-emerald-200/50'
                            }`}>
                              📢 {msg.departmentFeedback.opinion}
                            </span>
                          </div>
                        )}

                        {/* Meta: Timestamp + Helpful Upvotes */}
                        <div className={`flex justify-between items-center gap-4 mt-2 pt-1 border-t text-[8px] font-bold ${
                          isMe 
                            ? 'border-emerald-500 text-emerald-200' 
                            : 'border-slate-50 text-slate-400'
                        }`}>
                          <span>{msg.timestamp}</span>

                          {/* Helpfulness Button */}
                          <button
                            onClick={() => handleLikeMessage(msg.id)}
                            className={`flex items-center gap-1 transition-all cursor-pointer ${
                              isMe 
                                ? 'hover:text-white' 
                                : 'hover:text-emerald-600 text-slate-450'
                            }`}
                          >
                            <ThumbsUp className="w-2.5 h-2.5" />
                            Helpful ({msg.likes})
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Sticky Bottom Post message area */}
            <div className="p-3.5 bg-white border-t border-slate-150 shrink-0">
              {activeCommunity.isJoined ? (
                <form onSubmit={handleSendMessage} className="flex flex-col gap-2.5 max-w-5xl mx-auto">
                  
                  {/* Inline Tag Review Selector Sheet (Closes nicely) */}
                  {attachFeedback && (
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in slide-in-from-bottom-2 duration-150">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-slate-450 uppercase font-mono">📢 Target Public Office</label>
                        <select
                          value={selectedDept}
                          onChange={(e) => setSelectedDept(e.target.value)}
                          className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-700"
                        >
                          {departments.map(d => (
                            <option key={d.name} value={d.name}>{d.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-slate-450 uppercase font-mono">📝 Performance Assessment</label>
                        <select
                          value={opinionRating}
                          onChange={(e) => setOpinionRating(e.target.value)}
                          className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-700"
                        >
                          <option value="Highly cooperative!">Highly cooperative! (Excellent service)</option>
                          <option value="Quick field dispatch!">Quick field dispatch! (Fast resolution)</option>
                          <option value="Needs faster response">Needs faster response (Slow response time)</option>
                          <option value="Poor communication / Delayed">Poor communication / Delayed (No updates)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Input Row */}
                  <div className="flex gap-2.5 items-center">
                    {/* Attach Review Button */}
                    <button
                      type="button"
                      onClick={() => setAttachFeedback(!attachFeedback)}
                      className={`p-2 rounded-xl transition cursor-pointer shrink-0 flex items-center justify-center ${
                        attachFeedback 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                      }`}
                      title="Tag Department Review"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    {/* Chat Text area */}
                    <input
                      type="text"
                      required
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      placeholder={
                        attachFeedback 
                          ? `Reviewing office '${selectedDept}'... enter comments here`
                          : `Type message in #${activeCommunity.name}...`
                      }
                      className="flex-grow px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-medium text-slate-700 placeholder:text-slate-400 bg-slate-50/50"
                    />

                    {/* Send Button */}
                    <button
                      type="submit"
                      className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition shrink-0 flex items-center justify-center cursor-pointer shadow-sm hover:shadow-md"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center bg-slate-50 border border-slate-150/60 rounded-xl p-3 max-w-xl mx-auto">
                  <p className="text-xs text-slate-500 font-medium">
                    🔏 You must <strong className="text-emerald-700">Join</strong> this geo-fence group above before typing a concern or reviewing public departments.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Empty Chat Area State */
          <div className="flex-1 flex flex-col justify-center items-center p-8 text-center bg-[#f7f9fa] select-none">
            <div className="max-w-sm flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 flex items-center justify-center border border-emerald-100 shadow-3xs mb-2">
                <Users className="w-8 h-8 text-emerald-600 animate-pulse" />
              </div>
              <h4 className="text-base font-black text-slate-800 font-display">Keep Citizens Connected</h4>
              <p className="text-xs text-slate-450 leading-relaxed">
                Select a local block forum or municipal geo-fence thread from the left list to view live chats, review neighborhood departments, or share local issues.
              </p>
              <div className="mt-4 px-3 py-1.5 rounded-full bg-emerald-50/50 border border-emerald-100 text-[10px] font-bold text-emerald-700 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Active Area: {getHumanFallbackAddress(userCoordinates.lat, userCoordinates.lng)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
