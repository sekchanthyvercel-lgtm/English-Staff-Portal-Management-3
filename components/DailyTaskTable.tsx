import React, { useState, useMemo, useEffect } from 'react';
import { 
  ClipboardList, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  FilterX,
  Plus,
  Zap,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MoreVertical,
  Trash2,
  Trash,
  LayoutGrid,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  Lock,
  Unlock,
  Clock,
  ArrowUpDown,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { exportToExcel, exportToWord } from '../services/excelService';
import { 
  format, 
  addDays, 
  startOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  addWeeks, 
  subWeeks 
} from 'date-fns';
import { normalizeBehavior } from '../src/lib/behaviorUtils';
import { Student, AppData, FilterState, Tab, UserRole, AppSettings } from '../types';

const MultilineInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}> = ({ value, onChange, className, style, placeholder }) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '0px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = scrollHeight + 'px';
    }
  }, [localValue]);

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={localValue}
      placeholder={placeholder}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleBlur();
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      className={className}
      style={{ ...style, resize: 'none', overflow: 'hidden', display: 'block' }}
    />
  );
};

interface DailyTaskTableProps {
  students: Student[];
  data: AppData;
  filters: FilterState;
  setFilters?: (f: FilterState) => void;
  uniqueTeachers?: string[];
  uniqueAssistants?: string[];
  uniqueLevels?: string[];
  uniqueTimes?: string[];
  uniqueBehaviors?: string[];
  onUpdate: (data: AppData) => void;
  onAddStudent: (defaults: Partial<Student>) => void;
  onDeleteStudent?: (ids: string | string[], skipConfirm?: boolean) => void;
  role: UserRole;
  onClearCategory?: (categories: string[]) => void;
  settings?: AppSettings;
}

