'use client';
// Project switcher of the project section (like Keystone's): opens the same screen on another project of the viewer's scope.
import { useRouter } from 'next/navigation';

export function ProjectSwitcher({ current, path, options, label }: { current: string; path: string; options: { value: string; label: string }[]; label: string }) {
  const router = useRouter();
  return (
    <select className="input" aria-label={label} value={current} onChange={(e) => router.push(`/projects/${encodeURIComponent(e.target.value)}${path}`)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
