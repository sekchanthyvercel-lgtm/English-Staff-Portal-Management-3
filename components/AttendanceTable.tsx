import React, { useState, useMemo, useEffect } from 'react';
import { Student, AppData, UserRole, AppSettings, StudentCategory } from '../types';
import { format, addDays, getDaysInMonth, startOfMonth } from 'date-fns';
import { normalizeBehavior } from '../src/lib/behaviorUtils';
import { 
  Plus, UserCheck, 
  ChevronLeft, ChevronRight, ArrowUpDown, Calendar, Maximize2,
  Trash2, Zap, Check, AlertCircle, LayoutGrid, Search, EyeOff, Eye,
  CheckSquare, Square, Lock, Unlock, FileSpreadsheet, FileText
} from 'lucide-react';
import { exportToExcel, exportToWord } from '../services/excelService';

interface Props {
  students: Student[];
  data: AppData;
  filters: any;
  setFilters?: (f: any) => void;
  uniqueTeachers: string[];
  uniqueAssistants: string[];
  uniqueLevels: string[];
  uniqueTimes: string[];
  uniqueBehaviors?: string[];
  onUpdate: (newData: AppData) => void;
  onAddStudent: (defaults: Partial<Student>) => void;
  onDeleteStudent?: (ids: string | string[], skipConfirm?: boolean) => void;
  onQuickAdd: () => void;
  isLocked?: boolean;
  role?: UserRole;
  onClearCategory?: (cats: StudentCategory[]) => void;
  settings?: AppSettings;
}

// Fixed color mapping based on provided screenshot
const ASSISTANT_COLORS: Record<string, string> = {
  'DALIN': '#EBF5FF', // Light Blue
  'LEAP': '#F0FFF4',  // Light Green
  'VORN': '#FFF5F5',  // Light Red/Pink
  'KHEANG': '#FFF9EB', // Light Orange
};

const getRowBg = (idx: number): string => {
  const colors = [
    'bg-emerald-50/10',
    'bg-emerald-50/10',
    'bg-amber-50/10',
    'bg-indigo-50/10',
    'bg-rose-50/10',
    'bg-violet-50/10',
    'bg-teal-50/10',
    'bg-orange-50/10'
  ];
  return colors[idx % colors.length];
};

