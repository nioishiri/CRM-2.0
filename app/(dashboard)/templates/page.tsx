'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Save, X, EyeOff } from 'lucide-react';
import { TEMPLATE_VARIABLES } from '@/lib/templates';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [scope, setScope] = useState<'PERSONAL' | 'GLOBAL'>('PERSONAL');
  const [isGlobalAllowed, setIsGlobalAllowed] = useState(false);

  useEffect(() => {
    loadTemplates();
    fetch('/api/auth/me').then(r => r.json()).then(d => setIsGlobalAllowed(d.user?.role === 'ADMIN'));
  }, []);

  const loadTemplates = async () => {
    const res = await fetch('/api/templates');
    const data = await res.json();
    setTemplates(data.templates || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!title || !body) { toast.error('Название и текст обязательны'); return; }
    const url = editId ? '/api/templates/' + editId : '/api/templates';
    const method = editId ? 'PATCH' : 'POST';
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, subject, body, scope }) });
      if (res.ok) { toast.success(editId ? 'Шаблон обновлён' : 'Шаблон создан'); resetForm(); loadTemplates(); }
      else toast.error('Ошибка');
    } catch { toast.error('Ошибка'); }
  };

  const handleDeactivate = async (id: string) => {
    await fetch('/api/templates/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: false }) });
    toast.success('Деактивирован');
    loadTemplates();
  };

  const handleEdit = (tpl: any) => { setEditId(tpl.id); setTitle(tpl.title); setSubject(tpl.subject || ''); setBody(tpl.body); setScope(tpl.scope); setEditMode(true); };
  const resetForm = () => { setEditMode(false); setEditId(null); setTitle(''); setSubject(''); setBody(''); setScope('PERSONAL'); };
  const insertVar = (v: string) => setBody(prev => prev + '{{' + v + '}}');
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Шаблоны</h2>
        {!editMode && <Button onClick={() => setEditMode(true)}><Plus className="mr-2 h-4 w-4" /> Создать шаблон</Button>}
      </div>

      {editMode && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editId ? 'Редактировать' : 'Новый шаблон'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={resetForm}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Название</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Название" /></div>
            <div><Label>Тема (необяз.)</Label><Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Тема" /></div>
            {isGlobalAllowed && (
              <div className="flex items-center gap-2">
                <Label>Область:</Label>
                <select value={scope} onChange={e => setScope(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
                  <option value="PERSONAL">Личный</option>
                  <option value="GLOBAL">Глобальный</option>
                </select>
              </div>
            )}
            <div><Label>Текст</Label><Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Текст шаблона. Переменные: {{contact_name}}" rows={5} /></div>
            <div>
              <Label className="mb-1 block">Переменные:</Label>
              <div className="flex flex-wrap gap-1">
                {TEMPLATE_VARIABLES.map(v => (
                  <Button key={v.key} variant="outline" size="sm" onClick={() => insertVar(v.key)} type="button">{v.label}</Button>
                ))}
              </div>
            </div>
            <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" /> Сохранить</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-center py-8 text-gray-500">Загрузка...</p>
      ) : templates.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-gray-500"><p>Нет шаблонов. Создайте первый.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {templates.map(tpl => (
            <Card key={tpl.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{tpl.title}</p>
                    <p className="text-xs text-gray-500">{tpl.scope === 'GLOBAL' ? 'Глобальный' : 'Личный'}{tpl.createdBy && ' · ' + tpl.createdBy.name}</p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{tpl.body}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(tpl)}>Изменить</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeactivate(tpl.id)}><EyeOff className="h-4 w-4" /></Button>
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