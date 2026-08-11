'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => { setSettings(d.settings || {}); setLoading(false); });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) toast.success('Настройки сохранены');
      else toast.error('Ошибка сохранения');
    } catch { toast.error('Ошибка'); }
    setSaving(false);
  };

  const update = (key: string, value: any) => setSettings({ ...settings, [key]: value });

  if (loading) return <p className="text-center py-12">Загрузка...</p>;

  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-2xl font-bold">Настройки</h2>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label>Название приложения</Label>
            <Input value={settings.app_name || ''} onChange={e => update('app_name', e.target.value)} />
          </div>
          <div>
            <Label>SLA: время ответа (минут)</Label>
            <Input type="number" value={settings.sla_response_minutes || 60} onChange={e => update('sla_response_minutes', Number(e.target.value))} />
          </div>
          <div>
            <Label>Интервал синхронизации (минут)</Label>
            <Input type="number" value={settings.sync_interval_minutes || 5} onChange={e => update('sync_interval_minutes', Number(e.target.value))} />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="notify"
              checked={settings.notify_admin_on_sla_overdue !== false}
              onChange={e => update('notify_admin_on_sla_overdue', e.target.checked)}
            />
            <Label htmlFor="notify">Уведомлять админов о просроченных ответах</Label>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}