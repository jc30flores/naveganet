import { Button } from '@/components/ui/button';
import Modal from '@/components/Modal';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { useAuth } from '@/store/auth';
import { getCookie } from '@/utils/csrf';
import { API_BASE } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

export default function SessionGuard() {
  const clear = useAuth((s) => s.clear);
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();

  const logout = async () => {
    const csrftoken = getCookie('csrftoken');
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRFToken': csrftoken },
    }).catch(() => {});
    clear();
    navigate('/login');
  };

  const { open, counter, continueSession, manualLogout } = useIdleTimer(logout, !!user);

  if (!user) return null;

  return (
    <Modal open={open} onClose={continueSession}>
      <div className="flex flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="text-lg md:text-xl">
          Tu sesión se cerrará por inactividad en: <span className="font-semibold">{counter}s</span>
        </p>
        <div className="flex gap-4">
          <Button onClick={continueSession} variant="outline">
            Continuar sesión
          </Button>
          <Button onClick={manualLogout} variant="destructive">
            Cerrar sesión
          </Button>
        </div>
      </div>
    </Modal>
  );
}
