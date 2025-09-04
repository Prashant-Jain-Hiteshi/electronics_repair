import React from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const TestToast: React.FC = () => {
  const showToast = () => {
    toast.success('This is a test toast message!', {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      className: '!bg-[#12151d] !text-white !shadow-lg !rounded-lg !border !border-white/10',
    });
  };

  return (
    <div className="p-4">
      {/* <button
        onClick={showToast}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
      >
        Show Test Toast
      </button> */}
      
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        toastClassName="!bg-[#12151d] !text-white !shadow-lg !rounded-lg !border !border-white/10"
        className="!text-white"
      />
    </div>
  );
};

export default TestToast;
