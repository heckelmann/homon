import DashboardHeader from '@/components/DashboardHeader';
import NetworkScanner from '@/components/NetworkScanner';

export const dynamic = 'force-dynamic';

export default function NetworkPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <DashboardHeader />
        <NetworkScanner />
      </div>
    </main>
  );
}
