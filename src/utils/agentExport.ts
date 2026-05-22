import * as XLSX from 'xlsx';

interface AgentExportItem {
  firstName: string;
  lastName: string;
  isActive: boolean;
  agentCode: string;
  partner: {
    firstName: string;
    lastName: string;
    referralCode: string;
  };
}

export function exportAgentsToExcel(agents: AgentExportItem[]): void {
  const rows = agents
    .filter((a) => a.isActive)
    .map((a) => ({
      'Name': `${a.firstName} ${a.lastName}`,
      'Berater': `${a.partner.firstName} ${a.partner.lastName}`,
      'Link': `${window.location.origin}/?ref=${a.partner.referralCode}&agent=${a.agentCode}`,
    }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 70 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Agenten');

  const date = new Date();
  const dateToString = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
  XLSX.writeFile(workbook, `agenten-export-${dateToString}.xlsx`);
}
