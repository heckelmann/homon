'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import HostCard from './HostCard';
import HostRow from './HostRow';

interface Host {
  id: number;
  label: string;
  hostname: string;
  port: number;
  username: string | null;
  refreshInterval: number;
  orderIndex: number;
  retentionDays: number;
  credential?: {
    username: string;
  } | null;
}

function SortableItem({ host, viewMode }: { host: Host, viewMode: 'grid' | 'table' }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: host.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {viewMode === 'grid' ? (
        <HostCard host={host} dragHandleProps={{ ...attributes, ...listeners }} />
      ) : (
        <HostRow host={host} dragHandleProps={{ ...attributes, ...listeners }} />
      )}
    </div>
  );
}

export default function SortableHostList({ initialHosts }: { initialHosts: Host[] }) {
  const [hosts, setHosts] = useState(initialHosts);
  const [isMounted, setIsMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  useEffect(() => {
    setIsMounted(true);
    const savedView = localStorage.getItem('hostViewMode');
    if (savedView === 'grid' || savedView === 'table') {
      setViewMode(savedView);
    }
  }, []);

  const toggleView = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('hostViewMode', mode);
  };

  useEffect(() => {
    setHosts(initialHosts);
  }, [initialHosts]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setHosts((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Persist the new order
        const updates = newItems.map((host, index) => ({
          id: host.id,
          orderIndex: index,
        }));

        fetch('/api/hosts/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hosts: updates }),
        }).catch(console.error);

        return newItems;
      });
    }
  };

  if (!isMounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {hosts.map((host) => (
          <div key={host.id} className="relative">
            <HostCard host={host} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4 gap-2">
        <button
          onClick={() => toggleView('grid')}
          className={`p-2 rounded border transition-colors ${
            viewMode === 'grid' 
              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' 
              : 'bg-[#0b101b] border-cyan-500/30 text-gray-500 hover:text-cyan-400'
          }`}
          title="Grid View"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>
        <button
          onClick={() => toggleView('table')}
          className={`p-2 rounded border transition-colors ${
            viewMode === 'table' 
              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' 
              : 'bg-[#0b101b] border-cyan-500/30 text-gray-500 hover:text-cyan-400'
          }`}
          title="Table View"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={hosts.map(h => h.id)} 
          strategy={viewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
        >
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-2"}>
            {hosts.map((host) => (
              <SortableItem key={host.id} host={host} viewMode={viewMode} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
