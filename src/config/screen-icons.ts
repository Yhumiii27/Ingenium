// Sidebar icons per screen (Phosphor). Kept apart from ./screens.ts so the registry imports no component. The common block's
// icons are Norma's (`BASE_ICONS` of @norma/charte/ds/BaseNav).
import type { Icon } from '@phosphor-icons/react';
import {
  ArrowsLeftRight, Book, Certificate, CheckSquare, Cpu, Drop, FileText, FolderUser, Gauge, Gear, GitDiff, House, Lightning, ListChecks,
  Package, PlugsConnected, Stack, Stamp, TreeStructure, UsersThree, Wrench, FlowArrow, ShieldCheck, DownloadSimple, Blueprint,
} from '@phosphor-icons/react/dist/ssr';
import type { ScreenId } from './screens';

export const SCREEN_ICONS: Record<ScreenId, Icon> = {
  home: House, tasks: CheckSquare, approvals: Stamp, myProjects: FolderUser, reference: Gear,
  projectSummary: Gauge, process: Drop, mechanical: Wrench, electrical: Lightning, automation: Cpu, pid: FlowArrow, bom: TreeStructure,
  interfaces: ArrowsLeftRight, pack: Package, ceFile: Certificate,
  parts: Stack, structures: TreeStructure, spares: Wrench, drawings: Blueprint, changes: GitDiff,
  disciplines: UsersThree, rules: ShieldCheck, importTools: DownloadSimple, packTemplates: ListChecks, ceLists: FileText, activity: PlugsConnected,
  journal: Book,
};
