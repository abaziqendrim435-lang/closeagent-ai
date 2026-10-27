// Minimal RFC-4180 CSV parsing/serialization (no dependency).

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [",", ";", "\t"].sort(
    (a, b) => firstLine.split(b).length - firstLine.split(a).length,
  )[0];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim()));
}

const ALIASES: Record<string, string[]> = {
  name: ["name", "full_name", "fullname", "contact", "contact_name"],
  company: ["company", "company_name", "organization", "organisation", "channel", "business"],
  email: ["email", "target_email", "email_address", "work_email"],
  website: ["website", "url", "domain", "company_website", "site", "channel_url"],
  title: ["title", "job_title", "position", "role"],
  notes: ["notes", "note", "context", "description", "about", "snippet"],
};

export interface CsvLead {
  name: string;
  company: string;
  email: string;
  website: string;
  title: string;
  notes: string;
}

export function csvToLeads(text: string, limit = 200): CsvLead[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
  const index: Partial<Record<keyof CsvLead, number>> = {};
  for (const [field, aliases] of Object.entries(ALIASES)) {
    const i = header.findIndex((h) => aliases.includes(h));
    if (i >= 0) index[field as keyof CsvLead] = i;
  }
  const get = (r: string[], f: keyof CsvLead) => (index[f] !== undefined ? (r[index[f]!] ?? "").trim() : "");
  return rows
    .slice(1)
    .map((r) => ({
      name: get(r, "name"),
      company: get(r, "company"),
      email: get(r, "email"),
      website: get(r, "website"),
      title: get(r, "title"),
      notes: get(r, "notes"),
    }))
    .filter((l) => l.name || l.company || l.email)
    .slice(0, limit);
}

export function toCsv(rows: Array<Record<string, unknown>>, columns: string[]): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(","), ...rows.map((r) => columns.map((c) => esc(r[c])).join(","))].join("\n");
}
