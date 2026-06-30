import React, { useState } from 'react';
import { Department, CitizenBadge, Complaint } from '../types';
import { Trophy, Star, Award, Shield, User, Zap, Calendar, TrendingUp, DollarSign, Briefcase, FileText, CheckCircle2 } from 'lucide-react';

interface GamificationCenterProps {
  citizenXP: number;
  citizenRank: string;
  unlockedBadgeIds: string[];
  departments: Department[];
  complaints: Complaint[];
}

const CITIZEN_BADGE_PRESETS: CitizenBadge[] = [
  {
    id: "sentinel",
    name: "Sentinel Badge",
    description: "Granted for auditing and verifying local complaints in your neighborhood.",
    icon: "Shield",
    color: "#3b82f6", // Indigo/Blue
    unlocked: false
  },
  {
    id: "guardian",
    name: "Community Guardian",
    description: "Granted for creating and registering an active regional problem report.",
    icon: "Award",
    color: "#a855f7", // Purple
    unlocked: false
  },
  {
    id: "voice",
    name: "Civic Voice",
    description: "Awarded for participating in resolution feedback audit check loops.",
    icon: "Trophy",
    color: "#f59e0b", // Amber/Gold
    unlocked: false
  }
];

// Baseline historical statistics to simulate realistic community datasets
const DEPARTMENT_HISTORICAL_BASELINE: Record<string, {
  weekly: { filed: number; completed: number; spent: number };
  yearly: { filed: number; completed: number; spent: number };
  sampleWorks: Array<{ title: string; cost: number; materials: number; labor: number; status: string }>;
}> = {
  "Municipal Administration and Water Supply Department": {
    weekly: { filed: 42, completed: 38, spent: 215000 },
    yearly: { filed: 1120, completed: 1040, spent: 8450000 },
    sampleWorks: [
      { title: "Secondary Waste Dump Desanding & Clearance", cost: 18200, materials: 10000, labor: 8200, status: "Audited & Cleared" },
      { title: "Organic Bio-Composter Bin Installation", cost: 32000, materials: 22000, labor: 10000, status: "Audited & Cleared" }
    ]
  },
  "Highways and Minor Ports Department": {
    weekly: { filed: 18, completed: 14, spent: 354000 },
    yearly: { filed: 480, completed: 445, spent: 12840000 },
    sampleWorks: [
      { title: "Structural Pothole Patching on GST Road", cost: 24500, materials: 14000, labor: 10500, status: "Audited & Cleared" },
      { title: "Asphalt Cracks Reconstruction in Guindy", cost: 48000, materials: 30000, labor: 18000, status: "Audited & Cleared" }
    ]
  },
  "Energy Department": {
    weekly: { filed: 15, completed: 13, spent: 142000 },
    yearly: { filed: 390, completed: 365, spent: 4890000 },
    sampleWorks: [
      { title: "Transformer Oil Replacement & Grid Calibration", cost: 14500, materials: 8500, labor: 6000, status: "Audited & Cleared" },
      { title: "OMR High-mast Pole Repair and Wiring", cost: 28000, materials: 18000, labor: 10000, status: "Audited & Cleared" }
    ]
  },
  "Environment, Climate Change and Forests Department": {
    weekly: { filed: 8, completed: 7, spent: 195000 },
    yearly: { filed: 210, completed: 195, spent: 5640500 },
    sampleWorks: [
      { title: "Pallikaranai Wetland Walking Path and Sod Laying", cost: 19500, materials: 12000, labor: 7500, status: "Audited & Cleared" },
      { title: "Silt and Weed Clearance in Adyar Riverbed", cost: 22000, materials: 13000, labor: 9000, status: "Audited & Cleared" }
    ]
  },
  "Rural Development and Panchayat Raj Department": {
    weekly: { filed: 24, completed: 21, spent: 180000 },
    yearly: { filed: 610, completed: 575, spent: 7120000 },
    sampleWorks: [
      { title: "Village Connecting Road Gravel Layering", cost: 125000, materials: 75000, labor: 50000, status: "Audited & Cleared" },
      { title: "Check Dam Silt Dredging and Wall Mortar", cost: 85000, materials: 55000, labor: 30000, status: "Audited & Cleared" }
    ]
  },
  "Health and Family Welfare Department": {
    weekly: { filed: 12, completed: 11, spent: 85000 },
    yearly: { filed: 310, completed: 295, spent: 3110000 },
    sampleWorks: [
      { title: "Government PHC Medical Waste Incinerator Fix", cost: 45000, materials: 30000, labor: 15000, status: "Audited & Cleared" },
      { title: "Mosquito Vector Control Sprayers Dispatch", cost: 12000, materials: 8000, labor: 4000, status: "Audited & Cleared" }
    ]
  }
};

