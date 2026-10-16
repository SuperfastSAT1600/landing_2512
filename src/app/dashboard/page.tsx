import DashboardClient from './DashboardClient';

export const metadata = {
  title: 'Ontology Knowledge Graph Explorer',
  description: 'NotebookLM style interface for querying SAT Ontology Data',
  // 내부 도구다. 공개 접근은 되지만 검색에 뜰 이유가 없어 색인만 막는다.
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return <DashboardClient />;
}
