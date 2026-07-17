export interface ExtractedContacts {
  telegram: string[];
  email: string[];
  whatsapp: string[];
  phone: string[];
}

const TELEGRAM_PATTERNS = [
  /(?:@|t\.me\/)([\w]{3,})/gi,
  /(?:телеграм|telegram|tg)[\s:]*@?([\w]{3,})/gi,
];

const EMAIL_PATTERN = /[a-zа-я0-9._%+-]+@[a-zа-я0-9.-]+\.[a-zа-я]{2,}/gi;

const WHATSAPP_PATTERNS = [
  /(?:whatsapp|wa\.me|ватсап|ватсапп)[\s:]*(?:\+?\d[\d\s\-()]{6,})/gi,
  /wa\.me\/(\d{10,})/gi,
];

const PHONE_PATTERN = /(?:\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g;

function uniqueMatches(text: string, patterns: RegExp[]): string[] {
  const results = new Set<string>();
  for (const pattern of patterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      const value = (match[1] || match[0]).trim();
      if (value.length >= 3) results.add(value);
    }
  }
  return [...results];
}

export function extractContacts(text: string): ExtractedContacts {
  if (!text) return { telegram: [], email: [], whatsapp: [], phone: [] };

  return {
    telegram: uniqueMatches(text, TELEGRAM_PATTERNS),
    email: [...new Set(text.match(EMAIL_PATTERN) || [])],
    whatsapp: uniqueMatches(text, WHATSAPP_PATTERNS),
    phone: [...new Set(text.match(PHONE_PATTERN) || [])],
  };
}

export function hasAnyContact(text: string): boolean {
  if (!text) return false;
  const c = extractContacts(text);
  return c.telegram.length + c.email.length + c.whatsapp.length + c.phone.length > 0;
}

export function formatContacts(c: ExtractedContacts): string[] {
  const parts: string[] = [];
  for (const t of c.telegram) parts.push(`@${t.replace(/^@/, "")}`);
  for (const e of c.email) parts.push(e);
  for (const w of c.whatsapp) parts.push(`WhatsApp: ${w}`);
  for (const p of c.phone) parts.push(p);
  return parts;
}
