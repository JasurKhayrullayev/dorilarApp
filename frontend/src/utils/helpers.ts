/** 1 234 567 → "1 234 567 so'm" */
export function fmtSum(val: string | number | null | undefined, currency = true): string {
  if (val === null || val === undefined || val === "") return "—";
  const n = Number(val);
  if (isNaN(n)) return String(val);
  const parts = n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
  return currency ? `${parts} so'm` : parts;
}

/** ISO date string → "18.05.2026 14:30" */
export function fmtDate(val: string | null | undefined, withTime = true): string {
  if (!val) return "—";
  try {
    const d = new Date(val);
    const date = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
    if (!withTime) return date;
    return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return val;
  }
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  created:   { label: "Yaratilgan",   color: "#64748b" },
  sent:      { label: "Yuborilgan",   color: "#0d9488" },
  partial:   { label: "Qisman",       color: "#d97706" },
  sold:      { label: "Sotildi",      color: "#16a34a" },
  cancelled: { label: "Bekor",        color: "#dc2626" },
  to_doctor:     { label: "Vrachga",        color: "#0d9488" },
  repeat_rx:     { label: "Takroriy rx",    color: "#6366f1" },
  callback:      { label: "Qayta qo'ng'iroq", color: "#d97706" },
  refused:       { label: "Rad etdi",       color: "#dc2626" },
  no_answer:     { label: "Javob yo'q",     color: "#64748b" },
  wrong_number:  { label: "Noto'g'ri raqam",color: "#b45309" },
  in:        { label: "Kirim",   color: "#16a34a" },
  out:       { label: "Chiqim",  color: "#dc2626" },
  return:    { label: "Qaytarish", color: "#d97706" },
  write_off: { label: "Hisobdan",  color: "#64748b" },
  percent:      { label: "Foizli",  color: "#6366f1" },
  one_plus_one: { label: "1+1",     color: "#0d9488" },
  bundle:       { label: "To'plam", color: "#d97706" },
  loyal:        { label: "Takroriy xaridor", color: "#16a34a" },
};

export function statusInfo(key: string): { label: string; color: string } {
  return STATUS_MAP[key] ?? { label: key, color: "#64748b" };
}