const getTeacherColor = (name: string) => {
  if (!name || name === 'N/A') return 'bg-slate-50 text-slate-400';
  const colors = [
    'bg-slate-50 text-slate-800 border border-slate-100',
    'bg-blue-50 text-blue-800 border border-blue-100',
    'bg-teal-50 text-teal-800 border border-teal-100',
    'bg-orange-50 text-orange-800 border border-orange-100',
    'bg-purple-50 text-purple-800 border border-purple-100',
    'bg-pink-50 text-pink-800 border border-pink-100',
    'bg-green-50 text-green-800 border border-green-100',
    'bg-red-50 text-red-800 border border-red-100'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getAssistantColor = (name: string) => {
  if (!name || name === 'N/A') return 'bg-slate-50 text-slate-400';
  const colors = [
    'bg-indigo-50 text-indigo-800 border border-indigo-100',
    'bg-rose-50 text-rose-800 border border-rose-100',
    'bg-emerald-50 text-emerald-800 border border-emerald-100',
    'bg-amber-50 text-amber-800 border border-amber-100',
    'bg-violet-50 text-violet-800 border border-violet-100',
    'bg-cyan-50 text-cyan-800 border border-cyan-100',
    'bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-100',
    'bg-sky-50 text-sky-800 border border-sky-100'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};


/**
 * Icons for the Attendance Status based on screenshot: 
 */
// StatusIcon is defined below

// Memoized Status Icon component for better performance
const StatusIcon = React.memo(({ status }: { status: number | undefined }) => {
  if (status === 0) return (
    <div className="w-8 h-6 bg-[#67B18E] rounded-sm flex items-center justify-center text-white shadow-sm mx-auto">
      <Check size={14} strokeWidth={4} />
      <span className="sr-only">P</span>
    </div>
  );
  if (status === 0.25) return (
    <div className="w-8 h-6 bg-orange-500 rounded-sm flex items-center justify-center text-white shadow-sm mx-auto">
       <span className="text-[10px] font-black">L</span>
    </div>
  );
  if (status === 1) return (
    <div className="w-8 h-6 bg-rose-500 rounded-sm flex items-center justify-center text-white shadow-sm mx-auto">
       <span className="text-[10px] font-black">A</span>
    </div>
  );
  if (status === 2) return (
    <div className="w-8 h-6 bg-cyan-600 rounded-sm flex items-center justify-center text-white shadow-sm mx-auto">
       <span className="text-[10px] font-black tracking-tighter">AP</span>
    </div>
  );
  if (status === 3) return (
    <div className="w-8 h-6 bg-rose-900 rounded-sm flex items-center justify-center text-white shadow-sm mx-auto border border-rose-950/20">
       <span className="text-[10px] font-black tracking-tighter">AW</span>
    </div>
  );
  return (
    <div className="w-8 h-6 border border-slate-200 rounded-sm mx-auto bg-slate-50/30 group-hover:border-slate-300 transition-colors"></div>
  );
});

const AttendanceRow = React.memo(({ 
  s, idx, daysInMonth, monthKey, attendance, isFrozen, studentNameWidth, settings, isCurrentDay, cycleStatus, onUpdate, data, students, 
  getTeacherColor, getAssistantColor, selectedIds, setSelectedIds
}: any) => {
  const isHidden = s.isHidden;
  const rowBgClass = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30';

  return (
    <tr className={`group transition-all hover:brightness-95 h-8 ${isHidden ? 'bg-slate-50' : rowBgClass}`} style={{ height: '32px' }}>
      <td className={`px-5 border-r border-slate-200/10 shadow-sm ${isFrozen ? 'sticky z-20 shadow-[4px_0_10px_rgba(0,0,0,0.05)] bg-white left-0' : 'bg-inherit'}`} style={{ width: studentNameWidth, left: isFrozen ? 0 : undefined }}>
        <div 
          className={`font-black text-[#1B254B] uppercase tracking-tight truncate flex items-center min-h-[32px] ${isHidden ? 'opacity-30' : ''}`}
          style={{ fontSize: settings?.fontSize ? `${settings.fontSize}px` : '12px', color: '#1B254B' }}
        >
          {s.name}
        </div>
      </td>
      <td className={`px-0 text-center border-r border-slate-200/10 bg-inherit w-10`}>
        <div className="flex items-center justify-center min-h-[32px]">
          <button onClick={() => { const ns = new Set(selectedIds); ns.has(s.id) ? ns.delete(s.id) : ns.add(s.id); setSelectedIds(ns); }} className="w-8 h-8 flex items-center justify-center hover:bg-black/5 rounded-md">
            {selectedIds.has(s.id) ? <CheckSquare size={16} className="text-orange-600" /> : <Square size={16} className="text-slate-400/30" />}
          </button>
        </div>
      </td>
      <td className={`px-4 text-center text-xs font-black text-slate-400 border-r border-slate-200/10 bg-inherit w-12`}>
        <div className="flex items-center justify-center min-h-[32px]">
          {idx + 1}
        </div>
      </td>
      <td className="px-4 border-r border-slate-200/10">
        <div className="flex flex-wrap gap-1">
          {(s.teachers || 'N/A').split('&').map((t: string, i: number) => (
            <div key={i} className={`text-[10px] font-black ${getTeacherColor(t.trim())} px-2 py-0.5 rounded backdrop-blur-sm uppercase truncate ${isHidden ? 'opacity-30' : ''}`}>
              {t.trim()}
            </div>
          ))}
        </div>
      </td>
      <td className="px-4 border-r border-slate-200/10 text-center">
        <div className={`text-[11px] font-black text-[#1B254B] uppercase ${isHidden ? 'opacity-30' : ''}`}>{s.level || 'N/A'}</div>
      </td>
      <td className="px-4 border-r border-slate-200/10">
        <div className="flex flex-col gap-0.5">
          <div className={`text-[11px] font-black text-[#1B254B] uppercase ${isHidden ? 'opacity-30' : ''}`}>{s.time || 'N/A'}</div>
        </div>
      </td>
      <td className="px-4 border-r border-slate-200/10">
        <div className={`text-[11px] font-black ${getAssistantColor(s.assistant || '')} px-2 py-0.5 rounded backdrop-blur-md w-max uppercase tracking-widest shadow-sm ${isHidden ? 'opacity-30' : ''}`}>{s.assistant || 'N/A'}</div>
      </td>
      
      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const dayKey = `${monthKey}-${String(day).padStart(2, '0')}`;
          const status = attendance[dayKey];
          const isCurrentCol = isCurrentDay(day);

          return (
            <td 
              key={day} 
              onClick={() => cycleStatus(s.id, day)}
              className={`p-0 border-r border-slate-200/10 cursor-pointer transition-colors ${isCurrentCol ? 'bg-orange-500/5' : ''}`}
            >
              <div className={`w-full h-full flex items-center justify-center ${isHidden ? 'opacity-20 grayscale' : ''}`}>
                  <StatusIcon status={status} />
              </div>
            </td>
          );
      })}

      <td className="px-4 bg-inherit border-l border-slate-200/10 shadow-[-2px_0_4px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-center gap-2">
          <button 
            onClick={() => onUpdate({ ...data, students: students.map((st: any) => st.id === s.id ? { ...st, isHidden: !isHidden } : st) })}
            className={`p-1.5 rounded-lg transition-all ${isHidden ? 'bg-[#1B254B] text-white' : 'text-slate-300 hover:text-primary-500 hover:bg-white'}`}
          >
            {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        </div>
      </td>
    </tr>
  );
}, (prev, next) => {
    return prev.s.id === next.s.id && 
           prev.s.isHidden === next.s.isHidden && 
           JSON.stringify(prev.attendance) === JSON.stringify(next.attendance) &&
           prev.studentNameWidth === next.studentNameWidth &&
           prev.isFrozen === next.isFrozen &&
           prev.settings?.fontSize === next.settings?.fontSize &&
           prev.selectedIds === next.selectedIds;
});

export const AttendanceTable: React.FC<Props> = ({ 
  students, data, filters, setFilters, 
  uniqueTeachers = [], uniqueAssistants = [], uniqueLevels = [], uniqueTimes = [], uniqueBehaviors = [],
  onUpdate, onAddStudent, onDeleteStudent, isLocked = false, role, onClearCategory, settings
}) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [isFrozen, setIsFrozen] = useState(true);
  const [studentNameWidth, setStudentNameWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dps_studentNameWidth');
      if (saved) return parseInt(saved, 10);
      return window.innerWidth < 768 ? 120 : 180;
    }
    return 180;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dps_studentNameWidth', studentNameWidth.toString());
    }
  }, [studentNameWidth]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const resizingRef = React.useRef<{ startX: number; startWidth: number } | null>(null);

  const onResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!('touches' in e)) {
      e.preventDefault();
    }
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    resizingRef.current = { startX: clientX, startWidth: studentNameWidth };
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeEnd);
    document.addEventListener('touchmove', onResizeMove, { passive: false });
    document.addEventListener('touchend', onResizeEnd);
  };

  const onResizeMove = (e: MouseEvent | TouchEvent) => {
    if (!resizingRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const { startX, startWidth } = resizingRef.current;
    const diff = clientX - startX;
    setStudentNameWidth(Math.max(80, startWidth + diff));
  };

  const onResizeEnd = () => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeEnd);
    document.removeEventListener('touchmove', onResizeMove);
    document.removeEventListener('touchend', onResizeEnd);
  };
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [localSearch, setLocalSearch] = useState(filters.searchQuery || '');

  useEffect(() => {
    setLocalSearch(filters.searchQuery || '');
  }, [filters.searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.searchQuery) {
        setFilters?.({ ...filters, searchQuery: localSearch });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearch]);

  const monthKey = format(viewDate, 'yyyy-MM');
  const daysInMonth = getDaysInMonth(viewDate);
  const dayDisplay = format(viewDate, 'd');

  const CHECKBOX_WIDTH = 45;
  const NUMBER_WIDTH = 45;
  const NAME_START = isFrozen ? (CHECKBOX_WIDTH + NUMBER_WIDTH) : 0;

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredStudents = useMemo(() => {
    let result = students.filter(s => {
      const query = (filters.searchQuery || '').toLowerCase();
      const matchesSearch = !query || 
        (s.name || '').toLowerCase().includes(query) ||
        (s.assistant && s.assistant.toLowerCase().includes(query)) ||
        (s.time && s.time.toLowerCase().includes(query)) ||
        (s.time2 && s.time2.toLowerCase().includes(query)) ||
        (s.behavior && s.behavior.toLowerCase().includes(query)) ||
        (s.level && s.level.toLowerCase().includes(query)) ||
        (s.teachers && s.teachers.toLowerCase().includes(query));

      const behaviorMatch = !filters.behavior || 
        normalizeBehavior(String(s.behavior || '')) === normalizeBehavior(filters.behavior);

      const timeMatch = !filters.time || 
        (s.time && s.time.toUpperCase().includes(filters.time.toUpperCase())) ||
        (s.time2 && s.time2.toUpperCase().includes(filters.time.toUpperCase()));

      return (s.category === 'Class' || s.category === 'Hall' || !s.category) && 
        (filters.showHidden || !s.isHidden) && 
        matchesSearch && 
        (!filters.teacher || (s.teachers && s.teachers.toUpperCase().includes(filters.teacher.toUpperCase()))) && 
        (!filters.assistant || (s.assistant && s.assistant.toUpperCase().includes(filters.assistant.toUpperCase()))) && 
        (!filters.level || (s.level && s.level.toUpperCase().includes(filters.level.toUpperCase()))) &&
        behaviorMatch &&
        timeMatch;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        let valA = String((a as any)[sortConfig.key] || '').toLowerCase();
        let valB = String((b as any)[sortConfig.key] || '').toLowerCase();
        return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    } else {
      result.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return result;
  }, [students, filters, sortConfig]);

  const deferredStudents = React.useDeferredValue(filteredStudents);
  const totalPages = Math.ceil(deferredStudents.length / pageSize);
  const currentViewStudents = deferredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.searchQuery, filters.teacher, filters.assistant, filters.time]);

  const cycleStatus = (studentId: string, day: number) => {
    if (isLocked) return;
    const dayKey = `${monthKey}-${String(day).padStart(2, '0')}`;
    
    onUpdate((prevData: AppData) => {
      const newAttendance = { ...prevData.attendance };
      const studentRecord = { ...(newAttendance[studentId] || {}) };
      const cur = studentRecord[dayKey];
      
      // Updated cycle: P -> A -> AP -> AW -> L -> undefined
      let next: number | undefined;
      if (cur === undefined) next = 0; // P
      else if (cur === 0) next = 1;    // A
      else if (cur === 1) next = 2;    // AP
      else if (cur === 2) next = 3;    // AW
      else if (cur === 3) next = 0.25; // L
      else next = undefined;          // Reset

      if (next === undefined) {
        delete studentRecord[dayKey];
      } else {
        studentRecord[dayKey] = next;
      }
      
      newAttendance[studentId] = studentRecord;
      return { ...prevData, attendance: newAttendance };
    });
  };

  const markAllPresent = () => {
    if (isLocked) return;
    const dayKey = `${monthKey}-${String(viewDate.getDate()).padStart(2, '0')}`;
    
    onUpdate((prevData: AppData) => {
      const newAttendance = { ...prevData.attendance };
      filteredStudents.forEach(s => {
        const studentRecord = { ...(newAttendance[s.id] || {}) };
        studentRecord[dayKey] = 0;
        newAttendance[s.id] = studentRecord;
      });
      return { ...prevData, attendance: newAttendance };
    });
  };

  const Th = ({ label, colId, width, stickyLeft }: { label: string, colId: string, width?: number, stickyLeft?: number }) => (
    <th 
      onClick={() => handleSort(colId)}
      className={`px-4 py-4 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest border-r border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors group ${stickyLeft !== undefined ? 'sticky z-50 bg-white shadow-[1px_0_0_0_rgba(0,0,0,0.1)]' : ''}`}
      style={{ width, left: stickyLeft }}
    >
      <div className="flex items-center justify-between">
        {label}
        <ArrowUpDown size={10} className={`${sortConfig?.key === colId ? 'opacity-100 text-primary-500' : 'opacity-20 group-hover:opacity-100'} transition-opacity`} />
      </div>
    </th>
  );

  const resetFilters = () => {
    setFilters?.({
      searchQuery: '',
      teacher: '',
      assistant: '',
      time: '',
      level: '',
      behavior: '',
      deadline: '',
      showHidden: false
    });
  };

  const filterSelectStyle = "bg-slate-200/50 mix-blend-multiply border border-slate-300/30 rounded-xl pl-8 pr-3 py-1.5 text-[10px] font-black uppercase text-slate-800 outline-none shadow-sm transition-all focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 hover:bg-slate-300/60 cursor-pointer h-9 appearance-none backdrop-blur-md";

  return (
    <div className="flex-1 flex flex-col bg-transparent overflow-hidden p-2 md:p-6 lg:p-8">
      {/* Table Header UI */}
      <div className="bg-white/30 backdrop-blur-3xl rounded-[32px] p-6 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-2xl shadow-slate-300/50 border border-white/60 flex-none relative z-10">
        <div className="flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-500/20">
            <UserCheck size={24} strokeWidth={3} />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#1B254B] uppercase tracking-tighter leading-none">Attendance Log</h2>
            <p className="text-[10px] font-black text-slate-500 uppercase mt-1 tracking-[2px]">{format(viewDate, 'MMMM yyyy')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center bg-white p-1 rounded-2xl border border-white/60 shadow-sm backdrop-blur-md">
            <button onClick={() => setViewDate(d => addDays(d, -1))} className="p-1.5 text-slate-500 hover:text-orange-500 transition-colors"><ChevronLeft size={18}/></button>
            <span className="px-5 text-[11px] font-black text-[#1B254B] uppercase tracking-[2px] min-w-[80px] text-center">
                {format(viewDate, 'MMM d').toUpperCase()}
            </span>
            <button onClick={() => setViewDate(d => addDays(d, 1))} className="p-1.5 text-slate-500 hover:text-orange-500 transition-colors"><ChevronRight size={18}/></button>
          </div>
          <button className="p-2.5 bg-white border border-white/60 rounded-xl text-slate-400 hover:text-orange-500 transition-all shadow-sm">
            <Calendar size={18} />
          </button>
          <button className="p-2.5 bg-white border border-white/60 rounded-xl text-slate-400 hover:text-orange-500 transition-all shadow-sm">
            <Maximize2 size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end shrink-0">
          <button 
            disabled={isLocked}
            onClick={markAllPresent}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all h-11 ${!isLocked ? 'bg-white text-slate-400 border border-white hover:bg-slate-50 hover:text-orange-500' : 'bg-white border-white text-slate-300 opacity-60 cursor-not-allowed'}`}
          >
            <Zap size={14} /> Mark All Present
          </button>
          
          {role === 'Admin' && (
            <button 
              onClick={() => onClearCategory?.(['Class'])}
              title="CLEAR ALL CLASS RECORDS"
              className="w-11 h-11 bg-rose-50 text-rose-500 border border-rose-100 rounded-xl flex items-center justify-center shadow-lg hover:bg-rose-500 hover:text-white transition-all"
            >
              <AlertCircle size={20} />
            </button>
          )}

          <button onClick={() => setIsFrozen(!isFrozen)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black uppercase text-[9px] transition-all border backdrop-blur-md ${isFrozen ? 'bg-amber-500/80 text-white border-amber-600 shadow-md' : 'bg-white/10 text-slate-900 border-white/20 hover:bg-white/20'}`}>
            {isFrozen ? <Lock size={12}/> : <Unlock size={12}/>} {isFrozen ? 'FROZEN' : 'FREEZE'}
          </button>

          <div className="flex items-center gap-1.5 p-1 bg-white/20 rounded-xl border border-white/10 backdrop-blur-md">
            <button 
              onClick={() => {
                const dayKeys = Array.from({ length: daysInMonth }, (_, i) => `${monthKey}-${String(i + 1).padStart(2, '0')}`);
                const exportData = filteredStudents.map((s, i) => {
                  const row: any = { '#': i + 1, 'Student Name': s.name, 'Teacher': s.teachers || '', 'Level': s.level || '', 'Time': s.time || '', 'Assistant': s.assistant || '' };
                  dayKeys.forEach((dk, di) => {
                    const status = data.attendance[s.id]?.[dk];
                    row[di + 1] = status === 0 ? 'P' : status === 0.25 ? 'L' : status === 1 ? 'A' : status === 2 ? 'AP' : status === 3 ? 'AW' : '';
                  });
                  return row;
                });
                exportToExcel(exportData, `Attendance_${monthKey}`);
              }}
              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" 
              title="Export Excel"
            >
              <FileSpreadsheet size={18} />
            </button>
            <button 
                onClick={() => {
                  const dayKeys = Array.from({ length: daysInMonth }, (_, i) => `${monthKey}-${String(i + 1).padStart(2, '0')}`);
                  const exportData = filteredStudents.map((s, i) => {
                    const row: any = { '#': i + 1, 'Student Name': s.name, 'Teacher': s.teachers || '', 'Assistant': s.assistant || '' };
                    dayKeys.forEach((dk, di) => {
                      const status = data.attendance[s.id]?.[dk];
                      row[di + 1] = status === 0 ? 'P' : status === 0.25 ? 'L' : status === 1 ? 'A' : status === 2 ? 'AP' : status === 3 ? 'AW' : '-';
                    });
                    return row;
                  });
                  exportToWord(exportData, `Attendance_${monthKey}`, 'ATTENDANCE LOG');
                }}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
                title="Export Word"
            >
              <FileText size={18} />
            </button>
          </div>

          {selectedIds.size > 0 && (
            <button 
              onClick={() => {
                if (confirm(`Delete ${selectedIds.size} selected records?`)) {
                  onDeleteStudent?.(Array.from(selectedIds), true);
                  setSelectedIds(new Set());
                }
              }}
              className="px-4 h-11 bg-red-500 text-white rounded-xl flex items-center gap-2 shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all font-black uppercase text-[10px] tracking-widest"
            >
              <Trash2 size={16} /> Delete ({selectedIds.size})
            </button>
          )}

          <button 
            onClick={() => onAddStudent({ category: 'Class' })}
            className="w-11 h-11 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-xl shadow-orange-500/30 hover:bg-orange-600 active:scale-95 transition-all"
          >
            <Plus size={24} strokeWidth={4} />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="w-full basis-full flex items-center gap-3 pt-4 border-t border-slate-300/30 overflow-x-auto no-scrollbar pointer-events-auto shrink-0 relative flex-wrap">
              <div className="relative w-64 shrink-0">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                      type="text" 
                      placeholder="Search spreadsheet..." 
                      className="w-full h-9 pl-9 pr-3 bg-white border border-white/80 rounded-2xl shadow-sm text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
                      value={localSearch}
                      onChange={e => setLocalSearch(e.target.value)}
                  />
              </div>

              <div className="flex items-center gap-2 shrink-0 border-l border-slate-300/30 pl-4">
                  <div className="relative group">
                      <LayoutGrid size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select value={filters.teacher || ''} onChange={e => setFilters && setFilters({...filters, teacher: e.target.value})} className={filterSelectStyle}>
                          <option value="">Teachers</option>
                          {uniqueTeachers.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                  </div>
                  <div className="relative group">
                      <LayoutGrid size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select value={filters.assistant || ''} onChange={e => setFilters && setFilters({...filters, assistant: e.target.value})} className={filterSelectStyle}>
                          <option value="">Assistants</option>
                          {uniqueAssistants.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                  </div>
                  <div className="relative group">
                      <LayoutGrid size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select value={filters.behavior || ''} onChange={e => setFilters && setFilters({...filters, behavior: e.target.value})} className={filterSelectStyle}>
                          <option value="">Behaviors</option>
                          {uniqueBehaviors.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                  </div>
                  <div className="relative group">
                      <LayoutGrid size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select value={filters.level || ''} onChange={e => setFilters && setFilters({...filters, level: e.target.value})} className={filterSelectStyle}>
                          <option value="">All Levels</option>
                          {uniqueLevels.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                  </div>
                  <div className="relative group">
                      <LayoutGrid size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select value={filters.time || ''} onChange={e => setFilters && setFilters({...filters, time: e.target.value})} className={filterSelectStyle}>
                          <option value="">All Times</option>
                          {uniqueTimes.map(tm => <option key={tm} value={tm}>{tm}</option>)}
                      </select>
                  </div>

                  <button onClick={resetFilters} className="p-2 ml-1 bg-white/50 border border-slate-300/30 text-slate-800 hover:bg-slate-300/50 rounded-xl transition-all backdrop-blur-md shadow-sm" title="Clear Filters">
                      <Trash2 size={16} />
                  </button>
              </div>
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="flex-1 bg-white/[0.02] backdrop-blur-[2px] rounded-[40px] shadow-2xl shadow-indigo-900/10 border border-white/5 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full border-collapse table-fixed min-w-[1200px]">
            <thead className="sticky top-0 z-40 bg-white/[0.02] backdrop-blur-[2px] border-b border-white/5">
              <tr>
                <th 
                  className={`px-4 py-4 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest border-r border-slate-100 cursor-pointer hover:bg-slate-50 transition-all group sticky top-0 z-50 ${isFrozen ? 'bg-white/95 shadow-[4px_0_10px_rgba(0,0,0,0.1)] left-0' : 'bg-white/80'}`}
                  style={{ width: studentNameWidth, left: isFrozen ? 0 : undefined }}
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center justify-between">
                    Student Name
                    <ArrowUpDown size={10} className={`${sortConfig?.key === 'name' ? 'opacity-100 text-primary-500' : 'opacity-20 group-hover:opacity-100'} transition-opacity`} />
                  </div>
                  <div onMouseDown={onResizeStart} onTouchStart={onResizeStart} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary-400 opacity-0 group-hover:opacity-100 transition-opacity z-50" />
                </th>
                <th className={`w-10 h-10 border-r border-white/5 sticky top-0 bg-white/[0.02] backdrop-blur-[2px] text-center z-40`} style={{ width: CHECKBOX_WIDTH }}>
                  <button 
                    onClick={() => setSelectedIds(selectedIds.size === filteredStudents.length ? new Set() : new Set(filteredStudents.map(s => s.id)))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-black/5 rounded-md"
                  >
                      {selectedIds.size > 0 ? <CheckSquare size={16} className="text-orange-500" /> : <Square size={16} className="text-slate-900/30" />}
                  </button>
                </th>
                <th 
                  className={`px-4 py-4 text-center text-[10px] font-black uppercase text-slate-900 border-r border-white/5 sticky top-0 bg-white/[0.02] backdrop-blur-[2px] z-40`}
                  style={{ width: NUMBER_WIDTH }}
                >
                  #
                </th>
                <Th label="Teacher" colId="teachers" width={160} />
                <Th label="Level" colId="level" width={100} />
                <Th label="Time" colId="time" width={140} />
                <Th label="Assistant" colId="assistant" width={150} />
                
                {/* Numeric Date Columns */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                   <th 
                    key={day}
                    onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), day))}
                    className={`text-center text-[10px] font-black w-12 border-r border-slate-100 cursor-pointer transition-colors ${parseInt(dayDisplay) === day ? 'bg-orange-50/50 text-orange-600 border-b-2 border-b-orange-400' : 'text-slate-400 hover:bg-slate-50'}`}
                   >
                     {day}
                   </th>
                ))}
                
                <th className="px-4 py-4 text-center text-[10px] font-black uppercase text-slate-400 w-24 border-l border-slate-100 shadow-[-2px_0_4px_rgba(0,0,0,0.02)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentViewStudents.map((s, idx) => (
                <AttendanceRow
                  key={s.id}
                  s={s}
                  idx={idx}
                  daysInMonth={daysInMonth}
                  monthKey={monthKey}
                  attendance={data.attendance[s.id] || {}}
                  isFrozen={isFrozen}
                  studentNameWidth={studentNameWidth}
                  settings={settings}
                  isCurrentDay={(day: number) => parseInt(dayDisplay) === day}
                  cycleStatus={cycleStatus}
                  onUpdate={onUpdate}
                  data={data}
                  students={students}
                  getTeacherColor={getTeacherColor}
                  getAssistantColor={getAssistantColor}
                  selectedIds={selectedIds}
                  setSelectedIds={setSelectedIds}
                />
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="sticky bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 flex items-center justify-between z-[70] no-print px-10">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Show</span>
                  <select 
                    value={pageSize} 
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold outline-none"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">per page</span>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === 1 ? 'bg-slate-50 text-slate-300' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`}
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-slate-900 tracking-tighter">Page</span>
                    <input 
                      type="number" 
                      min={1} 
                      max={totalPages} 
                      value={currentPage}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val >= 1 && val <= totalPages) setCurrentPage(val);
                      }}
                      className="w-12 h-8 bg-white border border-slate-200 rounded-lg text-center text-xs font-black outline-none"
                    />
                    <span className="text-[11px] font-black text-slate-400 tracking-tighter">of {totalPages}</span>
                  </div>

                  <button 
                     disabled={currentPage === totalPages}
                     onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                     className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === totalPages ? 'bg-slate-50 text-slate-300' : 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 hover:scale-105'}`}
                  >
                    Next
                  </button>
                </div>

                <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                  Showing {(currentPage-1)*pageSize + 1} to {Math.min(currentPage*pageSize, deferredStudents.length)} {deferredStudents.length} Students
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};