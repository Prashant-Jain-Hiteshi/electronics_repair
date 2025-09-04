import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIState {
  // Loading states
  isLoading: boolean;
  loadingMessage: string | null;
  // Modal states
  isModalOpen: boolean;
  modalContent: React.ReactNode | null;
  modalTitle: string;
  // Toast notifications
  toast: {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    isVisible: boolean;
  };
  // Actions
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  showModal: (content: React.ReactNode, title?: string) => void;
  hideModal: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      // Initial state
      isLoading: false,
      loadingMessage: null,
      isModalOpen: false,
      modalContent: null,
      modalTitle: '',
      toast: {
        message: '',
        type: 'info',
        isVisible: false,
      },
      
      // Actions
      showLoading: (message = 'Loading...') => 
        set({ isLoading: true, loadingMessage: message }),
        
      hideLoading: () => 
        set({ isLoading: false, loadingMessage: null }),
        
      showModal: (content, title = '') =>
        set({ isModalOpen: true, modalContent: content, modalTitle: title }),
        
      hideModal: () =>
        set({ isModalOpen: false, modalContent: null, modalTitle: '' }),
        
      showToast: (message, type = 'info') =>
        set({
          toast: {
            message,
            type,
            isVisible: true,
          },
        }),
    }),
    {
      name: 'ui-store',
    }
  )
);

// Export hooks for convenience
export const useLoading = () => {
  const { isLoading, loadingMessage, showLoading, hideLoading } = useUIStore();
  return { isLoading, loadingMessage, showLoading, hideLoading };
};

export const useModal = () => {
  const { isModalOpen, modalContent, modalTitle, showModal, hideModal } = useUIStore();
  return { isModalOpen, modalContent, modalTitle, showModal, hideModal };
};

export const useToast = () => {
  const { toast, showToast } = useUIStore();
  return { ...toast, showToast };
};
