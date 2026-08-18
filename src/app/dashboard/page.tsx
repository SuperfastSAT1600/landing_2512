import DashboardClient from './DashboardClient';

export const metadata = {
  title: 'Ontology Knowledge Graph Explorer',
  description: 'NotebookLM style interface for querying SAT Ontology Data',
};

export default function DashboardPage() {
  return <DashboardClient />;
}
