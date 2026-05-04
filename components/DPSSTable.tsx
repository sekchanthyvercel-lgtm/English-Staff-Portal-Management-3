import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    Plus, Trash2, Calendar, AlignLeft, AlignCenter, AlignRight, Highlighter, Type, Settings2, MousePointer2, Minus, Layout, Square, Quote,
    FileSpreadsheet, FileText
} from 'lucide-react';
import { AppData, DPSSTopic } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { exportToExcel, exportToWord } from '../services/excelService';

interface DPSSTableProps {
  data: AppData;
  onUpdate: (data: AppData) => void;
}

const DPSSTable: React.FC<DPSSTableProps> = ({ data, onUpdate }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return 260;
    return 300;
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);
  const [pickerPos, setPickerPos] = useState<{ x: number, y: number } | null>(null);
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const skipNextRender = useRef(false);
  const lastContentRef = useRef<string | null>(null);
  const savedRange = useRef<Range | null>(null);
  const resizingRef = useRef<{ startX: number; startWidth: number } | null>(null);
  
  const topics = useMemo(() => (data.dpssTopics || []).map(t => ({
    ...t,
    content: typeof t.content === 'string' ? t.content : '',
    alignment: t.alignment || 'left',
    children: t.children || []
  })), [data.dpssTopics]);

  const findTopic = (items: DPSSTopic[], id: string): DPSSTopic | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findTopic(item.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedTopic = useMemo(() => selectedTopicId ? findTopic(topics, selectedTopicId) : null, [topics, selectedTopicId]);

  // Initialize content when topic changes
  useEffect(() => {
    if (selectedTopic && editorRef.current) {
        if (selectedTopic.content !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = selectedTopic.content;
            lastContentRef.current = selectedTopic.content;
            
            // Ensure we scroll to top when changing topics
            if (editorRef.current.parentElement) {
                editorRef.current.parentElement.scrollTop = 0;
            }
        }
    }
  }, [selectedTopicId, selectedTopic?.id]);

  const handleEditorScroll = (e: React.WheelEvent) => {
    // Ensuring smooth scroll bubble
    if (editorRef.current) {
        // e.stopPropagation();
    }
  };

  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = { startX: e.clientX, startWidth: sidebarWidth };
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeEnd);
  };

  const onResizeMove = (e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { startX, startWidth } = resizingRef.current;
    const diff = e.clientX - startX;
    setSidebarWidth(Math.max(200, Math.min(600, startWidth + diff)));
  };

  const onResizeEnd = () => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeEnd);
  };
  
  const colors = [
    { name: 'Yellow', value: '#fef3c7' },
    { name: 'Green', value: '#dcfce7' },
    { name: 'Blue', value: '#dbeafe' },
    { name: 'Pink', value: '#fce7f3' },
    { name: 'Orange', value: '#ffedd5' },
    { name: 'Clear', value: 'transparent' }
  ];

  const fontFamilies = [
    { name: 'Modern (Hall Study)', value: 'Inter' },
    { name: 'Display (DPSS)', value: 'Space Grotesk' },
    { name: 'Elegant', value: 'Playfair Display' },
    { name: 'Technical', value: 'JetBrains Mono' },
    { name: 'Handwritten', value: 'cursive' }
  ];
  
  const dpssSettings = data.settings || { fontSize: 18, fontFamily: 'Inter' };

  const handleSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      
      // Ensure the selection is within our editor
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        // AUTO-APPLY if a color is picked first from toolbar
        if (activeColor) {
           applyColor(activeColor, true);
           return;
        }

        savedRange.current = range.cloneRange();
        const rect = range.getBoundingClientRect();
        setPickerPos({
          x: rect.left + rect.width / 2,
          y: rect.top - 50
        });
      }
    } else {
      // Don't clear immediately if we're clicking the picker
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
           setPickerPos(null);
        }
      }, 100);
    }
  };

  const applyColor = (color: string, selectionProvided: boolean = false) => {
    const selection = window.getSelection();
    if (!selection) return;

    if (!selectionProvided) {
      if (!savedRange.current) return;
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
    }
    
    if (color === 'transparent') {
      document.execCommand('removeFormat', false, undefined);
    } else {
      document.execCommand('backColor', false, color);
    }
    
    // Cleanup
    if (!selectionProvided) {
      selection.removeAllRanges();
      savedRange.current = null;
      setPickerPos(null);
    }
  };

  const updateGlobalSettings = (updates: any) => {
    onUpdate({
      ...data,
      settings: { ...dpssSettings, ...updates }
    });
  };

  const addTopic = (parentId?: string) => {
    const newTopicId = uuidv4();
    const newTopic: DPSSTopic = { id: newTopicId, title: 'New Topic', content: '', alignment: 'left' };
    const updateTopics = (items: DPSSTopic[]): DPSSTopic[] => {
      if (!parentId) return [...items, newTopic];
      return items.map(item => {
        if (item.id === parentId) return { ...item, children: [...(item.children || []), newTopic] };
        if (item.children) return { ...item, children: updateTopics(item.children) };
        return item;
      });
    };
    onUpdate({ ...data, dpssTopics: updateTopics(topics) });
    setSelectedTopicId(newTopicId);
    if (window.innerWidth < 768) {
        setIsSidebarOpen(false); // Close sidebar on mobile after adding to show content
    }
  };

  const deleteTopic = (id: string) => {
    if (confirm('Are you sure you want to delete this topic?')) {
      const filterTopics = (items: DPSSTopic[]): DPSSTopic[] => {
        return items.filter(item => item.id !== id).map(item => ({
          ...item,
          children: item.children ? filterTopics(item.children) : undefined
        }));
      };
      onUpdate({ ...data, dpssTopics: filterTopics(topics) });
      setSelectedTopicId(null);
    }
  };

  const updateTopic = (id: string, updates: Partial<DPSSTopic>) => {
    if (updates.content !== undefined) {
      skipNextRender.current = true;
    }
    const updateItems = (items: DPSSTopic[]): DPSSTopic[] => {
      return items.map(item => {
        if (item.id === id) return { ...item, ...updates };
        if (item.children) return { ...item, children: updateItems(item.children) };
        return item;
      });
    };
    onUpdate({ ...data, dpssTopics: updateItems(topics) });
  };

  const insertDate = () => {
    if (!selectedTopic) return;
    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formattedDate = `<div style="color: #f59e0b; font-weight: 800; font-size: 1.2em; border-left: 4px solid #f59e0b; padding-left: 12px; margin: 10px 0;">${dateStr}</div>`;
    updateTopic(selectedTopic.id, { content: formattedDate + selectedTopic.content });
  };

  const renderTopic = (topic: DPSSTopic, depth = 0) => (
    <div key={topic.id} style={{ marginLeft: `${depth * 15}px` }}>
      <div onClick={() => {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) return;
        setSelectedTopicId(topic.id);
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
      }} className={`p-4 my-2 rounded-2xl cursor-pointer flex items-center justify-between group transition-all duration-300 ${selectedTopicId === topic.id ? 'bg-orange-500 text-white shadow-[0_8px_20px_rgba(249,115,22,0.3)] scale-[1.02]' : 'bg-white/40 hover:bg-white/60 text-slate-700'}`}>
        <span className={`font-black text-xs uppercase tracking-tight truncate flex-1 ${selectedTopicId === topic.id ? 'text-white' : 'text-slate-700'}`}>{topic.title}</span>
        <div className='flex gap-1 shrink-0 ml-2'>
            <button 
              onClick={(e) => { e.stopPropagation(); addTopic(topic.id); }}
              className={`p-2 rounded-lg transition-colors ${selectedTopicId === topic.id ? 'hover:bg-white/20 text-white' : 'hover:bg-orange-50 text-orange-500'}`}
            >
              <Plus size={16} strokeWidth={3}/>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); deleteTopic(topic.id); }}
              className={`p-2 rounded-lg transition-colors ${selectedTopicId === topic.id ? 'hover:bg-white/20 text-white' : 'hover:bg-red-50 text-red-500'}`}
            >
              <Trash2 size={16} strokeWidth={3}/>
            </button>
        </div>
      </div>
      {topic.children?.map(child => renderTopic(child, depth + 1))}
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-120px)] p-2 gap-4 relative overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-[90]"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Toggle Button (Mobile) */}
      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="md:hidden fixed left-6 top-6 z-[100] w-12 h-12 bg-white text-slate-800 rounded-2xl flex items-center justify-center shadow-2xl border border-slate-100 active:scale-95 transition-all"
        >
          <AlignLeft size={24} />
        </button>
      )}

      {/* Resizable Sidebar with Fonts */}
      <div 
        style={{ 
          width: isSidebarOpen ? (typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : `${sidebarWidth}px`) : '0px',
          maxWidth: typeof window !== 'undefined' && window.innerWidth < 768 ? '85%' : '600px',
          opacity: isSidebarOpen ? 1 : 0,
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
        className={`bg-white/95 backdrop-blur-xl rounded-[32px] border border-white/50 flex flex-col gap-4 overflow-hidden fixed md:relative left-2 top-2 bottom-2 md:left-0 md:top-0 md:bottom-0 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] z-[100] md:z-40 shadow-2xl md:shadow-none ${!isSidebarOpen ? 'pointer-events-none' : ''}`}
      >
        <div className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Learning
                <div className="p-1.5 bg-orange-500 text-white rounded-lg md:hidden" onClick={() => setIsSidebarOpen(false)}>
                   <Minus size={14} />
                </div>
              </h2>
              <span className="text-[10px] text-orange-500 font-black uppercase tracking-widest mt-1">Catalog View</span>
            </div>
            <span className="text-[10px] bg-slate-900 text-white px-3 py-1 rounded-full font-black uppercase tracking-widest">DPSS</span>
          </div>

          <button onClick={() => addTopic()} className="w-full py-4 bg-gradient-to-br from-orange-400 to-orange-600 text-white rounded-[20px] text-xs font-black flex items-center justify-center gap-3 hover:brightness-110 shadow-xl shadow-orange-200 transition-all mt-6 active:scale-[0.98]">
            <Plus size={18} strokeWidth={3} /> ADD NEW TOPIC
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1 custom-scrollbar">
            {topics.length > 0 ? (
              topics.map(t => renderTopic(t))
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-slate-300 text-center px-6">
                <Minus size={24} className="opacity-20 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No entries found</p>
              </div>
            )}
        </div>

        {/* Resize Handle (Desktop Only) */}
        <div 
          onMouseDown={onResizeStart}
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-orange-500/20 active:bg-orange-500/40 transition-colors z-[110] hidden md:flex items-center justify-center"
        >
            <div className="w-0.5 h-12 bg-slate-200 rounded-full opacity-0 group-hover/sidebar:opacity-100 transition-opacity" />
        </div>
      </div>
      
      {/* Editor Area */}
      <div className="flex-1 min-w-0 bg-white/40 backdrop-blur-md rounded-[40px] border border-white/60 relative flex flex-col overflow-hidden shadow-sm">
        {/* Desktop Sidebar Toggle Toggle Button Overhanging */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute left-0 top-6 -translate-x-1/2 z-50 w-10 h-10 bg-white border border-slate-100 rounded-full shadow-xl flex items-center justify-center text-slate-400 hover:text-orange-500 transition-all hidden md:flex group"
        >
          <div className={`transition-transform duration-500 ${isSidebarOpen ? 'rotate-180' : 'rotate-0'}`}>
            <AlignLeft size={18} strokeWidth={3} />
          </div>
        </button>

        {selectedTopic ? (
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-8 pb-4 bg-white/20">
                   <div className="max-w-6xl mx-auto w-full">
                      <input 
                          value={selectedTopic.title} 
                          onChange={(e) => updateTopic(selectedTopic.id, { title: e.target.value })}
                          className="w-full text-4xl md:text-6xl font-black text-[#1B254B] bg-transparent outline-none py-2 border-b-8 border-orange-500/20 focus:border-orange-500 transition-all uppercase tracking-tighter placeholder:text-slate-200"
                          placeholder="Untitled Topic..."
                      />
                   </div>
                </div>
                
                <div className='sticky top-0 z-[60] bg-white/60 backdrop-blur-2xl border-b border-white/40'>
                  <div className="max-w-6xl mx-auto w-full px-6 py-4 flex flex-wrap gap-4 items-center">
                    <div className="flex gap-1.5 bg-slate-900/5 p-1 rounded-xl">
                      <button className={`p-2 rounded-lg transition-all ${selectedTopic.alignment === 'left' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-400 hover:text-slate-600'}`} title="Align Left" onClick={() => updateTopic(selectedTopic.id, { alignment: 'left' })}><AlignLeft size={18} /></button>
                      <button className={`p-2 rounded-lg transition-all ${selectedTopic.alignment === 'center' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-400 hover:text-slate-600'}`} title="Align Center" onClick={() => updateTopic(selectedTopic.id, { alignment: 'center' })}><AlignCenter size={18} /></button>
                      <button className={`p-2 rounded-lg transition-all ${selectedTopic.alignment === 'right' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-400 hover:text-slate-600'}`} title="Align Right" onClick={() => updateTopic(selectedTopic.id, { alignment: 'right' })}><AlignRight size={18} /></button>
                    </div>

                    <div className="flex gap-1.5 bg-slate-900/5 p-1 rounded-xl">
                      <button 
                        className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-500" 
                        title="Export Word"
                        onClick={() => {
                            const exportData = topics.map(t => ({
                              'Topic': t.title,
                              'Content': (t.content || '').replace(/<[^>]*>?/gm, '')
                            }));
                            exportToWord(exportData, 'DPSS_Learning', 'DPSS LEARNING CATALOG');
                        }}
                      >
                        <FileText size={18} />
                      </button>
                      <button 
                        className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-500" 
                        title="Export Excel"
                        onClick={() => {
                            const exportData = topics.map(t => ({
                                'Topic': t.title,
                                'Content': (t.content || '').replace(/<[^>]*>?/gm, '')
                            }));
                            exportToExcel(exportData, 'DPSS_Learning');
                        }}
                      >
                        <FileSpreadsheet size={18} />
                      </button>
                    </div>

                    <div className="flex gap-1.5 bg-slate-900/5 p-1 rounded-xl">
                      <button 
                        className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-500" 
                        title="Add Box"
                        onClick={() => {
                          const html = `<div style="border: 2px solid #e2e8f0; padding: 24px; border-radius: 24px; margin: 20px 0; background: rgba(255,255,255,0.5); box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">Box Content...</div><p><br></p>`;
                          document.execCommand('insertHTML', false, html);
                        }}
                      >
                        <Square size={18} />
                      </button>
                      
                      <button 
                        className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-500" 
                        title="Add Callout"
                        onClick={() => {
                          const html = `<div style="background: rgba(248,250,252,0.8); border-left: 8px solid #f97316; padding: 20px; border-radius: 12px; margin: 20px 0; font-style: italic; color: #334155; font-size: 1.1em; line-height: 1.6;">Important insight here...</div><p><br></p>`;
                          document.execCommand('insertHTML', false, html);
                        }}
                      >
                        <Quote size={18} />
                      </button>

                      <button 
                        className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-500" 
                        title="Add 2-Column Grid"
                        onClick={() => {
                          const html = `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0;"><div style="border: 1px dashed #cbd5e1; padding: 20px; border-radius: 16px;">Column 1</div><div style="border: 1px dashed #cbd5e1; padding: 20px; border-radius: 16px;">Column 2</div></div><p><br></p>`;
                          document.execCommand('insertHTML', false, html);
                        }}
                      >
                        <Layout size={18} />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 bg-white/80 p-1.5 px-4 rounded-xl border border-slate-100 shadow-sm transition-all ml-auto md:ml-0">
                      <Highlighter size={16} className={activeColor ? 'text-orange-500' : 'text-slate-400'} />
                      <div className="flex gap-2">
                        {colors.map(c => (
                          <button
                            key={c.value}
                            onClick={() => setActiveColor(activeColor === c.value ? null : c.value)}
                            className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-125 shadow-sm ${activeColor === c.value ? 'border-orange-500 scale-125 ring-2 ring-orange-200' : 'border-white'}`}
                            style={{ backgroundColor: c.value === 'transparent' ? '#f8fafc' : c.value }}
                            title={c.name}
                          >
                            {c.value === 'transparent' && <span className="text-[10px] font-black opacity-20">✕</span>}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button onClick={insertDate} className="ml-auto w-full md:w-auto flex items-center justify-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl transition-all active:scale-95">
                      <Calendar size={18} strokeWidth={3} /> INSERT DATE
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-transparent">
                  <div className="max-w-6xl mx-auto w-full min-h-full flex flex-col">
                    {/* Floating Selection Tooltip */}
                    {pickerPos && (
                      <div 
                        className="fixed z-[100] bg-white/95 backdrop-blur-xl p-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white flex gap-3 animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300"
                        style={{ 
                          left: pickerPos.x, 
                          top: pickerPos.y, 
                          transform: 'translateX(-50%)' 
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {colors.map(color => (
                            <button 
                                key={color.value}
                                className={`w-8 h-8 rounded-full border border-black/5 hover:scale-125 transition-all shadow-sm ${color.value === 'transparent' ? 'bg-slate-50 flex items-center justify-center' : ''}`}
                                style={{ backgroundColor: color.value }}
                                onClick={() => applyColor(color.value)}
                                title={color.name}
                            >
                              {color.value === 'transparent' && <Trash2 size={12} className="opacity-40" />}
                            </button>
                        ))}
                      </div>
                    )}

                    <div 
                        ref={editorRef}
                        contentEditable={true}
                        onMouseUp={handleSelection}
                        onKeyUp={handleSelection}
                        onBlur={(e) => {
                          const newContent = e.currentTarget.innerHTML;
                          if (newContent !== lastContentRef.current) {
                            updateTopic(selectedTopic.id, { content: newContent });
                            lastContentRef.current = newContent;
                          }
                        }}
                        onInput={(e) => {
                            const newContent = e.currentTarget.innerHTML;
                            lastContentRef.current = newContent;
                        }}
                        style={{ 
                          textAlign: selectedTopic.alignment as any, 
                          minHeight: '80vh',
                          fontSize: `${dpssSettings.fontSize}px`,
                          fontFamily: dpssSettings.fontFamily,
                          userSelect: 'text'
                        }}
                        className="w-full h-full outline-none p-10 md:p-16 rounded-[40px] text-slate-800 leading-[1.8] font-medium selection:bg-orange-200"
                    />
                  </div>
                </div>
            </div>
        ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-700">
               <div className="relative mb-12">
                  <div className="w-32 h-32 bg-gradient-to-br from-white/60 to-white/20 rounded-[48px] border border-white/50 backdrop-blur-xl flex items-center justify-center shadow-2xl animate-pulse">
                    <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <MousePointer2 size={40} className="text-slate-300 drop-shadow-lg" />
                  </div>
               </div>
               <h2 className="text-2xl md:text-3xl font-black text-[#1B254B] uppercase tracking-[8px] mb-4">
                 CURRICULUM EMPTY
               </h2>
               <p className="max-w-md text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed">
                 Select a learning module from the side catalog to begin your mastery advancement
               </p>
               <button 
                 onClick={() => setIsSidebarOpen(true)}
                 className="mt-12 px-8 py-4 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-[3px] hover:bg-orange-500 transition-all shadow-2xl active:scale-95"
               >
                 Open Learning Catalog
               </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default DPSSTable;

