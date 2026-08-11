'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import {
  MessageSquareText,
  Clock,
  CheckCircle2,
  Users,
  AlertTriangle,
} from 'lucide-react';

interface Stats {
  new: number;
  inProgress: number;
  resolvedToday: number;
  overdue: number;
  total: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOverdue, setRecentOverdue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      // Для менеджера - базовые счетчики
      const res = await fetch('/api/conversations?limit=5');
      const data = await res.json();
      
      // Базовые счетчики из списка
      const convs = data.conversations || [];
      const now = new Date();
      setStats({
        new: convs.filter((c: any) => c.status === 'NEW').length,
        inProgress: convs.filter((c: any) => c.status === 'IN_PROGRESS').length,
        resolvedToday: 0,
        overdue: convs.filter((c: any) => c.slaDueAt && new Date(c.slaDueAt) < now && !c.firstResponseAt).length,
        total: convs.length,
      });
      setRecentOverdue(convs.filter((c: any) => c.slaDueAt && new Date(c.slaDueAt) < now && !c.firstResponseAt).slice(0, 5));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p className="text-center text-gray-500 py-12">Загрузка...</p>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Дашборд</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <MessageSquareText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.new || 0}</p>
                <p className="text-sm text-gray-500">Новых</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                <Users className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.inProgress || 0}</p>
                <p className="text-sm text-gray-500">В работе</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                <p className="text-sm text-gray-500">Всего</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={stats?.overdue ? 'border-red-300' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${stats?.overdue ? 'text-red-600' : ''}`}>
                  {stats?.overdue || 0}
                </p>
                <p className="text-sm text-gray-500">Просрочено</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {recentOverdue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Просроченные обращения</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentOverdue.map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/conversations/${conv.id}`)}
                >
                  <div>
                    <p className="font-medium">{conv.subject}</p>
                    <p className="text-sm text-gray-500">{conv.contact?.email}</p>
                  </div>
                  <StatusBadge status={conv.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}