const DailyTaskRow = React.memo(({ 
    s, idx, days, isFrozen, studentNameWidth, CHECKBOX_WIDTH, NUMBER_WIDTH, selectedIds, setSelectedIds, updateField, removeEntry, 
    getRowBg, getLevelBorderColor, getTaskStatusIcon
}: any) => {
    const rowBg = getRowBg(s.assistant);
    return (
        <tr className={`h-12 transition-all hover:brightness-95 group ${rowBg} ${s.isHidden ? 'opacity-30' : ''}`}>
            <td className={`px-6 border-r border-white/5 sticky z-30 transition-all ${isFrozen ? 'shadow-[4px_0_10px_rgba(0,0,0,0.05)] bg-white left-0' : 'bg-inherit'}`} style={{ width: studentNameWidth, left: isFrozen ? 0 : undefined }}>
                <div className="flex items-center gap-3 min-h-[44px]" style={{ backgroundColor: isFrozen ? 'white' : 'transparent' }}>
                    <div className={`w-1 h-8 rounded-full ${getLevelBorderColor(s.level).replace('border-l-', 'bg-')}`} />
                    <MultilineInput 
                        value={s.name} 
                        onChange={val => updateField(s.id, 'name', val)}
                        className="w-full bg-transparent font-black text-slate-900 text-xs outline-none"
                        style={{ color: '#0f172a' }}
                    />
                </div>
            </td>
            <td className="text-center border-r border-white/5 bg-inherit" style={{ width: CHECKBOX_WIDTH }}>
                <div className="min-h-[44px] flex items-center justify-center">
                    <button onClick={() => { const ns = new Set(selectedIds); ns.has(s.id) ? ns.delete(s.id) : ns.add(s.id); setSelectedIds(ns); }}>
                        {selectedIds.has(s.id) ? <CheckSquare size={14} className="text-orange-500" /> : <Square size={14} className="text-slate-400/30" />}
                    </button>
                </div>
            </td>
            <td className="text-center font-bold text-[10px] text-indigo-900/60 border-r border-white/5 bg-inherit" style={{ width: NUMBER_WIDTH }}>
                <div className="min-h-[44px] flex items-center justify-center">
                    {idx + 1}
                </div>
            </td>
            <td className="border-r border-white/5 px-2">
                <select 
                    value={s.priority || 'MEDIUM'} 
                    onChange={e => updateField(s.id, 'priority', e.target.value)}
                    className="w-full h-8 bg-orange-500/10 text-orange-600 rounded-lg text-[9px] font-black text-center appearance-none cursor-pointer outline-none transition-all hover:bg-orange-500/20"
                >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                </select>
            </td>
            <td className="border-r border-white/5">
                <MultilineInput 
                    value={s.energy || '1A + (5.1)'} 
                    onChange={val => updateField(s.id, 'energy', val)}
                    className="w-full h-8 px-2 bg-transparent text-[10px] font-bold text-slate-600 text-center outline-none"
                />
            </td>
            <td className="border-r border-white/5 px-2">
                <select 
                    value={s.phase || 'MORNING'} 
                    onChange={e => updateField(s.id, 'phase', e.target.value)}
                    className="w-full h-8 bg-emerald-500/10 text-emerald-600 rounded-lg text-[9px] font-black text-center appearance-none cursor-pointer outline-none transition-all hover:bg-emerald-500/20"
                >
                    <option value="MORNING">MORNING</option>
                    <option value="AFTERNOON">AFTERNOON</option>
                    <option value="EVENING">EVENING</option>
                </select>
            </td>
            <td className="border-r border-white/5">
                <MultilineInput 
                    value={s.domain || 'LITE'} 
                    onChange={val => updateField(s.id, 'domain', val)}
                    className="w-full h-8 px-2 bg-transparent text-[10px] font-bold text-slate-500 text-center uppercase outline-none"
                />
            </td>
            <td className="border-r border-white/5">
                <MultilineInput 
                    value={s.context || 'SCHOOL'} 
                    onChange={val => updateField(s.id, 'context', val)}
                    className="w-full h-8 px-2 bg-transparent text-[10px] font-bold text-slate-500 text-center uppercase outline-none"
                />
            </td>
            <td className="border-r border-white/5">
                <MultilineInput 
                    value={s.deadline || ''} 
                    onChange={val => updateField(s.id, 'deadline', val)}
                    className="w-full h-8 px-2 bg-transparent text-[10px] font-bold text-slate-400 text-center outline-none"
                />
            </td>
            
            {days.map((day: any) => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const taskS1 = s.dailyTasks?.[dayKey]?.slot1;
                const taskS2 = s.dailyTasks?.[dayKey]?.slot2;

                return (
                    <td key={day.toString()} className="border-r border-white/5 p-0 bg-inherit">
                        <div className="flex divide-x divide-white/5 h-12">
                            <div 
                                onClick={() => {
                                    const next = taskS1 === 'DONE' ? 'MISSED' : taskS1 === 'MISSED' ? undefined : 'DONE';
                                    const dt = { ...(s.dailyTasks || {}), [dayKey]: { ...(s.dailyTasks?.[dayKey] || {}), slot1: next } };
                                    updateField(s.id, 'dailyTasks', dt);
                                }}
                                className="flex-1 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors"
                            >
                                {getTaskStatusIcon(taskS1)}
                            </div>
                            <div 
                                onClick={() => {
                                    const next = taskS2 === 'DONE' ? 'MISSED' : taskS2 === 'MISSED' ? undefined : 'DONE';
                                    const dt = { ...(s.dailyTasks || {}), [dayKey]: { ...(s.dailyTasks?.[dayKey] || {}), slot2: next } };
                                    updateField(s.id, 'dailyTasks', dt);
                                }}
                                className="flex-1 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors"
                            >
                                {getTaskStatusIcon(taskS2)}
                            </div>
                        </div>
                    </td>
                );
            })}
            <td className="text-center sticky right-0 bg-white/10 backdrop-blur-md border-l border-white/5">
                <div className="flex items-center justify-center min-h-[44px] gap-2">
                    <button onClick={() => updateField(s.id, 'isHidden', !s.isHidden)} className={`p-1 text-slate-400 hover:text-indigo-600 ${s.isHidden ? 'text-indigo-600' : ''}`}>
                        {s.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button onClick={() => removeEntry(s.id)} className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={14} />
                    </button>
                </div>
            </td>
        </tr>
    );
}, (prev, next) => {
    return prev.s.id === next.s.id && 
           prev.s.isHidden === next.s.isHidden &&
           prev.s.name === next.s.name &&
           prev.s.priority === next.s.priority &&
           prev.s.energy === next.s.energy &&
           prev.s.phase === next.s.phase &&
           prev.s.domain === next.s.domain &&
           prev.s.context === next.s.context &&
           prev.s.deadline === next.s.deadline &&
           JSON.stringify(prev.s.dailyTasks) === JSON.stringify(next.s.dailyTasks) &&
           prev.isFrozen === next.isFrozen &&
           prev.studentNameWidth === next.studentNameWidth &&
           prev.selectedIds === next.selectedIds;
});

