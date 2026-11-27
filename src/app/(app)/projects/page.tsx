// /projects has no page of its own: the projects are listed in « My projects ».
import { redirect } from 'next/navigation';

export default function ProjectsPage(): never {
  redirect('/my/projects');
}
