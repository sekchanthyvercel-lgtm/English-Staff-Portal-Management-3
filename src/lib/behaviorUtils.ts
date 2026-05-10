
export const normalizeBehavior = (b: string | undefined): string => {
  if (!b) return '';
  const v = b.trim().toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,!]$/g, ''); // Remove trailing punctuation
  
  // No Homework group
  if ([
    'MISSED HW', 'MISS HOMEWORK', 'NO HW', 'NO HOMEWORK', 
    'MISSED HOMEWORK', 'MISS HW', 'FORGOT HOMEWORK',
    'MISSED HOME WORK', 'NO HOME WORK', 'NO HW.', 'NO HW',
    'MIS HW', 'MISSED HW'
  ].includes(v) || v.includes('NO HW') || v.includes('NO HOMEWORK')) return 'NO HOMEWORK';
  
  // Telegram group
  if ([
    'NO TELEGRAM', 'NO TELEGRAM HW', 'NO TELEGRAM HOMEWORK', 
    'NO READ TELEGRAM', 'NO TG', 'NO TELEGRAM HW', 'NO TELEGRAM HW.'
  ].includes(v) || (v.includes('TELEGRAM') && (v.includes('NO') || v.includes('MISS')))) return 'NO TELEGRAM';
  
  // Punishment group
  if ([
    'MISS PUNISHMENT', 'MISSED PUNISHMENT', 'INCOMPLETE PUNISHMENT',
    'NO PUNISHMENT'
  ].includes(v) || v.includes('PUNISHMENT')) return 'MISSED PUNISHMENT';
  
  // Incomplete Homework group
  if ([
    'IC HW', 'IC HOMEWORK', 'INCOMPLETE HOMEWORK', 'INC HW', 'INC HOMEWORK',
    'INC HOME WORK', 'INCOMPLETE HOME WORK', 'INCOMPLETE ASSIGNMENT', 'INC ASSIGNMENT',
    'INC HW.', 'INC HW', 'INC. HW'
  ].includes(v) || (v.startsWith('INC') && (v.includes('HW') || v.includes('HOMEWORK'))) || v.startsWith('INCOMPLETE')) return 'INCOMPLETE HOMEWORK';

  // Speak Khmer group
  if (v === 'SPEAK KHMER' || v === 'SPEAKING KHMER' || v.includes('SPEAK KHMER')) return 'SPEAK KHMER';
  
  return v;
};
