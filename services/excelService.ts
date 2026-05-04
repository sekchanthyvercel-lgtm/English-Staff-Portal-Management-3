import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Student, AppData } from '../types';

export const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
  saveAs(dataBlob, `${fileName}_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
};

export const exportToWord = (data: any[], fileName: string, title: string) => {
  const headers = data.length > 0 ? Object.keys(data[0]) : [];
  const content = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${title}</title>
      <style>
        body { font-family: 'Inter', sans-serif; }
        h1 { color: #f97316; font-size: 18pt; text-align: center; margin-bottom: 20px; text-transform: uppercase; }
        table { border-collapse: collapse; width: 100%; border: 1px solid #e2e8f0; }
        th { background-color: #f8fafc; color: #1e293b; font-weight: bold; border: 1px solid #e2e8f0; padding: 10px; font-size: 10pt; text-transform: uppercase; }
        td { border: 1px solid #e2e8f0; padding: 8px; font-size: 9pt; color: #475569; }
        tr:nth-child(even) { background-color: #f1f5f9; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${data.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
  const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
  saveAs(blob, `${fileName}_${new Date().toLocaleDateString().replace(/\//g, '-')}.doc`);
};

export const exportFullBackup = (data: AppData) => {
  const workbook = XLSX.utils.book_new();
  
  // Sheet 1: All Active Students
  const activeStudents = (data.students || []).filter(s => !s.deletedAt);
  const studentData = activeStudents.map(s => ({
    'Name': s.name || '',
    'Category': s.category || '',
    'Teachers': s.teachers || s.teacher || '',
    'Assistant': s.assistant || '',
    'Level': s.level || '',
    'Behavior': s.behavior || '',
    'Time': s.time || '',
    'Schedule': s.schedule || '',
    'Start Date': s.startDate || '',
    'Deadline': s.deadline || ''
  }));
  const studentSheet = XLSX.utils.json_to_sheet(studentData);
  XLSX.utils.book_append_sheet(workbook, studentSheet, 'Students');

  // Sheet 2: Staff Directory
  if (data.staffDirectory) {
    const staffData = Object.entries(data.staffDirectory).map(([name, info]) => ({
      'Name': name,
      'Phone': info.phone || '',
      'Telegram': info.telegram || ''
    }));
    const staffSheet = XLSX.utils.json_to_sheet(staffData);
    XLSX.utils.book_append_sheet(workbook, staffSheet, 'Staff');
  }

  // Sheet 3: Finance
  const financeStudents = activeStudents.filter(s => s.category === 'Office');
  const financeData = financeStudents.map(s => ({
    'Student Name': s.name,
    'Level': s.level,
    'Price': s.price || 0,
    'Discount': s.discount || 0,
    'Remaining': s.remaining || 0,
    'Total Paid': s.totalPaid || 0,
    'Status': s.paymentStatus || 'Pending'
  }));
  const financeSheet = XLSX.utils.json_to_sheet(financeData);
  XLSX.utils.book_append_sheet(workbook, financeSheet, 'Finance');

  // Sheet 4: Daily Tasks
  if (data.dailyTasks) {
    const tasksData: any[] = [];
    Object.entries(data.dailyTasks).forEach(([date, shifts]) => {
      Object.entries(shifts).forEach(([shiftId, status]) => {
        tasksData.push({
          'Date': date,
          'Task ID': shiftId,
          'Status': status
        });
      });
    });
    if (tasksData.length > 0) {
      const taskSheet = XLSX.utils.json_to_sheet(tasksData);
      XLSX.utils.book_append_sheet(workbook, taskSheet, 'DailyTasks');
    }
  }

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
  saveAs(dataBlob, `DPS_Full_Export_${new Date().toLocaleDateString()}.xlsx`);
};

export const importFromExcel = async (file: File): Promise<Partial<Student>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        const mappedData = jsonData.map(row => ({
          name: row['Name'] || row['Student Name'] || '',
          teachers: row['Teachers'] || '',
          assistant: row['Assistant'] || '',
          level: row['Level'] || '',
          behavior: row['Behavior'] || '',
          time: row['Time'] || '',
          schedule: row['Schedule'] || '',
          startDate: row['Start Date'] || '',
          deadline: row['Deadline'] || ''
        }));
        
        resolve(mappedData);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};
