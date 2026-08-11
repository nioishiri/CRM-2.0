'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Bell, CheckCheck, Mail, AlertTriangle } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleMarkRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id }),
    });
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    });
    toast.success('Все отмечены как прочитанные');
    loadNotifications();
  };

  const typeIcons: Record<string, any> = {
    SLA_OVERDUE: <AlertTriangle className="h-5 w-5 text-red-500" />,
    SYSTEM: <Bell className="h-5 w-5 text-blue-500" />,
    MAILBOX_ERROR: <Mail className="h-5 w-5 text-yellow-500" />,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          Уведомления {unreadCount > 0 && <span className="text-red-500 text-lg">({unreadCount})</span>}
        </h2>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="mr-2 h-4 w-4" /> Прочитать все
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-center py-8 text-gray-500">Загрузка...</p>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <Bell className="mx-auto h-8 w-8 mb-2 text-gray-300" />
            <p>Нет уведомлений</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <Card
              key={notif.id}
              className={`cursor-pointer transition-colors ${!notif.readAt ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : 'opacity-70'}`}
              onClick={() => !notif.readAt && handleMarkRead(notif.id)}
            >
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div className="mt-1">{typeIcons[notif.type] || <Bell className="h-5 w-5" />}</div>
                  <div className="flex-1">
                    <p className="font-medium">{notif.title}</p>
                    <p className="text-sm text-gray-600">{notif.body}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(notif.createdAt), 'dd MMMM HH:mm', { locale: ru })}
                      {notif.conversation && ` · ${notif.conversation.subject}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}