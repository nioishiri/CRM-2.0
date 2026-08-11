'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/badge';
import { Search, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    loadConversations();
  }, [search]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/conversations?${params}`);
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getSlaStatus = (conv: any) => {
    if (!conv.slaDueAt || conv.firstResponseAt) return null;
    const due = new Date(conv.slaDueAt);
    const now = new Date();
    const diff = due.getTime() - now.getTime();
    if (diff <= 0) {
      const mins = Math.abs(Math.round(diff / 60000));
      if (mins >= 60) {
        return { label: `Просрочено на ${Math.floor(mins / 60)} ч ${mins % 60} мин`, overdue: true };
      }
      return { label: `Просрочено на ${mins} мин`, overdue: true };
    }
    const mins = Math.round(diff / 60000);
    if (mins >= 60) {
      return { label: `Осталось ${Math.floor(mins / 60)} ч ${mins % 60} мин`, overdue: false };
    }
    return { label: `Осталось ${mins} мин`, overdue: false };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Обращения</h2>
        <Button variant="outline" size="sm" onClick={loadConversations}>
          <RefreshCw className="mr-2 h-4 w-4" /> Обновить
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Поиск по теме или email..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-8">Загрузка...</p>
      ) : conversations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <p>Пока нет обращений</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const sla = getSlaStatus(conv);
            return (
              <Card
                key={conv.id}
                className={`cursor-pointer transition-colors hover:bg-gray-50 ${sla?.overdue ? 'border-red-300 bg-red-50' : ''}`}
                onClick={() => router.push(`/conversations/${conv.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={conv.status} />
                        {sla && (
                          <span className={`text-xs ${sla.overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                            {sla.label}
                          </span>
                        )}
                      </div>
                      <p className="font-medium truncate">{conv.subject}</p>
                      <p className="text-sm text-gray-500">
                        {conv.contact?.name || conv.contact?.email}
                        {conv.assignedTo && ` — ${conv.assignedTo.name}`}
                      </p>
                    </div>
                    <div className="text-right text-xs text-gray-400 whitespace-nowrap">
                      {conv.lastMessageAt && format(new Date(conv.lastMessageAt), 'dd MMM HH:mm', { locale: ru })}
                      <br />
                      {conv._count?.messages} сообщ.
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}