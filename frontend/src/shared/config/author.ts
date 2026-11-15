/**
 * author and contact details in the footer
 */
export interface ContactLink {
  id: 'github' | 'linkedin' | 'email' | 'whatsapp';
  label: string;
  // shown on hover and to screen readers
  description: string;
  href: string;
}
export const author = {
  name: 'Mohammad Niudanri',
  // shown next to the name in the footer; keep it short, it sits on one line
  tagline: 'Builds things for fun, one cup of coffee at a time',

  // repository that holds both the service and this console
  repositoryUrl: 'https://github.com/mniudanri/zip-codec',
} as const;

/**
 * builds a WhatsApp deep link
 */
export function whatsappLink(internationalDigits: string, message?: string): string {
  const base = `https://wa.me/${internationalDigits.replace(/\D/g, '')}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * public contact channels
 */
export const contactLinks: readonly ContactLink[] = [
  {
    id: 'github',
    label: 'GitHub',
    description: 'Source code and projects',
    href: 'https://github.com/mniudanri',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    description: 'Linkedin platform',
    href: 'https://www.linkedin.com/in/mohammad-niudanri-732b06131',
  },
  {
    id: 'email',
    label: 'Email',
    description: 'niduanri12@gmail.com',
    href: 'mailto:niudanri12@gmail.com',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    description: 'WA Chat',
    href: whatsappLink('+6289620143582', 'Hello!'),
  },
];