export default function GamificationCenter({
  citizenXP,
  citizenRank,
  unlockedBadgeIds,
  departments,
  complaints,
}: GamificationCenterProps) {
  const [subTab, setSubTab] = useState<'command_dashboard' | 'leaderboard' | 'financial_audit'>('command_dashboard');
  const [timeframe, setTimeframe] = useState<'weekly' | 'yearly'>('weekly');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('All');

  const sortedDepartments = [...departments].sort((a, b) => b.rating - a.rating);

  const renderBadgeIcon = (iconName: string, color: string) => {
    switch (iconName) {
      case 'Shield':
        return <Shield className="w-5 h-5" style={{ color }} />;
      case 'Award':
        return <Award className="w-5 h-5" style={{ color }} />;
      default:
        return <Trophy className="w-5 h-5" style={{ color }} />;
    }
  };

  const xpMax = 100;
  const xpPercentage = Math.min((citizenXP / xpMax) * 100, 100);

  // Helper to dynamically calculate department stats with live data
  const getDeptStats = (deptName: string, time: 'weekly' | 'yearly') => {
    const base = DEPARTMENT_HISTORICAL_BASELINE[deptName] || {
      weekly: { filed: 5, completed: 3, spent: 45000 },
      yearly: { filed: 120, completed: 105, spent: 1120000 }
    };

    const stats = time === 'weekly' ? { ...base.weekly } : { ...base.yearly };

    // Find live complaints for this department
    const liveComp = complaints.filter(c => c.department === deptName);
    liveComp.forEach(c => {
      stats.filed += 1;
      if (c.status === 'resolved') {
        stats.completed += 1;
        stats.spent += (c.funding?.totalBudget || 15000);
      } else if (c.status === 'repaired_audit' || c.status === 'repairing' || c.status === 'scheduled') {
        stats.spent += c.funding?.totalBudget ? Math.round(c.funding.totalBudget * 0.4) : 6000;
      }
    });

    return stats;
  };

  // Compile works for ledger (sample baseline + live resolved ones)
  const getDeptWorkLedger = (deptName: string) => {
    const base = DEPARTMENT_HISTORICAL_BASELINE[deptName];
    const sampleWorks = base ? [...base.sampleWorks] : [];

    // Find actual resolved complaints for this department
    const resolvedComp = complaints.filter(c => c.department === deptName && c.status === 'resolved');
    resolvedComp.forEach(c => {
      sampleWorks.unshift({
        title: c.title,
        cost: c.funding?.totalBudget || 15000,
        materials: c.funding?.materialsCost || 8000,
        labor: c.funding?.laborCost || 7000,
        status: "Live Audited & Approved"
      });
    });

    return sampleWorks;
  };

  // Dynamically calculate department-wise metrics and totals for Command Dashboard
  const departmentMetrics = departments.map(dept => {
    const weekly = getDeptStats(dept.name, 'weekly');
    const yearly = getDeptStats(dept.name, 'yearly');
    return {
      name: dept.name,
      weekly: {
        filed: weekly.filed,
        completed: weekly.completed,
        ongoing: Math.max(0, weekly.filed - weekly.completed),
        spent: weekly.spent
      },
      yearly: {
        filed: yearly.filed,
        completed: yearly.completed,
        ongoing: Math.max(0, yearly.filed - yearly.completed),
        spent: yearly.spent
      }
    };
  });

  const totalWeeklySpent = departmentMetrics.reduce((sum, item) => sum + item.weekly.spent, 0);
  const totalYearlySpent = departmentMetrics.reduce((sum, item) => sum + item.yearly.spent, 0);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex flex-col gap-6" id="panel-gamification">
      {/* Upper header */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500 fill-amber-100" />
            Gamification & Public Audit Center
          </h2>
          <p className="text-xs text-slate-500">
            Monitor citizen Sentinel achievements and track multi-phase department performance and repair ledgers.
          </p>
        </div>
        <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-1 rounded-full text-xs font-semibold font-display flex items-center gap-1 shrink-0">
          <Zap className="w-3.5 h-3.5 fill-emerald-100 animate-pulse" /> Active Season 1
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column: Citizen Achievements Passport */}
        <div className="lg:col-span-2 bg-slate-50 border border-slate-100 p-5 rounded-2xl flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-emerald-500/15">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 font-display text-sm">Resident Sentinel #402</h3>
              <p className="text-slate-400 font-semibold font-display text-xs mt-0.5">{citizenRank}</p>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-2xs">
            <div className="flex justify-between items-center text-xs text-slate-500 mb-1.5 font-semibold">
              <span>Experience (XP) points</span>
              <span className="font-mono text-slate-800 font-bold">{citizenXP} / {xpMax} XP</span>
            </div>
            <div className="w-full bg-slate-100 border border-slate-200/60 rounded-full h-3.5 overflow-hidden">
              <div 
                style={{ width: `${xpPercentage}%` }} 
                className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-800"
              />
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Community Badges Shelf</h4>
            <div className="grid grid-cols-1 gap-3">
              {CITIZEN_BADGE_PRESETS.map(badge => {
                const isUnlocked = unlockedBadgeIds.includes(badge.id);
                return (
                  <div 
                    key={badge.id}
                    className={`border rounded-xl p-3 flex gap-3 transition-all ${
                      isUnlocked 
                        ? 'bg-white border-slate-200 shadow-2xs hover:border-emerald-250 hover:bg-slate-50/30' 
                        : 'bg-slate-100/50 border-slate-150 opacity-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                      {isUnlocked ? renderBadgeIcon(badge.icon, badge.color) : "🔒"}
                    </div>
                    <div>
                      <h5 className="font-bold font-display text-slate-850 text-xs flex items-center gap-1.5">
                        {badge.name}
                        {isUnlocked && <span className="text-[9px] bg-emerald-100 text-emerald-800 border-emerald-200 px-1.5 py-0.2 rounded-md font-bold uppercase tracking-widest font-mono">EST</span>}
                      </h5>
                      <p className="text-slate-500 text-[10.5px] leading-relaxed mt-0.5">{badge.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Performance or Audit Ledger with Sub-Tabs */}
        <div className="lg:col-span-3 bg-white border border-slate-150 p-5 rounded-2xl flex flex-col gap-4">
          
          {/* Sub-Tabs Selector */}
          <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-none gap-2">
            <button
              onClick={() => setSubTab('command_dashboard')}
              className={`pb-2 px-3 text-xs font-bold font-display border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                subTab === 'command_dashboard'
                  ? 'border-emerald-600 text-emerald-700 font-black'
                  : 'border-transparent text-slate-400 hover:text-slate-650'
              }`}
            >
              📊 Command Dashboard
            </button>
            <button
              onClick={() => setSubTab('leaderboard')}
              className={`pb-2 px-3 text-xs font-bold font-display border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                subTab === 'leaderboard'
                  ? 'border-emerald-600 text-emerald-700 font-black'
                  : 'border-transparent text-slate-400 hover:text-slate-650'
              }`}
            >
              🏅 Performance Leaderboard
            </button>
            <button
              onClick={() => setSubTab('financial_audit')}
              className={`pb-2 px-3 text-xs font-bold font-display border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                subTab === 'financial_audit'
                  ? 'border-emerald-600 text-emerald-700 font-black'
                  : 'border-transparent text-slate-400 hover:text-slate-650'
              }`}
              id="tab-gamification-ledger"
            >
              💼 Public Audit Ledger
            </button>
          </div>

          {/* CONDITIONAL RENDER: METROPOLITAN COMMAND DASHBOARD */}
          {subTab === 'command_dashboard' && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-200">
              
              {/* Telemetry Header */}
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm font-display flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    Metropolitan Unified Command
                  </h3>
                  <p className="text-[10.5px] text-slate-500 mt-0.5">
                    Real-time consolidated analytics across ward maintenance schedules, active clearances, and civic bills.
                  </p>
                </div>
                {/* Timeframe switch */}
                <div className="flex p-0.5 bg-slate-200/60 rounded-lg text-[10.5px] font-bold shrink-0 self-start sm:self-auto shadow-3xs">
                  <button
                    onClick={() => setTimeframe('weekly')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${timeframe === 'weekly' ? 'bg-white text-slate-850 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setTimeframe('yearly')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${timeframe === 'yearly' ? 'bg-white text-slate-850 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Annual
                  </button>
                </div>
              </div>

              {/* Grid for Total Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50/40 border border-blue-100 p-3 rounded-xl flex flex-col justify-between shadow-3xs hover:bg-blue-50/60 transition-colors">
                  <span className="text-[9px] font-black uppercase tracking-wider text-blue-500 font-mono">
                    Received
                  </span>
                  <div className="text-xl font-black text-blue-900 font-mono mt-1">
                    {departmentMetrics.reduce((sum, item) => sum + (timeframe === 'weekly' ? item.weekly.filed : item.yearly.filed), 0).toLocaleString()}
                  </div>
                  <span className="text-[9px] text-blue-500 mt-1 font-medium font-sans">
                    All filed requests
                  </span>
                </div>

                <div className="bg-emerald-50/40 border border-emerald-100 p-3 rounded-xl flex flex-col justify-between shadow-3xs hover:bg-emerald-50/60 transition-colors">
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500 font-mono">
                    Solved
                  </span>
                  <div className="text-xl font-black text-emerald-900 font-mono mt-1">
                    {departmentMetrics.reduce((sum, item) => sum + (timeframe === 'weekly' ? item.weekly.completed : item.yearly.completed), 0).toLocaleString()}
                  </div>
                  <span className="text-[9px] text-emerald-500 mt-1 font-medium font-sans">
                    With audited clearance
                  </span>
                </div>

                <div className="bg-amber-50/40 border border-amber-100 p-3 rounded-xl flex flex-col justify-between shadow-3xs hover:bg-amber-50/60 transition-colors">
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-500 font-mono">
                    Ongoing
                  </span>
                  <div className="text-xl font-black text-amber-900 font-mono mt-1">
                    {departmentMetrics.reduce((sum, item) => sum + (timeframe === 'weekly' ? item.weekly.ongoing : item.yearly.ongoing), 0).toLocaleString()}
                  </div>
                  <span className="text-[9px] text-amber-500 mt-1 font-medium font-sans">
                    Work-in-progress
                  </span>
                </div>
              </div>

              {/* 1. DEPARTMENT-WISE OPERATIONS DASHBOARD */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Department-Wise Complaint Load
                  </h4>
                  <span className="text-[9.5px] font-bold text-slate-400 font-mono">
                    {timeframe === 'weekly' ? 'Weekly' : 'Annual'} Statistics
                  </span>
                </div>
                <div className="overflow-x-auto border border-slate-150 rounded-xl bg-white shadow-3xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-2.5 px-3">Agency Name</th>
                        <th className="py-2.5 px-2 text-center w-16">Filed</th>
                        <th className="py-2.5 px-2 text-center w-16">Solved</th>
                        <th className="py-2.5 px-2 text-center w-16">Ongoing</th>
                        <th className="py-2.5 px-3 text-right w-24">Clearance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {departmentMetrics.map(dept => {
                        const m = timeframe === 'weekly' ? dept.weekly : dept.yearly;
                        const rate = m.filed > 0 ? Math.round((m.completed / m.filed) * 100) : 100;
                        return (
                          <tr key={dept.name} className="hover:bg-slate-50/50 transition">
                            <td className="py-2.5 px-3 font-semibold text-slate-800 font-display truncate max-w-[140px] md:max-w-xs" title={dept.name}>
                              {dept.name}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-600">{m.filed}</td>
                            <td className="py-2.5 px-2 text-center font-mono text-[11px] text-emerald-600 font-bold">{m.completed}</td>
                            <td className="py-2.5 px-2 text-center font-mono text-[11px] text-amber-600 font-bold">{m.ongoing}</td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5 font-mono">
                                <span className="text-[10px] font-bold text-slate-800">{rate}%</span>
                                <div className="w-10 bg-slate-100 rounded-full h-1 overflow-hidden border border-slate-150">
                                  <div style={{ width: `${rate}%` }} className="h-full bg-emerald-500 rounded-full" />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Department Wise Summary Total Row */}
                      <tr className="bg-slate-50/80 font-black border-t border-slate-200 text-slate-900 text-xs">
                        <td className="py-2.5 px-3 font-bold uppercase">Grand Total of All Departments</td>
                        <td className="py-2.5 px-2 text-center font-mono">
                          {departmentMetrics.reduce((sum, item) => sum + (timeframe === 'weekly' ? item.weekly.filed : item.yearly.filed), 0)}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-emerald-700">
                          {departmentMetrics.reduce((sum, item) => sum + (timeframe === 'weekly' ? item.weekly.completed : item.yearly.completed), 0)}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-amber-700">
                          {departmentMetrics.reduce((sum, item) => sum + (timeframe === 'weekly' ? item.weekly.ongoing : item.yearly.ongoing), 0)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                          {(() => {
                            const totFiled = departmentMetrics.reduce((sum, item) => sum + (timeframe === 'weekly' ? item.weekly.filed : item.yearly.filed), 0);
                            const totCompleted = departmentMetrics.reduce((sum, item) => sum + (timeframe === 'weekly' ? item.weekly.completed : item.yearly.completed), 0);
                            return totFiled > 0 ? Math.round((totCompleted / totFiled) * 100) : 100;
                          })()}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. WEEKLY AND ANNUAL BILL OF EACH DEPARTMENT + TOTAL OF ALL DEPARTMENTS */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                    Department Expenditure & Billing Index
                  </h4>
                  <span className="text-[9.5px] font-bold text-slate-400 font-mono">
                    All Financial Allocations (INR ₹)
                  </span>
                </div>
                <div className="overflow-x-auto border border-slate-150 rounded-xl bg-white shadow-3xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-2.5 px-3">Agency Name</th>
                        <th className="py-2.5 px-3 text-right w-36">Weekly Bill Spent (₹)</th>
                        <th className="py-2.5 px-3 text-right w-36">Annual Bill Spent (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {departmentMetrics.map(dept => (
                        <tr key={dept.name} className="hover:bg-slate-50/50 transition">
                          <td className="py-2.5 px-3 font-semibold text-slate-800 font-display truncate max-w-[140px] md:max-w-xs" title={dept.name}>
                            {dept.name}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 font-bold">
                            ₹{dept.weekly.spent.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-850 font-bold">
                            ₹{dept.yearly.spent.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {/* Financial Grand Total Row */}
                      <tr className="bg-emerald-50/50 font-black border-t border-emerald-150 text-emerald-950 text-xs">
                        <td className="py-3 px-3 uppercase tracking-wider font-bold text-emerald-900">Grand Total of All Departments</td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-800 font-black text-sm">
                          ₹{totalWeeklySpent.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-600 font-black text-sm">
                          ₹{totalYearlySpent.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* CONDITIONAL RENDER: LEADERBOARD RANKINGS */}
          {subTab === 'leaderboard' && (
            <div className="flex flex-col gap-3 animate-in fade-in duration-250">
              <div>
                <h3 className="font-bold text-slate-800 font-display text-sm">Department Performance Scoreboard</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Departments earn honor points based on material transparency, response speed, and community audit completions.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse mt-1">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-2.5">Rank & Agency</th>
                      <th className="py-2.5">Response Time</th>
                      <th className="py-2.5">Citizen Rating</th>
                      <th className="py-2.5 text-right">Awarded Medals</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {sortedDepartments.map((dept, idx) => (
                      <tr key={dept.name} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold font-mono text-slate-400 w-5">#{idx + 1}</span>
                            <div>
                              <p className="font-bold text-slate-700 font-display">{dept.name}</p>
                              <div className="flex gap-2 items-center text-[10px] text-slate-400 font-semibold">
                                <span>{dept.resolvedCount} Issues Solved</span>
                                <span>•</span>
                                <span className="text-emerald-600 font-bold font-mono">{(dept as any).performancePoints || (dept.resolvedCount * 75 + 100)} pts</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 font-mono text-slate-650">{dept.responseTime}</td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-slate-850">{dept.rating.toFixed(1)}</span>
                            <div className="flex text-amber-400">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-3 h-3 ${i < Math.round(dept.rating) ? 'fill-amber-400' : 'text-slate-200'}`} 
                                />
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 text-right">
                          <div className="flex flex-wrap justify-end gap-1 select-none">
                            {dept.badges.map((b, bIdx) => (
                              <span 
                                key={bIdx} 
                                className="bg-emerald-50 text-emerald-800 text-[9px] font-bold border border-emerald-100 px-2 py-0.5 rounded-lg inline-flex items-center gap-0.5 font-display"
                              >
                                🏅 {b}
                              </span>
                            ))}
                            {dept.badges.length === 0 && <span className="text-[10px] text-slate-400">Stable</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CONDITIONAL RENDER: FINANCIAL LEDGER & WORKS BREAKDOWN */}
          {subTab === 'financial_audit' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-250">
              
              {/* Header with selector controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-150 p-3.5 rounded-xl">
                <div>
                  <h3 className="font-extrabold text-slate-800 font-display text-sm flex items-center gap-1">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    Departmental Budgets & Bills
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Explore transparent spending indices and specific repair bills.
                  </p>
                </div>

                {/* Timeframe selector toggle */}
                <div className="flex p-0.5 bg-slate-200/75 rounded-lg text-xs font-bold shrink-0 self-start sm:self-auto">
                  <button
                    onClick={() => setTimeframe('weekly')}
                    className={`px-3 py-1 rounded-md transition ${timeframe === 'weekly' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setTimeframe('yearly')}
                    className={`px-3 py-1 rounded-md transition ${timeframe === 'yearly' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Yearly
                  </button>
                </div>
              </div>

              {/* Department Filter Selector */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedDeptFilter('All')}
                  className={`px-2.5 py-1 text-[10.5px] font-bold rounded-lg transition border cursor-pointer ${
                    selectedDeptFilter === 'All'
                      ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-350 hover:bg-slate-50/50'
                  }`}
                >
                  All Agencies
                </button>
                {departments.map(d => (
                  <button
                    key={d.name}
                    onClick={() => setSelectedDeptFilter(d.name)}
                    className={`px-2.5 py-1 text-[10.5px] font-bold rounded-lg transition border truncate max-w-[150px] cursor-pointer ${
                      selectedDeptFilter === d.name
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-350 hover:bg-slate-50/50'
                    }`}
                    title={d.name}
                  >
                    {d.name.split(' ')[0]} {d.name.split(' ')[1] || ''}
                  </button>
                ))}
              </div>

              {/* Ledger List */}
              <div className="flex flex-col gap-4 max-h-[380px] overflow-y-auto pr-1">
                {sortedDepartments
                  .filter(d => selectedDeptFilter === 'All' || d.name === selectedDeptFilter)
                  .map(dept => {
                    const stats = getDeptStats(dept.name, timeframe);
                    const workLedger = getDeptWorkLedger(dept.name);

                    return (
                      <div key={dept.name} className="border border-slate-200 rounded-xl p-4 flex flex-col gap-3.5 hover:shadow-2xs transition">
                        
                        {/* Title and grand stats */}
                        <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-2.5">
                          <div>
                            <span className="text-[9px] font-black tracking-widest text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded uppercase font-mono border border-emerald-100">
                              {timeframe === 'weekly' ? 'Weekly Outlook' : 'Yearly Outlook'}
                            </span>
                            <h4 className="font-extrabold text-slate-800 text-sm mt-1 font-display">
                              {dept.name}
                            </h4>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold font-mono">
                              Total spent
                            </span>
                            <p className="text-sm font-black text-slate-850 font-mono tracking-tight">
                              ₹{stats.spent.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Quantitative progress indicator */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg">
                            <span className="text-[9px] text-slate-400 font-semibold font-mono block uppercase">Filed Complaints</span>
                            <span className="text-xs font-bold text-slate-800 font-mono">{stats.filed}</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg">
                            <span className="text-[9px] text-slate-400 font-semibold font-mono block uppercase">Completed Works</span>
                            <span className="text-xs font-bold text-slate-800 font-mono">{stats.completed}</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg">
                            <span className="text-[9px] text-slate-400 font-semibold font-mono block uppercase">Clearance Rate</span>
                            <span className="text-xs font-black text-emerald-600 font-mono">
                              {stats.filed > 0 ? Math.round((stats.completed / stats.filed) * 100) : 100}%
                            </span>
                          </div>
                        </div>

                        {/* Specific ledger breakdown of bills */}
                        <div className="flex flex-col gap-2 bg-slate-50/40 border border-slate-150 p-3 rounded-lg">
                          <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 font-mono flex items-center gap-1">
                            <Briefcase className="w-3 h-3 text-slate-400" />
                            Corrective bills breakdown & status
                          </span>
                          
                          <div className="flex flex-col gap-2 divide-y divide-slate-100">
                            {workLedger.length > 0 ? (
                              workLedger.map((work, wIdx) => (
                                <div key={wIdx} className="pt-2 first:pt-0 flex flex-col gap-1 text-[11px]">
                                  <div className="flex justify-between items-start gap-3">
                                    <span className="font-bold text-slate-700 truncate" title={work.title}>
                                      {work.title}
                                    </span>
                                    <span className="font-mono font-bold text-slate-800 shrink-0">
                                      ₹{work.cost.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center text-[9.5px] text-slate-500 font-mono leading-none">
                                    <span>
                                      Materials: ₹{work.materials.toLocaleString()} | Labor/Equipment: ₹{work.labor.toLocaleString()}
                                    </span>
                                    <span className={`px-1 py-0.25 rounded font-bold text-[8.5px] ${
                                      work.status.includes('Live') 
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}>
                                      {work.status}
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-400 font-mono py-1 text-center">No compiled work-bills in this timeframe.</p>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
