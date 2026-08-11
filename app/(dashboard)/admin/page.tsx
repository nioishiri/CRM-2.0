'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { AlertTriangle, MessageSquareText, Clock, Users, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center py-12">Загрузка...</p>;
  if (!data) return <p className="text-center py-12">Нет данных</p>;

  const { stats, overdueConversations, managerStats, latestNotifications } = data;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Админ-панель</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Новых', value: stats.new, icon: MessageSquareText, color: 'bg-blue-100 text-blue-600' },
          { label: 'В работе', value: stats.inProgress, icon: Clock, color: 'bg-yellow-100 text-yellow-600' },
          { label: 'Отвечено сегодня', value: stats.resolvedToday, icon: CheckCircle2, color: 'bg-green-100 text-green-600' },
          { label: 'Просрочено', value: stats.overdue, icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
          { label: 'Всего', value: stats.total, icon: MessageSquareText, color: 'bg-purple-100 text-purple-600' },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div><p className="text-2xl font-bold">{item.value}</p><p className="text-sm text-gray-500">{item.label}</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {overdueConversations?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg text-red-600">Просроченные обращения ({overdueConversations.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueConversations.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded border p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push('/conversations/' + c.id)}>
                  <div>
                    <p className="font-medium">{c.subject}</p>
                    <p className="text-sm text-gray-500">{c.contact?.name || c.contact?.email} {c.assignedTo && '→ ' + c.assignedTo.name}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">Нагрузка менеджеров</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left">
                <th className="py-2 px-3 font-medium">Менеджер</th>
                <th className="py-2 px-3 font-medium">Назначено</th>
                <th className="py-2 px-3 font-medium text-red-600">Просрочено</th>
                <th className="py-2 px-3 font-medium text-green-600">Отвечено сегодня</th>
              </tr></thead>
              <tbody>
                {managerStats?.map((m: any) => (
                  <tr key={m.id} className="border-b">
                    <td className="py-2 px-3">{m.name}<br/><span className="text-xs text-gray-400">{m.email}</span></td>
                    <td className="py-2 px-3">{m.totalAssigned}</td>
                    <td className="py-2 px-3 text-red-600 font-medium">{m.overdue}</td>
                    <td className="py-2 px-3">{m.answeredToday}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {latestNotifications?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Последние уведомления</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {latestNotifications.map((n: any) => (
                <div key={n.id} className="text-sm border-b pb-2 last:border-0">
                  <span className="font-medium">{n.title}</span>
                  <span className="text-gray-500 ml-2">{n.body}</span>
                  <span className="text-xs text-gray-400 ml-2">({n.user?.name})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}