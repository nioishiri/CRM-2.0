'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, X, Save, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function AdminMailboxesPage() {
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', imapHost: '', imapPort: 993, imapSecure: true,
    smtpHost: '', smtpPort: 587, smtpSecure: true,
    username: '', password: '', fromEmail: '', fromName: '', isActive: true,
  });

  useEffect(() => { loadMailboxes(); }, []);

  const loadMailboxes = async () => {
    const res = await fetch('/api/mailboxes');
    const data = await res.json();
    setMailboxes(data.mailboxes || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.imapHost || !form.smtpHost || !form.username || !form.fromEmail) {
      toast.error('Заполните обязательные поля'); return;
    }
    if (!editId && !form.password) { toast.error('Введите пароль'); return; }
    const url = editId ? '/api/mailboxes/' + editId : '/api/mailboxes';
    const method = editId ? 'PATCH' : 'POST';
    const body: any = { ...form };
    if (editId && !form.password) delete body.password;
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) { toast.success(editId ? 'Обновлено' : 'Создан'); setShowForm(false); setEditId(null); resetForm(); loadMailboxes(); }
      else toast.error('Ошибка');
    } catch { toast.error('Ошибка'); }
  };

  const handleTest = async () => {
    setTestResult(null);
    if (!form.username || !form.password) { toast.error('Введите логин и пароль'); return; }
    try {
      const res = await fetch('/api/mailboxes/test-connection', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imapHost: form.imapHost, imapPort: form.imapPort, imapSecure: form.imapSecure,
          smtpHost: form.smtpHost, smtpPort: form.smtpPort, smtpSecure: form.smtpSecure,
          username: form.username, password: form.password, fromEmail: form.fromEmail }),
      });
      setTestResult(await res.json());
    } catch { toast.error('Ошибка проверки'); }
  };

  const handleEdit = (m: any) => {
    setEditId(m.id);
    setForm({ name: m.name, imapHost: m.imapHost, imapPort: m.imapPort, imapSecure: m.imapSecure,
      smtpHost: m.smtpHost, smtpPort: m.smtpPort, smtpSecure: m.smtpSecure,
      username: m.username, password: '', fromEmail: m.fromEmail, fromName: m.fromName || '', isActive: m.isActive });
    setShowForm(true);
  };

  const resetForm = () => setForm({
    name: '', imapHost: '', imapPort: 993, imapSecure: true,
    smtpHost: '', smtpPort: 587, smtpSecure: true,
    username: '', password: '', fromEmail: '', fromName: '', isActive: true,
  });
if (loading) return <p className="text-center py-12">Загрузка...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Почтовые ящики</h2>
        <Button onClick={() => { setShowForm(true); setEditId(null); resetForm(); }}>
          <Plus className="mr-2 h-4 w-4" /> Добавить
        </Button>
      </div>
      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editId ? 'Редактировать' : 'Новый ящик'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Название</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><Label>Email отправителя</Label><Input value={form.fromEmail} onChange={e => setForm({...form, fromEmail: e.target.value})} /></div>
              <div><Label>Имя отправителя</Label><Input value={form.fromName} onChange={e => setForm({...form, fromName: e.target.value})} /></div>
              <div><Label>Логин (email)</Label><Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} /></div>
              <div><Label>Пароль{editId ? ' (пусто - не менять)' : ''}</Label><Input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>
            </div>
            <div className="border-t pt-3"><p className="font-medium mb-2">IMAP</p>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Хост</Label><Input value={form.imapHost} onChange={e => setForm({...form, imapHost: e.target.value})} placeholder="imap.gmail.com" /></div>
                <div><Label>Порт</Label><Input type="number" value={form.imapPort} onChange={e => setForm({...form, imapPort: +e.target.value})} /></div>
                <div className="flex items-end pb-2"><label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={form.imapSecure} onChange={e => setForm({...form, imapSecure: e.target.checked})} /> SSL/TLS</label></div>
              </div>
            </div>
            <div className="border-t pt-3"><p className="font-medium mb-2">SMTP</p>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Хост</Label><Input value={form.smtpHost} onChange={e => setForm({...form, smtpHost: e.target.value})} placeholder="smtp.gmail.com" /></div>
                <div><Label>Порт</Label><Input type="number" value={form.smtpPort} onChange={e => setForm({...form, smtpPort: +e.target.value})} /></div>
                <div className="flex items-end pb-2"><label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={form.smtpSecure} onChange={e => setForm({...form, smtpSecure: e.target.checked})} /> SSL/TLS</label></div>
              </div>
            </div>
            {testResult && (
              <div className="p-3 rounded bg-gray-50 text-sm space-y-1">
                <p>IMAP: {testResult.imap?.ok ? <span className="text-green-600"><CheckCircle className="inline h-4 w-4" /> OK</span> : <span className="text-red-600"><XCircle className="inline h-4 w-4" /> {testResult.imap?.error}</span>}</p>
                <p>SMTP (подключение): {testResult.smtp?.ok ? <span className="text-green-600"><CheckCircle className="inline h-4 w-4" /> OK</span> : <span className="text-red-600"><XCircle className="inline h-4 w-4" /> {testResult.smtp?.error}</span>}</p>
                {testResult.smtpSend && (
                  <p>SMTP (тест. отправка): {testResult.smtpSend.ok ? <span className="text-green-600"><CheckCircle className="inline h-4 w-4" /> отправлено — {testResult.smtpSend.response}</span> : <span className="text-red-600"><XCircle className="inline h-4 w-4" /> {testResult.smtpSend.error}</span>}</p>
                )}
                {testResult.warning && <p className="text-amber-600">⚠ {testResult.warning}</p>}
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" /> Сохранить</Button>
              <Button variant="outline" onClick={handleTest}><RefreshCw className="mr-2 h-4 w-4" /> Проверить</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="space-y-2">
        {mailboxes.map(m => (
          <Card key={m.id} className={!m.isActive ? 'opacity-50' : ''}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{m.name}</span>
                  {m.isActive ? <span className="text-xs text-green-600">Активен</span> : <span className="text-xs text-red-500">Неактивен</span>}
                </div>
                <p className="text-sm text-gray-500">{m.fromEmail} | IMAP: {m.imapHost}:{m.imapPort} | SMTP: {m.smtpHost}:{m.smtpPort}</p>
                {m.lastSyncAt && <p className="text-xs text-gray-400">Синхр: {format(new Date(m.lastSyncAt), 'dd.MM HH:mm', { locale: ru })}</p>}
                {m.lastError && <p className="text-xs text-red-500">Ошибка: {m.lastError}</p>}
              </div>
              <Button variant="outline" size="sm" onClick={() => handleEdit(m)}>Изменить</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}