export const DailyTaskTable: React.FC<DailyTaskTableProps> = ({
  students,
  data,
  filters,
  setFilters,
  uniqueTeachers = [],
  uniqueAssistants = [],
  uniqueLevels = [],
  uniqueTimes = [],
  uniqueBehaviors = [],
  onUpdate,
  onAddStudent,
  onDeleteStudent,
  role,
  onClearCategory,
  settings
}) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isFrozen, setIsFrozen] = useState(true);
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

  const [studentNameWidth, setStudentNameWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dps_studentNameWidth');
      if (saved) return parseInt(saved, 10);
      return window.innerWidth < 768 ? 120 : 180;
    }
    return 180;
  });

  const NUMBER_WIDTH = 40;
  const CHECKBOX_WIDTH = 40;
  const NAME_START = 0;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dps_studentNameWidth', studentNameWidth.toString());
    }
  }, [studentNameWidth]);

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

  // Week Interval
  const weekStart = startOfWeek(viewDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = addDays(weekStart, 4); // Friday
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const filteredStudents = useMemo(() => {
    let result = students.filter(s => {
      const query = (filters.searchQuery || '').toLowerCase();
      const matchesSearch = !query || 
                           (s.name || '').toLowerCase().includes(query) || 
                           (s.level || '').toLowerCase().includes(query) ||
                           (s.behavior || '').toLowerCase().includes(query) ||
                           (s.time2 || '').toLowerCase().includes(query) ||
                           (s.shift || '').toLowerCase().includes(query) ||
                           (s.teachers || '').toLowerCase().includes(query) ||
                           (s.assistant || '').toLowerCase().includes(query) ||
                           (s.time || '').toLowerCase().includes(query);
      if (!matchesSearch) return false;
      
      const teacherMatch = !filters.teacher || (s.teachers && s.teachers.toUpperCase().includes(filters.teacher.toUpperCase()));
      const assistantMatch = !filters.assistant || (s.assistant && s.assistant.toUpperCase().includes(filters.assistant.toUpperCase()));
      const levelMatch = !filters.level || (s.level && s.level.toUpperCase().includes(filters.level.toUpperCase()));
      
      const behaviorMatch = !filters.behavior || 
        normalizeBehavior(String(s.behavior || '')) === normalizeBehavior(filters.behavior);
      
      const timeMatch = !filters.time || 
        (s.time && s.time.toUpperCase().includes(filters.time.toUpperCase())) || 
        (s.time2 && s.time2.toUpperCase().includes(filters.time.toUpperCase())) ||
        (s.shift && s.shift.toUpperCase().includes(filters.time.toUpperCase()));
      
      return (s.category === 'DailyTask' || (s.shift && !s.category)) && 
             teacherMatch && assistantMatch && levelMatch && behaviorMatch && timeMatch &&
             (filters.showHidden || !s.isHidden);
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const valA = String(a[sortConfig.key as keyof Student] || '').toLowerCase();
        const valB = String(b[sortConfig.key as keyof Student] || '').toLowerCase();
        return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    } else {
      result.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return result;
  }, [students, filters, sortConfig]);

  const toggleTask = (studentId: string, date: Date, taskSlot: 1 | 2) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const newTasks = { ...(data.dailyTasks || {}) };
    const studentTasks = { ...(newTasks[studentId] || {}) };
    const taskKey = `${dateKey}_${taskSlot}`;
    
    const current = studentTasks[taskKey];
    let next: string | undefined;
    
    if (current === 'Done') next = 'Not Yet';
    else if (current === 'Not Yet') next = undefined;
    else next = 'Done';

    if (next === undefined) {
      delete studentTasks[taskKey];
    } else {
      studentTasks[taskKey] = next;
    }

    newTasks[studentId] = studentTasks;
    onUpdate({ ...data, dailyTasks: newTasks });
  };

  const getLevelBorderColor = (level?: string) => {
    if (!level) return 'border-transparent';
    const l = level.toUpperCase();
    if (l.includes('1A')) return 'border-l-purple-500';
    if (l.includes('1B')) return 'border-l-orange-500';
    if (l.includes('2A')) return 'border-l-amber-500';
    if (l.includes('2B')) return 'border-l-teal-500';
    if (l.includes('3A')) return 'border-l-indigo-500';
    if (l.includes('3B')) return 'border-l-violet-500';
    if (l.includes('4A')) return 'border-l-emerald-500';
    return 'border-l-transparent';
  };

  const getStatusColor = (status?: string) => {
    if (status === 'Done') return 'bg-emerald-500 text-white';
    if (status === 'Not Yet') return 'bg-orange-500 text-white';
    return 'bg-slate-50 text-slate-300';
  };

  const getStatusIcon = (status?: string) => {
    if (status === 'Done') return <CheckCircle2 size={12} />;
    if (status === 'Not Yet') return <XCircle size={12} />;
    return null;
  };

  const getRowBg = (assistantName?: string) => {
    if (!assistantName) return 'bg-slate-50 border-white/5';
    const colors = [
      'bg-emerald-400/10',
      'bg-amber-400/10',
      'bg-indigo-400/10',
      'bg-rose-400/10',
      'bg-violet-400/10',
      'bg-teal-400/10',
      'bg-orange-400/10'
    ];
    let hash = 0;
    for (let i = 0; i < assistantName.length; i++) {
        hash = assistantName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const isoToDisplay = (iso: string) => {
      if (!iso) return '';
      const [y, m, d] = iso.split('-');
      return `${d}/${m}/${y.slice(2)}`;
  };

  const displayToIso = (display: string) => {
      if (!display || !display.includes('/')) return '';
      const [d, m, y] = display.split('/');
      return `20${y}-${m}-${d}`;
  };

  const updateField = (id: string, key: string, val: any) => {
    let updates: any = { [key]: val };
    
    // Auto-fill deadline if name is entered
    if (key === 'name' && val && !students.find(s => s.id === id)?.deadline) {
        updates.deadline = format(new Date(), 'dd/MM/yy');
    }

    onUpdate({
      ...data,
      students: students.map(s => s.id === id ? { ...s, ...updates } : s)
    });
  };

  const removeEntry = (id: string) => {
    onDeleteStudent?.(id);
  };

  const filterSelectStyle = "bg-white/80 border border-slate-300/30 rounded-xl pl-8 pr-3 py-1.5 text-[10px] font-black uppercase text-slate-800 outline-none shadow-sm transition-all focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 hover:bg-white cursor-pointer h-9 appearance-none";

  return (
    <div className="flex-1 flex flex-col bg-transparent overflow-hidden p-2 md:p-4 lg:p-6">
        {/* New Sophisticated Header */}
        <div className="bg-white/10 backdrop-blur-3xl rounded-[40px] p-8 mb-6 shadow-2xl border border-white/20">
            <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-500/30">
                        <ClipboardList size={28} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-950 uppercase tracking-tighter leading-none">Task Hub</h1>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="px-2 py-0.5 bg-orange-500 text-white text-[8px] font-black rounded-md uppercase tracking-wider">System Ready</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[3px]">Mission Control</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Efficiency</p>
                        <p className="text-2xl font-black text-slate-800">0%</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Velocity</p>
                        <p className="text-2xl font-black text-slate-800">0/0</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <button onClick={() => setIsFrozen(!isFrozen)} className={`flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-xl font-black uppercase text-[9px] transition-all border backdrop-blur-md ${isFrozen ? 'bg-amber-500/80 text-white border-amber-600 shadow-md' : 'bg-white/10 text-slate-900 border-white/20 hover:bg-white/20'}`}>
                        {isFrozen ? <Lock size={12}/> : <Unlock size={12}/>} {isFrozen ? 'FROZEN' : 'FREEZE'}
                      </button>

                      <div className="flex items-center gap-1.5 p-1 bg-white/10 rounded-xl border border-white/20 backdrop-blur-md">
                        <button 
                          onClick={() => {
                            const exportData = filteredStudents.map((s, i) => {
                              const row: any = { '#': i + 1, 'Student Name': s.name, 'Priority': s.priority || '', 'Deadline': s.deadline || '' };
                              days.forEach(day => {
                                const dk = format(day, 'yyyy-MM-dd');
                                row[`${format(day, 'EEE')} S1`] = data.dailyTasks?.[s.id]?.[`${dk}_1`] || '-';
                                row[`${format(day, 'EEE')} S2`] = data.dailyTasks?.[s.id]?.[`${dk}_2`] || '-';
                              });
                              return row;
                            });
                            exportToExcel(exportData, 'Task_Hub');
                          }}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" 
                          title="Export Excel"
                        >
                          <FileSpreadsheet size={18} />
                        </button>
                        <button 
                            onClick={() => {
                                const exportData = filteredStudents.map((s, i) => {
                                  const row: any = { '#': i + 1, 'Student Name': s.name, 'Priority': s.priority || '', 'Deadline': s.deadline || '' };
                                  return row;
                                });
                                exportToWord(exportData, 'Task_Hub', 'TASK HUB LOG');
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
                            title="Export Word"
                        >
                          <FileText size={18} />
                        </button>
                      </div>

                      <button className="flex items-center gap-2 h-9 px-4 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all">
                        <Zap size={14} fill="currentColor" /> Strategic Plan
                      </button>
                      <button onClick={() => onAddStudent({ category: 'DailyTask', shift: 'Morning' })} className="flex items-center gap-2 h-9 px-4 bg-orange-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-orange-600 transition-all">
                        <Plus size={14} strokeWidth={4} /> Add New Topic
                      </button>
                    </div>
                </div>
            </div>

                {/* Second Row: Navigation and View Switch */}
                <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
                    <div className="flex items-center gap-1 bg-white/20 p-1 rounded-xl border border-white/10 backdrop-blur-md">
                        {['Daily', 'Weekly', 'Calendar'].map((view) => (
                            <button 
                                key={view}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${view === 'Weekly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                {view}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => setViewDate(subWeeks(viewDate, 1))} className="p-2 bg-white/40 rounded-xl hover:bg-white/60 transition-all border border-white/10">
                            <ChevronLeft size={16} />
                        </button>
                        <div className="px-6 py-2 bg-white/40 rounded-xl border border-white/10 font-black text-[11px] text-slate-800 uppercase tracking-widest min-w-[180px] text-center">
                            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
                        </div>
                        <button onClick={() => setViewDate(addWeeks(viewDate, 1))} className="p-2 bg-white/40 rounded-xl hover:bg-white/60 transition-all border border-white/10">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative group min-w-[200px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                            <input 
                                type="text"
                                placeholder="Search tasks..."
                                value={localSearch}
                                onChange={e => setLocalSearch(e.target.value)}
                                className="w-full h-11 pl-10 pr-4 bg-white/40 backdrop-blur-md border border-white/20 rounded-xl text-[11px] font-black uppercase text-slate-800 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 shadow-md placeholder:text-slate-400"
                            />
                        </div>
                        
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pointer-events-auto shrink-0 relative">
                            <div className="relative group">
                                <LayoutGrid size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                                <select 
                                    value={filters.teacher || ''} 
                                    onChange={e => setFilters?.({ ...filters, teacher: e.target.value })} 
                                    className={filterSelectStyle}
                                >
                                    <option value="">Teachers</option>
                                    {uniqueTeachers.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="relative group">
                                <LayoutGrid size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                                <select 
                                    value={filters.assistant || ''} 
                                    onChange={e => setFilters?.({ ...filters, assistant: e.target.value })} 
                                    className={filterSelectStyle}
                                >
                                    <option value="">Assistants</option>
                                    {uniqueAssistants.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                            <div className="relative group">
                                <LayoutGrid size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                                <select 
                                    value={filters.behavior || ''} 
                                    onChange={e => setFilters?.({ ...filters, behavior: e.target.value })} 
                                    className={filterSelectStyle}
                                >
                                    <option value="">Behaviors</option>
                                    {uniqueBehaviors.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            <div className="relative group">
                                <LayoutGrid size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                                <select 
                                    value={filters.level || ''} 
                                    onChange={e => setFilters?.({ ...filters, level: e.target.value })} 
                                    className={filterSelectStyle}
                                >
                                    <option value="">Levels</option>
                                    {uniqueLevels.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                            <div className="relative group">
                                <LayoutGrid size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                                <select 
                                    value={filters.time || ''} 
                                    onChange={e => setFilters?.({ ...filters, time: e.target.value })} 
                                    className={filterSelectStyle}
                                >
                                    <option value="">Times</option>
                                    {uniqueTimes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>

                        <button 
                            onClick={() => setFilters?.({ searchQuery: '', teacher: '', assistant: '', time: '', level: '', behavior: '', deadline: '', showHidden: filters.showHidden })}
                            className="p-2.5 bg-white/40 rounded-xl hover:bg-white/60 transition-all border border-white/10 text-slate-600"
                            title="Reset Filters"
                        >
                             <FilterX size={18} />
                        </button>
                        <button 
                            onClick={() => onClearCategory?.(['DailyTask'])}
                            className="p-2.5 bg-white/40 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-white/10 text-slate-600"
                            title="Clear All"
                        >
                            <Trash2 size={18} />
                        </button>
                        {selectedIds.size > 0 && (
                            <button 
                                onClick={() => {
                                    if (confirm(`Move ${selectedIds.size} records to Recycle Bin?`)) {
                                        onDeleteStudent?.(Array.from(selectedIds), true);
                                        setSelectedIds(new Set());
                                    }
                                }}
                                className="px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black shadow-lg hover:bg-red-600 transition-all flex items-center gap-2"
                            >
                                <Trash size={14} /> DELETE ({selectedIds.size})
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Spreadsheet Content */}
            <div className="flex-1 bg-white/5 backdrop-blur-[2px] rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-white/10">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full border-collapse table-fixed min-w-[1500px]">
                        <thead className="sticky top-0 z-40 bg-white/10 backdrop-blur-md">
                            <tr className="border-b border-white/5 uppercase text-[9px] font-black text-slate-800">
                                <th 
                                    onClick={() => handleSort('name')}
                                    className={`px-6 py-5 text-left border-r border-white/5 sticky top-0 z-50 transition-all group cursor-pointer hover:bg-slate-50 ${isFrozen ? 'bg-white/95 shadow-[4px_0_10px_rgba(0,0,0,0.1)] left-0' : 'bg-white/80'}`} 
                                    style={{ width: studentNameWidth, left: isFrozen ? 0 : undefined }}
                                >
                                    <div className="flex items-center justify-between">
                                      STUDENT NAME
                                      <ArrowUpDown size={10} className={`${sortConfig?.key === 'name' ? 'opacity-100 text-orange-500' : 'opacity-20 group-hover:opacity-100'} transition-opacity`} />
                                    </div>
                                    <div onMouseDown={onResizeStart} onTouchStart={onResizeStart} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity z-50" />
                                </th>
                                <th className="w-10 py-5 text-center border-r border-white/5 sticky top-0 bg-white/[0.05] z-40" style={{ width: CHECKBOX_WIDTH }}>
                                  <div className="flex items-center justify-center">
                                    <button onClick={() => setSelectedIds(selectedIds.size === filteredStudents.length ? new Set() : new Set(filteredStudents.map(s => s.id)))}>
                                      {selectedIds.size > 0 ? <CheckSquare size={14} className="text-orange-500" /> : <Square size={14} className="text-slate-400" />}
                                    </button>
                                  </div>
                                </th>
                                <th className="w-10 py-5 text-center border-r border-white/5 sticky top-0 bg-white/[0.05] z-40" style={{ width: NUMBER_WIDTH }}>#</th>
                                <th className="w-28 py-5 text-center border-r border-white/5">Priority</th>
                                <th className="w-24 py-5 text-center border-r border-white/5">Energy</th>
                                <th className="w-28 py-5 text-center border-r border-white/5">Phase</th>
                                <th className="w-24 py-5 text-center border-r border-white/5">Domain</th>
                                <th className="w-24 py-5 text-center border-r border-white/5">Context</th>
                                <th className="w-32 py-5 text-center border-r border-white/5">Deadline</th>
                                
                                {days.map(day => (
                                    <th key={day.toString()} className="w-48 border-r border-white/5 p-0">
                                        <div className="text-center py-2 border-b border-white/5">
                                            <p className="text-[10px] font-black text-slate-800 tracking-tighter">{format(day, 'EEE').toUpperCase()}</p>
                                            <p className="text-[8px] font-bold text-slate-500">{format(day, 'MMM d')}</p>
                                        </div>
                                        <div className="flex divide-x divide-white/5 h-8">
                                            <div className="flex-1 text-[7px] font-black text-slate-400 flex items-center justify-center">Slot 01</div>
                                            <div className="flex-1 text-[7px] font-black text-slate-400 flex items-center justify-center">Slot 02</div>
                                        </div>
                                    </th>
                                ))}
                                <th className="w-16 py-5 text-center border-l border-white/5 sticky right-0 bg-white/10 z-40">X</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredStudents.map((s, idx) => (
                                <DailyTaskRow
                                    key={s.id}
                                    s={s}
                                    idx={idx}
                                    days={days}
                                    isFrozen={isFrozen}
                                    studentNameWidth={studentNameWidth}
                                    CHECKBOX_WIDTH={CHECKBOX_WIDTH}
                                    NUMBER_WIDTH={NUMBER_WIDTH}
                                    selectedIds={selectedIds}
                                    setSelectedIds={setSelectedIds}
                                    updateField={updateField}
                                    removeEntry={removeEntry}
                                    getRowBg={getRowBg}
                                    getLevelBorderColor={getLevelBorderColor}
                                    getTaskStatusIcon={getStatusIcon}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DailyTaskTable;
