'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ArrowLeft, Send, Mail, User } from 'lucide-react';
import { resolveTemplate } from '@/lib/templates';

export default function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [conv, setConv] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [convRes, tplRes, meRes] = await Promise.all([
        fetch(`/api/conversations/${id}`),
        fetch('/api/templates'),
        fetch('/api/auth/me'),
      ]);
      const convData = await convRes.json();
      const tplData = await tplRes.json();
      const meData = await meRes.json();
      setConv(convData.conversation);
      setTemplates(tplData.templates || []);
      setUserName(meData.user?.name || '');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: any) => {
    if (!conv) return;
    const vars = {
      contact_name: conv.contact?.name || 'Клиент',
      contact_email: conv.contact?.email || '',
      manager_name: userName,
      conversation_subject: conv.subject || '',
      current_date: format(new Date(), 'dd MMMM yyyy', { locale: ru }),
    };
    const resolved = resolveTemplate(template.body, vars);
    setReply(resolved);
    toast.info(`Шаблон "${template.title}" применён`);
  };

  const handleSend = async () => {
    if (!reply.trim()) {
      toast.error('Введите текст ответа');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bodyText: reply, bodyHtml: reply.replace(/\n/g, '<br>') }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Ответ отправлен');
        setReply('');
        loadData();
      } else {
        toast.error(data.error || 'Ошибка отправки');
      }
    } catch {
      toast.error('Ошибка соединения');
    } finally {
      setSending(false);
    }
  };

  const getSla = () => {
    if (!conv?.slaDueAt || conv.firstResponseAt) return null;
    const due = new Date(conv.slaDueAt);
    const diff = due.getTime() - Date.now();
    if (diff <= 0) {
      const mins = Math.round(Math.abs(diff) / 60000);
      const h = Math.floor(mins / 60);
      return { text: h > 0 ? `Просрочено: ${h} ч ${mins % 60} мин` : `Просрочено: ${mins} мин`, urgent: true };
    }
    const mins = Math.round(diff / 60000);
    const h = Math.floor(mins / 60);
    return { text: h > 0 ? `SLA: ${h} ч ${mins % 60} мин` : `SLA: ${mins} мин`, urgent: false };
  };

  if (loading) return <p className="text-center py-12">Загрузка...</p>;
  if (!conv) return <p className="text-center py-12">Обращение не найдено</p>;

  const sla = getSla();

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => router.push('/conversations')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Назад
      </Button>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{conv.subject}</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {conv.contact?.name || conv.contact?.email} — {conv.contact?.email}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={conv.status} />
              {sla && (
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${sla.urgent ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                  {sla.text}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!conv.assignedTo && (
            <Button variant="default" className="mb-4" onClick={async () => {
              try {
                const meRes = await fetch('/api/auth/me');
                const meData = await meRes.json();
                await fetch(`/api/conversations/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ assignedToId: meData.user?.id, status: 'IN_PROGRESS' }),
                });
                loadData();
              } catch { toast.error('Ошибка'); }
            }}>
              Взять в работу
            </Button>
          )}
          {conv.assignedTo && (
            <p className="text-sm text-gray-500 mb-4">Назначено: {conv.assignedTo.name}</p>
          )}
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {conv.messages?.map((msg: any) => (
              <div
                key={msg.id}
                className={`flex gap-3 p-3 rounded-lg ${msg.direction === 'OUTBOUND' ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'}`}
              >
                <div className="mt-1">
                  {msg.direction === 'OUTBOUND' ? <Mail className="h-5 w-5 text-blue-500" /> : <User className="h-5 w-5 text-gray-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{msg.fromName || msg.fromEmail}</span>
                    <span className="text-xs text-gray-400">{msg.createdAt && format(new Date(msg.createdAt), 'dd MMM HH:mm', { locale: ru })}</span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{msg.bodyText}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ответить</CardTitle>
          {templates.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-500">Шаблоны:</span>
              {templates.map((tpl) => (
                <Button key={tpl.id} variant="outline" size="sm" onClick={() => handleTemplateSelect(tpl)}>
                  {tpl.title}
                </Button>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Текст ответа..." rows={6} className="mb-3" />
          <Button onClick={handleSend} disabled={sending}>
            {sending ? 'Отправка...' : <><Send className="mr-2 h-4 w-4" /> Отправить ответ</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
