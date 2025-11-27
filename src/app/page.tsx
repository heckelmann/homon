import HostList from '@/components/HostList';
import DashboardHeader from '@/components/DashboardHeader';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <DashboardHeader />
        <HostList />
      </div>
    </main>
  );
}

