import React, { useState } from 'react';
import { Complaint, Department } from '../types';
import { DollarSign, TrendingUp, CheckCircle2, AlertCircle, Calendar, BarChart3, HelpCircle } from 'lucide-react';

interface CivicAuditLedgerProps {
  complaints: Complaint[];
  departments: Department[];
}

// Baseline historical statistics to simulate realistic community datasets
const DEPARTMENT_HISTORICAL_BASELINE: Record<string, {
  weekly: { filed: number; completed: number; spent: number };
  yearly: { filed: number; completed: number; spent: number };
}> = {
  "Municipal Administration and Water Supply Department": {
    weekly: { filed: 42, completed: 38, spent: 215000 },
    yearly: { filed: 1120, completed: 1040, spent: 8450000 }
  },
  "Highways and Minor Ports Department": {
    weekly: { filed: 18, completed: 14, spent: 354000 },
    yearly: { filed: 480, completed: 445, spent: 12840000 }
  },
  "Energy Department": {
    weekly: { filed: 15, completed: 13, spent: 142000 },
    yearly: { filed: 390, completed: 365, spent: 4890000 }
  },
  "Environment, Climate Change and Forests Department": {
    weekly: { filed: 8, completed: 7, spent: 195000 },
    yearly: { filed: 210, completed: 195, spent: 5640500 }
  },
  "Rural Development and Panchayat Raj Department": {
    weekly: { filed: 24, completed: 21, spent: 180000 },
    yearly: { filed: 610, completed: 575, spent: 7120000 }
  },
  "Health and Family Welfare Department": {
    weekly: { filed: 12, completed: 11, spent: 85000 },
    yearly: { filed: 310, completed: 295, spent: 3110000 }
  }
};

