import { API_BASE } from '@/lib/api';
import { getCookie } from '@/utils/csrf';

export async function deleteZeroStock(tipo: 'new' | 'used' | 'both') {
  await fetch(`${API_BASE}/csrf/`, { credentials: 'include' });
  const csrftoken = getCookie('csrftoken');
  const res = await fetch(`${API_BASE}/productos/stock0?tipo=${tipo}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrftoken,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}
