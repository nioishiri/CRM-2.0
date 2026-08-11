export function resolveTemplate(
  body: string,
  variables: Record<string, string>
): string {
  let resolved = body;
  for (const [key, value] of Object.entries(variables)) {
    resolved = resolved.replace(
      new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'),
      value
    );
  }
  return resolved;
}

export const TEMPLATE_VARIABLES = [
  { key: 'contact_name', label: 'Имя контакта' },
  { key: 'contact_email', label: 'Email контакта' },
  { key: 'manager_name', label: 'Имя менеджера' },
  { key: 'conversation_subject', label: 'Тема обращения' },
  { key: 'current_date', label: 'Текущая дата' },
] as const;