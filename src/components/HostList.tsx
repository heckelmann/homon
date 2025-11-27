import { prisma } from '@/lib/prisma';
import SortableHostList from './SortableHostList';

export default async function HostList() {
  const hosts = await prisma.host.findMany({
    orderBy: { orderIndex: 'asc' },
    include: { credential: true },
  });

  return <SortableHostList initialHosts={hosts} />;
}
