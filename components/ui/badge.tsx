import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  WAITING_CUSTOMER: 'bg-purple-100 text-purple-800',
  RESOLVED: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<string, string> = {
  NEW: 'Новое',
  IN_PROGRESS: 'В работе',
  WAITING_CUSTOMER: 'Ожидание',
  RESOLVED: 'Решено',
  ARCHIVED: 'Архив',
};

const priorityColors: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-800',
  NORMAL: 'bg-blue-100 text-blue-800',
  LOW: 'bg-gray-100 text-gray-800',
};

const priorityLabels: Record<string, string> = {
  HIGH: 'Высокий',
  NORMAL: 'Обычный',
  LOW: 'Низкий',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', statusColors[status] || 'bg-gray-100 text-gray-800')}>
      {statusLabels[status] || status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', priorityColors[priority] || 'bg-gray-100 text-gray-800')}>
      {priorityLabels[priority] || priority}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
    )}>
      {role === 'ADMIN' ? 'Админ' : 'Менеджер'}
    </span>
  );
}