export default function CivicAuditLedger({ complaints, departments }: CivicAuditLedgerProps) {
  const [timeframe, setTimeframe] = useState<'weekly' | 'yearly'>('weekly');

  // Compute dynamic contribution of live sandbox complaints
  const getDynamicStatsForDepartment = (deptName: string, time: 'weekly' | 'yearly') => {
    // Start with baseline
    const base = DEPARTMENT_HISTORICAL_BASELINE[deptName] || {
      weekly: { filed: 5, completed: 3, spent: 45000 },
      yearly: { filed: 120, completed: 105, spent: 1120000 }
    };

    const baseline = time === 'weekly' ? { ...base.weekly } : { ...base.yearly };

    // Accumulate live complaints of this department
    const liveDeptComplaints = complaints.filter(c => c.department === deptName);
    
    liveDeptComplaints.forEach(c => {
      // Any captured complaint is filed
      baseline.filed += 1;
      
      // If resolved, add to completed and add the budget
      if (c.status === 'resolved') {
        baseline.completed += 1;
        const budget = c.funding?.totalBudget || 15000;
        baseline.spent += budget;
      } else if (c.status === 'repaired_audit' || c.status === 'repairing' || c.status === 'scheduled') {
        // Some ongoing also incur initial budget costs
        const budget = c.funding?.totalBudget ? Math.round(c.funding.totalBudget * 0.4) : 6000;
        baseline.spent += budget;
      }
    });

    return baseline;
  };

  // User's specific contributions
  const userStats = (() => {
    const userWeeklyFiled = complaints.length;
    const userWeeklyCompleted = complaints.filter(c => c.status === 'resolved').length;
    const userWeeklySpent = complaints.reduce((sum, c) => sum + (c.funding?.totalBudget || 0), 0);

    // Yearly has higher baseline of user contribution to make it feel persistent
    const userYearlyFiled = userWeeklyFiled + 11;
    const userYearlyCompleted = userWeeklyCompleted + 7;
    const userYearlySpent = userWeeklySpent + 124500;

    return {
      weekly: { filed: userWeeklyFiled, completed: userWeeklyCompleted, spent: userWeeklySpent },
      yearly: { filed: userYearlyFiled, completed: userYearlyCompleted, spent: userYearlySpent }
    };
  })();

  const activeUserStats = timeframe === 'weekly' ? userStats.weekly : userStats.yearly;

  // Calculate overall statistics
  const departmentList = departments.map(d => d.name).length > 0 
    ? departments.map(d => d.name) 
    : Object.keys(DEPARTMENT_HISTORICAL_BASELINE);

  const calculatedDepts = departmentList.map(deptName => {
    const stats = getDynamicStatsForDepartment(deptName, timeframe);
    const rate = stats.filed > 0 ? Math.round((stats.completed / stats.filed) * 100) : 0;
    return {
      name: deptName,
      ...stats,
      completionRate: rate
    };
  });

  const grandTotalSpent = calculatedDepts.reduce((sum, d) => sum + d.spent, 0);
  const grandTotalFiled = calculatedDepts.reduce((sum, d) => sum + d.filed, 0);
  const grandTotalCompleted = calculatedDepts.reduce((sum, d) => sum + d.completed, 0);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col gap-4" id="civic-audit-ledger-sidebar">
      {/* Header section with theme */}
      <div className="flex flex-col gap-1 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            Civic Audit & Budget Ledger
          </h3>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100/70 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
            Live Audit
          </span>
        </div>
        <p className="text-[10.5px] text-slate-500 leading-normal">
          Real-time tracking of filed complaints, works completed, and total correction bills.
        </p>
      </div>

      {/* Timeframe selector */}
      <div className="grid grid-cols-2 p-1 bg-slate-100 border border-slate-200/50 rounded-xl">
        <button
          onClick={() => setTimeframe('weekly')}
          className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
            timeframe === 'weekly'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          id="btn-ledger-weekly"
        >
          <Calendar className="w-3 h-3" />
          Weekly Details
        </button>
        <button
          onClick={() => setTimeframe('yearly')}
          className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
            timeframe === 'yearly'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          id="btn-ledger-yearly"
        >
          <TrendingUp className="w-3 h-3" />
          Yearly Summary
        </button>
      </div>

      {/* User contributions segment */}
      <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex flex-col gap-2.5">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">
          Your Personal Sentinel Record
        </h4>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white border border-slate-150 p-2 rounded-lg text-center flex flex-col items-center">
            <span className="text-[9px] text-slate-400 font-medium font-mono uppercase">Filed</span>
            <span className="text-sm font-extrabold text-slate-800 font-mono">{activeUserStats.filed}</span>
          </div>
          <div className="bg-white border border-slate-150 p-2 rounded-lg text-center flex flex-col items-center">
            <span className="text-[9px] text-slate-400 font-medium font-mono uppercase">Resolved</span>
            <span className="text-sm font-extrabold text-emerald-600 font-mono flex items-center gap-0.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
              {activeUserStats.completed}
            </span>
          </div>
          <div className="bg-white border border-slate-150 p-2 rounded-lg text-center flex flex-col items-center">
            <span className="text-[9px] text-slate-400 font-medium font-mono uppercase">Invested</span>
            <span className="text-xs font-black text-slate-700 font-mono truncate max-w-full">
              ₹{activeUserStats.spent.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Division line */}
      <div className="h-[1px] bg-slate-100" />

      {/* Department list and spendings */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">
          <span>Department Performance</span>
          <span>Budget Spent</span>
        </div>

        <div className="flex flex-col gap-2.5 max-h-[290px] overflow-y-auto pr-1">
          {calculatedDepts.map(dept => {
            // Determine progress bar color based on completion rate
            const isExcellent = dept.completionRate >= 85;
            const isMedium = dept.completionRate >= 70;
            const barColor = isExcellent 
              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)]' 
              : isMedium 
                ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.2)]' 
                : 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.2)]';

            return (
              <div key={dept.name} className="flex flex-col gap-1 border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs font-bold text-slate-700 font-display truncate max-w-[170px]" title={dept.name}>
                    {dept.name}
                  </span>
                  <span className="text-xs font-extrabold text-slate-800 font-mono shrink-0">
                    ₹{dept.spent.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span className="font-semibold">{dept.completed} of {dept.filed} solved</span>
                  <span className="font-bold text-slate-650">{dept.completionRate}% rate</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${dept.completionRate}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grand summary footer */}
      <div className="bg-slate-900 text-white rounded-xl p-3 flex justify-between items-center shadow-md shadow-slate-900/10">
        <div>
          <span className="text-[8px] uppercase tracking-widest text-slate-400 font-mono font-bold">
            Total Civic Outlay ({timeframe})
          </span>
          <p className="text-sm font-black font-mono tracking-tight text-emerald-400">
            ₹{grandTotalSpent.toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[8px] uppercase tracking-widest text-slate-400 font-mono font-bold">
            Solved Rate
          </span>
          <p className="text-xs font-extrabold font-mono text-white">
            {grandTotalFiled > 0 ? Math.round((grandTotalCompleted / grandTotalFiled) * 100) : 0}%
          </p>
        </div>
      </div>
    </div>
  );
}
