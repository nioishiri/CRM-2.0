'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RoleBadge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, X, UserPlus, Save } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'MANAGER', isActive: true });

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.email || !form.name || (!editId && !form.password)) {
      toast.error('Заполните все поля');
      return;
    }
    try {
      const url = editId ? '/api/users/' + editId : '/api/users';
      const method = editId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success(editId ? 'Обновлено' : 'Создан');
        setShowForm(false);
        setEditId(null);
        setForm({ email: '', password: '', name: '', role: 'MANAGER', isActive: true });
        loadUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Ошибка');
      }
    } catch { toast.error('Ошибка'); }
  };

  const handleEdit = (u: any) => {
    setEditId(u.id);
    setForm({ email: u.email, password: '', name: u.name, role: u.role, isActive: u.isActive });
    setShowForm(true);
  };

  const handleToggleActive = async (u: any) => {
    await fetch('/api/users/' + u.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    loadUsers();
  };

  if (loading) return <p className="text-center py-12">Загрузка...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Пользователи</h2>
        <Button onClick={() => { setShowForm(true); setEditId(null); setForm({ email: '', password: '', name: '', role: 'MANAGER', isActive: true }); }}>
          <Plus className="mr-2 h-4 w-4" /> Добавить
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editId ? 'Редактировать' : 'Новый пользователь'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Имя</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={!!editId} /></div>
            <div><Label>Пароль{editId ? ' (оставьте пустым, если не менять)' : ''}</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <Label>Роль:</Label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="border rounded px-2 py-1">
                <option value="MANAGER">Менеджер</option>
                <option value="ADMIN">Админ</option>
              </select>
            </div>
            <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" /> Сохранить</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {users.map(u => (
          <Card key={u.id} className={!u.isActive ? 'opacity-50' : ''}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{u.name}</span>
                  <RoleBadge role={u.role} />
                  {!u.isActive && <span className="text-xs text-red-500">Деактивирован</span>}
                </div>
                <p className="text-sm text-gray-500">{u.email}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(u)}>Изменить</Button>
                <Button variant={u.isActive ? 'ghost' : 'outline'} size="sm" onClick={() => handleToggleActive(u)}>
                  {u.isActive ? 'Деактивировать' : 'Активировать'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}