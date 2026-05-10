
export const normalizeBehavior = (b: string | undefined): string => {
  if (!b) return '';
  const v = b.trim().toUpperCase();
  
  // No Homework group
  if ([
    'MISSED HW', 'MISS HOMEWORK', 'NO HW', 'NO HOMEWORK', 
    'MISSED HOMEWORK', 'MISS HW', 'FORGOT HOMEWORK',
    'MISSED HOME WORK', 'NO HOME WORK'
  ].includes(v)) return 'NO HOMEWORK';
  
  // Telegram group
  if ([
    'NO TELEGRAM', 'NO TELEGRAM HW', 'NO TELEGRAM HOMEWORK', 
    'NO READ TELEGRAM', 'NO TG', 'NO TELEGRAM HW', 'NO TELEGRAM HW.'
  ].includes(v)) return 'NO TELEGRAM';
  
  // Punishment group
  if ([
    'MISS PUNISHMENT', 'MISSED PUNISHMENT', 'INCOMPLETE PUNISHMENT',
    'NO PUNISHMENT'
  ].includes(v)) return 'MISSED PUNISHMENT';
  
  // Incomplete Homework group
  if ([
    'IC HW', 'IC HOMEWORK', 'INCOMPLETE HOMEWORK', 'INC HW', 'INC HOMEWORK',
    'INC HOME WORK', 'INCOMPLETE HOME WORK', 'INCOMPLETE ASSIGNMENT', 'INC ASSIGNMENT'
  ].includes(v)) return 'INCOMPLETE HOMEWORK';

  // Speak Khmer group
  if (v === 'SPEAK KHMER' || v === 'SPEAKING KHMER') return 'SPEAK KHMER';
  
  return v;
};
