// French dictionaries, one file per area of the application (English source string → French). One French translation per
// key across the files (src/i18n/completeness.test.ts checks it). The strings of Norma's common block, « My tasks » and « My
// approvals » come with their French from the charter (TACHES_FR of norma/charte/ds/taches-fr.ts, COQUE.md § 2 bis.1).
import { TACHES_FR } from '@norma/charte/ds/taches-fr';
import auth from './auth.json';
import shell from './shell.json';
import ingenium from './ingenium.json';
import register from './register.json';

const FILES: Record<string, Record<string, string>> = { auth, shell, ingenium, register };

export const FR_FILES = FILES;
/** The charter's French entries that differ from their English (a word that reads the same is left to the identity). */
export const FR_CHARTER: Record<string, string> = Object.fromEntries(Object.entries(TACHES_FR).filter(([en, fr]) => en !== fr));
export const FR_DICT: Record<string, string> = Object.assign({}, FR_CHARTER, ...Object.values(FILES));
