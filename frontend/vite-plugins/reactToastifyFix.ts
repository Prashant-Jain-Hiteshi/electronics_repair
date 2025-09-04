import { Plugin } from 'vite';

export default function reactToastifyFix(): Plugin {
  return {
    name: 'react-toastify-fix',
    config() {
      return {
        optimizeDeps: {
          include: ['react-toastify/dist/ReactToastify.css'],
        },
        ssr: {
          noExternal: ['react-toastify'],
        },
      };
    },
    resolveId(source) {
      if (source === 'react-toastify/dist/ReactToastify.css') {
        return {
          id: 'react-toastify/dist/ReactToastify.min.css',
          external: true,
        };
      }
      return null;
    },
  };
}
