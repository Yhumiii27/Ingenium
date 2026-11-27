// "View as" personas of the demo mode: one fictitious person per Ingenium role (no real person; e-mail domain demo.example).
import type { RoleKey } from '@/config/roles';

export const DEMO_PERSONAS: readonly { role: RoleKey; name: string; email: string }[] = [
  { role: 'engineering_lead', name: 'Marc Lenoir', email: 'marc.lenoir@demo.example' },
  { role: 'engineer', name: 'Claire Renaud', email: 'claire.renaud@demo.example' },
  { role: 'designer', name: 'Julien Faure', email: 'julien.faure@demo.example' },
  { role: 'document_controller', name: 'Camille Arnaud', email: 'camille.arnaud@demo.example' },
  { role: 'reader', name: 'Anne Duval', email: 'anne.duval@demo.example' },
  { role: 'admin', name: 'Paul Vasseur', email: 'paul.vasseur@demo.example' },
];

/** Other people of the demonstration teams (no role of their own in "View as"). */
export const DEMO_COLLEAGUES: readonly { name: string; email: string }[] = [
  { name: 'Inès Barbier', email: 'ines.barbier@demo.example' },
  { name: 'Hugo Lemaire', email: 'hugo.lemaire@demo.example' },
];
