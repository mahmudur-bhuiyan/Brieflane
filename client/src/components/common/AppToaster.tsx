import { Toaster } from 'sonner';
import { useTheme } from '../../context/ThemeContext';

export function AppToaster() {
  const { theme } = useTheme();

  return (
    <Toaster
      position="bottom-right"
      theme={theme === 'dark' ? 'dark' : 'light'}
      expand
      visibleToasts={4}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'bl-toast',
          success: 'bl-toast-success',
          error: 'bl-toast-error',
          info: 'bl-toast-info',
          closeButton: 'bl-toast-close',
        },
      }}
    />
  );
}
