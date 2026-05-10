import React, { useState, useMemo, useRef, useEffect } from 'react';
import { normalizeBehavior } from '../src/lib/behaviorUtils';
import { Student, AppData, StudyType } from '../types';
import { Search, ChevronLeft, ChevronRight, AlertCircle, Trash2, Lock, CheckSquare, Square, Trash, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';

const MultilineInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  readOnly?: boolean;
}> = ({ value, onChange, className, style, placeholder, readOnly }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '0px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.max(36, scrollHeight) + 'px';
    }
  }, [localValue]);

  const handleBlur = () => {
    if (!readOnly && localValue !== value) {
      onChange(localValue);
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={localValue}
      readOnly={readOnly}
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

interface Props {
  students: Student[];
  data: AppData; 
  onUpdate: (newData: AppData) => void; 
  onQuickAdd: (defaults: Partial<Student>) => void;
  onAddStudent: (defaults: Partial<Student>) => void;
  onDeleteStudent?: (ids: string | string[], skipConfirm?: boolean) => void;
  isLocked?: boolean;
  filters: any;
  setFilters: (f: any) => void;
}

const MONTHS = [
  { key: '01', label: 'JAN' }, { key: '02', label: 'FEB' }, { key: '03', label: 'MAR' },
  { key: '04', label: 'APR' }, { key: '05', label: 'MAY' }, { key: '06', label: 'JUN' },
  { key: '07', label: 'JUL' }, { key: '08', label: 'AUG' }, { key: '09', label: 'SEP' },
  { key: '10', label: 'OCT' }, { key: '11', label: 'NOV' }, { key: '12', label: 'DEC' },
];

const DEFAULT_WIDTHS = {
  no: 48, id: 128, name: 208, fee: 112, months: 64, act: 80
};

const FinanceRow = React.memo(({ 
    s, i, year, MONTHS, widths, DEFAULT_WIDTHS, isFrozen, isLocked, getRowBg, handleUpdate, students, selectedIds, setSelectedIds, renderInputCell 
}: any) => {
    return (
        <tr className={`hover:bg-white/20 group transition-colors ${getRowBg(i)}`}>
            <td className="p-2 text-center border-r border-white/5 w-10">
                <button onClick={() => { const ns = new Set(selectedIds); ns.has(s.id) ? ns.delete(s.id) : ns.add(s.id); setSelectedIds(ns); }}>
                    {selectedIds.has(s.id) ? <CheckSquare size={14} className="text-orange-500" /> : <Square size={14} className="text-slate-400/30" />}
                </button>
            </td>
            {renderInputCell(s, 'name', 'font-black text-slate-900 border-r border-white/5', false, undefined, isFrozen ? 0 : undefined)}
            <td className="p-2 text-center text-slate-500 bg-transparent text-[10px] border-r border-white/5 font-black" style={{ width: widths['no'] || DEFAULT_WIDTHS.no }}>{i + 1}</td>
            {renderInputCell(s, 'displayId', 'font-black text-slate-900 border-r border-white/5', false, undefined)}
            {renderInputCell(s, 'schoolFee', 'font-black text-emerald-700 text-center')}
            {MONTHS.map((m: any) => renderInputCell(s, `${year}-${m.key}`, `text-center font-black ${s.payments?.[`${year}-${m.key}`]?.toLowerCase() === 'paid' ? 'text-green-800' : 'text-emerald-800'}`, true, `${year}-${m.key}`))}
            <td className="p-1 text-center sticky right-0 bg-white/[0.02] backdrop-blur-[1px] border-l border-white/5">
                <button disabled={isLocked} onClick={() => { if (confirm('Permanently delete record?')) handleUpdate(students.filter((st: any) => st.id !== s.id)); }} className="p-2 text-slate-500 hover:text-red-500 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30"><Trash2 size={16}/></button>
            </td>
        </tr>
    );
}, (prev, next) => {
    return prev.s === next.s && 
           prev.i === next.i &&
           prev.year === next.year &&
           prev.isFrozen === next.isFrozen &&
           prev.isLocked === next.isLocked &&
           prev.selectedIds === next.selectedIds &&
           prev.widths === next.widths;
});

export const FinanceTable: React.FC<Props> = ({ students, data, onUpdate, onQuickAdd, onAddStudent, onDeleteStudent, isLocked = false, filters, setFilters }) => {
  const [activeTab, setActiveTab] = useState<StudyType>('PartTime');
  const [selectedClass] = useState<string>('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [showOnlyDue] = useState<boolean>(false);
  const [isFrozen, setIsFrozen] = useState(true);
  const [focusedCell, setFocusedCell] = useState<{ id: string; field: string } | null>(null);
  
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

  const [widths, setWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('dps_finance_widths');
    return saved ? JSON.parse(saved) : DEFAULT_WIDTHS;
  });

  useEffect(() => {
    localStorage.setItem('dps_finance_widths', JSON.stringify(widths));
  }, [widths]);

  const resizingRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);

  const onResizeStart = (col: string, e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = { col, startX: e.clientX, startWidth: widths[col] || (DEFAULT_WIDTHS as any)[col] || 64 };
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeEnd);
    document.body.style.cursor = 'col-resize';
  };

  const onResizeMove = (e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { col, startX, startWidth } = resizingRef.current;
    const diff = e.clientX - startX;
    setWidths(prev => ({ ...prev, [col]: Math.max(40, startWidth + diff) }));
  };

  const onResizeEnd = () => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeEnd);
    document.body.style.cursor = 'default';
  };

  const currentMonthKey = format(new Date(), 'MM');
  const currentPaymentKey = `${year}-${currentMonthKey}`;
  const todayDay = new Date().getDate();

  const isStudentDue = (s: Student) => {
      if (s.isHidden) return false;
      const status = s.payments?.[currentPaymentKey];
      const isPaid = status && (status.toLowerCase() === 'paid' || status === '16' || (!isNaN(Number(status)) && status !== ''));
      if (isPaid || status === 'ST' || status === 'SUS') return false;
      const startDay = parseInt((s.startDate || '').split('-')[0]); 
      return !isNaN(startDay) && todayDay >= startDay;
  };

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
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
        String(s.name || '').toLowerCase().includes(query) || 
        String(s.displayId || '').toLowerCase().includes(query) ||
        String(s.assistant || '').toLowerCase().includes(query) ||
        String(s.teachers || '').toLowerCase().includes(query) ||
        String(s.time2 || '').toLowerCase().includes(query) ||
        String(s.behavior || '').toLowerCase().includes(query) ||
        String(s.time || '').toLowerCase().includes(query) ||
        String(s.level || '').toLowerCase().includes(query);

      const matchesTeacher = !filters.teacher || 
          String(s.teachers || '').toUpperCase().includes(filters.teacher.toUpperCase());
          
      const matchesAssistant = !filters.assistant || 
          String(s.assistant || '').toUpperCase().includes(filters.assistant.toUpperCase());

      const behaviorMatch = !filters.behavior || 
        normalizeBehavior(String(s.behavior || '')) === normalizeBehavior(filters.behavior);

      return s.category === 'Office' &&
        (s.studyType || 'PartTime') === activeTab && 
        (!selectedClass || s.className === selectedClass) && 
        matchesSearch && 
        matchesTeacher &&
        matchesAssistant &&
        behaviorMatch &&
        (showOnlyDue ? isStudentDue(s) : true) &&
        (filters.showHidden || !s.isHidden);
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const valA = String((a as any)[sortConfig.key] || '').toLowerCase();
        const valB = String((b as any)[sortConfig.key] || '').toLowerCase();
        return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    } else {
      result.sort((a, b) => a.order - b.order);
    }
    return result;
  }, [students, activeTab, selectedClass, filters, showOnlyDue, year, sortConfig]);

  const deferredStudents = React.useDeferredValue(filteredStudents);
  const totalPages = Math.ceil(deferredStudents.length / pageSize);
  const currentViewStudents = deferredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.searchQuery, filters.teacher, filters.assistant, filters.time]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const getRowBg = (idx: number): string => {
    const colors = [
      'bg-emerald-400/5',
      'bg-emerald-400/5',
      'bg-amber-400/5',
      'bg-indigo-400/5',
      'bg-rose-400/5',
      'bg-violet-400/5',
      'bg-teal-400/5',
      'bg-orange-400/5'
    ];
    return colors[idx % colors.length];
  };

  const handleUpdate = (newStudents: Student[]) => {
      if (isLocked) return;
      onUpdate({ ...data, students: newStudents });
  };

  const renderInputCell = (s: Student, field: string, className: string, isPayment: boolean = false, paymentKey?: string, stickyLeft?: number) => {
    const val = isPayment ? (s.payments?.[paymentKey!] || '') : (s[field as keyof Student] as string);
    const fmt = s.formatting?.[field];

    return (
        <td 
            key={field}
            className={`p-0 border-r border-white/5 relative group/cell ${stickyLeft !== undefined ? 'sticky z-30' : ''}`} 
            style={{ left: stickyLeft }}
        >
            <div className="flex items-center min-h-[32px] w-full" style={{ backgroundColor: stickyLeft !== undefined ? 'white' : 'transparent' }}>
                <MultilineInput 
                    className={`w-full px-3 py-2 bg-transparent outline-none focus:bg-white/20 text-xs text-slate-900 ${isLocked ? 'cursor-not-allowed opacity-80' : ''} ${className}`} 
                    value={val} 
                readOnly={isLocked}
                style={{ fontWeight: fmt?.bold ? '900' : 'inherit', fontStyle: fmt?.italic ? 'italic' : 'normal' }}
                onChange={val => {
                    if (isPayment) {
                        const pmts = { ...(s.payments || {}), [paymentKey!]: val };
                        handleUpdate(students.map(st => st.id === s.id ? { ...st, payments: pmts } : st));
                    } else {
                        handleUpdate(students.map(st => st.id === s.id ? { ...st, [field]: val } : st));
                    }
                }}
            />
          </div>
        </td>
    );
  };

  const Th = ({ label, colId, width, stickyLeft, align = 'left', className = '' }: { label: string, colId: string, width: number, stickyLeft?: number, align?: string, className?: string }) => (
    <th 
      onClick={() => handleSort(colId)}
      className={`p-3 bg-white/5 border-r border-white/5 text-[10px] font-black uppercase text-slate-900 relative group backdrop-blur-md cursor-pointer hover:bg-slate-50 transition-colors ${stickyLeft !== undefined ? 'sticky z-50' : ''} ${className}`} 
      style={{ width, left: stickyLeft }}
    >
      <div className={`flex items-center justify-between`}>
        {label}
        <ArrowUpDown size={10} className={`${sortConfig?.key === colId ? 'opacity-100 text-orange-500' : 'opacity-20 group-hover:opacity-100'} transition-opacity`} />
      </div>
      <div onMouseDown={e => onResizeStart(colId, e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity z-10" />
    </th>
  );

  return (
    <div className={`flex flex-col h-full rounded-[40px] shadow-2xl shadow-indigo-900/10 border border-white/5 overflow-hidden relative ${isLocked ? 'bg-white/[0.01] backdrop-blur-[1px] grayscale-[0.3]' : 'bg-white/[0.01] backdrop-blur-[1px]'}`}>
      <div className={`p-4 border-b border-white/5 flex-none backdrop-blur-[1px] ${isLocked ? 'bg-white/[0.01]' : 'bg-white/[0.01]'}`}>
        <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-4">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${isLocked ? 'bg-red-500/80' : 'bg-orange-500/80'}`}>
                    {isLocked ? <Lock size={20} /> : <AlertCircle size={20} />}
                 </div>
                 <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase leading-none">Finance Module {isLocked && <span className="text-red-500 ml-2">(Locked)</span>}</h3>
                    <p className="text-[10px] font-black text-slate-700 uppercase mt-1 tracking-widest">Status: {isLocked ? 'Read-Only' : 'Active'}</p>
                 </div>
             </div>
             <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-xl px-2 py-1 shadow-sm backdrop-blur-[2px]">
                 <button onClick={() => setYear(y => y - 1)} className="p-1.5 text-slate-600 hover:text-slate-900"><ChevronLeft size={14}/></button>
                 <span className="font-black text-slate-900 mx-2 text-sm">{year}</span>
                 <button onClick={() => setYear(y => y + 1)} className="p-1.5 text-slate-600 hover:text-slate-900"><ChevronRight size={14}/></button>
             </div>
             <button 
                onClick={() => setIsFrozen(!isFrozen)} 
                className={`ml-4 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-lg border ${isFrozen ? 'bg-amber-500 text-white border-amber-600' : 'bg-white/40 text-slate-900 border-white/20'}`}
             >
                {isFrozen ? 'FROZEN' : 'FREEZE'}
             </button>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {['PartTime', 'FullTime', 'Khmer'].map(type => (
                <button key={type} onClick={() => setActiveTab(type as StudyType)} className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${activeTab === type ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:bg-white/40'}`}>{type}</button>
            ))}
        </div>
      </div>

      <div className="p-3 bg-white/[0.01] border-b border-white/5 flex items-center justify-between gap-4 backdrop-blur-[1px]">
          <div className="relative flex-1 max-w-sm">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
             <input 
                placeholder="Find student..." 
                value={localSearch} 
                onChange={e => setLocalSearch(e.target.value)} 
                className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-sm outline-none font-black text-slate-900 placeholder:text-slate-500" 
             />
          </div>
          <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                  <button 
                    disabled={isLocked}
                    onClick={() => {
                        if (confirm(`Move ${selectedIds.size} records to Recycle Bin?`)) {
                            onDeleteStudent?.(Array.from(selectedIds), true);
                            setSelectedIds(new Set());
                        }
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black shadow-lg hover:bg-red-600 transition-all flex items-center gap-2"
                  >
                      <Trash2 size={14} /> DELETE ({selectedIds.size})
                  </button>
              )}
              <button disabled={isLocked} onClick={() => onQuickAdd({ studyType: activeTab, className: selectedClass, category: 'Office' })} className="px-5 py-2 bg-orange-600/90 text-white rounded-xl text-xs font-black uppercase shadow-lg disabled:opacity-30 backdrop-blur-[2px]">AI Add</button>
              <button disabled={isLocked} onClick={() => onAddStudent({ studyType: activeTab, className: selectedClass, category: 'Office' })} className="px-5 py-2 bg-orange-500/90 text-white rounded-xl text-xs font-black uppercase shadow-lg disabled:opacity-30 backdrop-blur-[2px]">Add Record</button>
          </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar bg-transparent">
        <table className="w-full border-collapse relative bg-transparent min-w-max table-fixed">
          <thead className="sticky top-0 z-40 bg-white shadow-sm border-b border-white/5 backdrop-blur-md">
            <tr className="bg-transparent">
              <th className="p-3 bg-white/5 border-r border-white/5 w-10 text-center">
                 <button onClick={() => setSelectedIds(selectedIds.size === filteredStudents.length ? new Set() : new Set(filteredStudents.map(s => s.id)))}>
                     {selectedIds.size > 0 ? <CheckSquare size={14} className="text-orange-500" /> : <Square size={14} className="text-slate-400" />}
                 </button>
              </th>
              <Th 
                label="NAME" 
                colId="name" 
                width={widths['name'] || DEFAULT_WIDTHS.name} 
                stickyLeft={isFrozen ? 0 : undefined} 
                className={isFrozen ? 'bg-white/95 shadow-[4px_0_10px_rgba(0,0,0,0.1)]' : ''}
              />
              <Th label="#" colId="no" width={widths['no'] || DEFAULT_WIDTHS.no} align="center" />
              <Th label="ID NUMBER" colId="id" width={widths['id'] || DEFAULT_WIDTHS.id} />
              <Th label="TUITION FEE" colId="fee" width={widths['fee'] || DEFAULT_WIDTHS.fee} align="center" />
              {MONTHS.map(m => (
                <React.Fragment key={m.key}>
                  <Th label={m.label} colId="months" width={widths['months'] || DEFAULT_WIDTHS.months} align="center" />
                </React.Fragment>
              ))}
              <th className="p-3 text-center w-20 sticky right-0 bg-white/[0.02] z-40 uppercase text-[10px] font-black text-slate-900 border-l border-white/5 backdrop-blur-[1px]">ACT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
             {currentViewStudents.map((s, i) => (
                <FinanceRow
                  key={s.id}
                  s={s}
                  i={i}
                  year={year}
                  MONTHS={MONTHS}
                  widths={widths}
                  DEFAULT_WIDTHS={DEFAULT_WIDTHS}
                  isFrozen={isFrozen}
                  isLocked={isLocked}
                  getRowBg={getRowBg}
                  handleUpdate={handleUpdate}
                  students={students}
                  selectedIds={selectedIds}
                  setSelectedIds={setSelectedIds}
                  renderInputCell={renderInputCell}
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
  );
};