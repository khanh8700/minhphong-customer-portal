"use client";

import { useFormStatus } from "react-dom";
import React, { useState, useRef } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  promptMessage?: string;
}

export default function ConfirmSubmitButton({ promptMessage, children, ...props }: Props) {
  const { pending } = useFormStatus();
  const [modalState, setModalState] = useState<{ isOpen: boolean; type: 'confirm' | 'error'; message: string }>({ isOpen: false, type: 'confirm', message: '' });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (props.onClick) props.onClick(e);
    if (e.defaultPrevented) return;

    const form = buttonRef.current?.form;
    if (form) {
      e.preventDefault(); // Always intercept to prevent native browser validation tooltips and submission
      
      // 1. Manual HTML5 Validation
      if (!form.checkValidity()) {
        const invalidElements = form.querySelectorAll(':invalid');
        if (invalidElements.length > 0) {
          const firstInvalid = invalidElements[0] as HTMLInputElement;
          setModalState({ isOpen: true, type: 'error', message: firstInvalid.validationMessage || "Vui lòng kiểm tra lại thông tin nhập vào." });
          return;
        }
      }

      // 2. Confirm if needed
      if (promptMessage) {
        setModalState({ isOpen: true, type: 'confirm', message: promptMessage });
      } else {
        // No confirm needed, submit immediately
        submitForm();
      }
    }
  };

  const submitForm = () => {
    const form = buttonRef.current?.form;
    if (form) {
      const hiddenSubmit = document.createElement('button');
      hiddenSubmit.type = 'submit';
      hiddenSubmit.style.display = 'none';
      form.appendChild(hiddenSubmit);
      hiddenSubmit.click();
      form.removeChild(hiddenSubmit);
    }
  };

  const handleModalConfirm = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
    if (modalState.type === 'confirm') {
      submitForm();
    }
  };

  const handleModalCancel = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <>
      <button
        {...props}
        ref={buttonRef}
        type="submit"
        onClick={handleClick}
        disabled={pending || props.disabled}
        style={{
          ...props.style,
          opacity: pending || props.disabled ? 0.5 : (props.style?.opacity ?? 1),
          cursor: pending ? "wait" : (props.disabled ? "not-allowed" : "pointer")
        }}
      >
        {pending ? "Đang xử lý..." : children}
      </button>

      {modalState.isOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: 16, padding: '24px 32px', width: '90%', maxWidth: 420, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            transform: 'scale(1)', animation: 'modalIn 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              {modalState.type === 'error' ? <AlertCircle size={28} color="#ef4444" /> : <Info size={28} color="#3b82f6" />}
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                {modalState.type === 'error' ? 'Lỗi xác thực' : 'Xác nhận thao tác'}
              </h3>
            </div>
            
            <p style={{ margin: '0 0 28px 0', fontSize: 15, color: '#475569', lineHeight: 1.6 }}>
              {modalState.message}
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              {modalState.type === 'confirm' && (
                <button 
                  onClick={handleModalCancel}
                  style={{ padding: '10px 20px', borderRadius: 10, border: 'none', backgroundColor: '#f1f5f9', color: '#475569', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                >
                  Hủy bỏ
                </button>
              )}
              <button 
                onClick={handleModalConfirm}
                style={{ padding: '10px 20px', borderRadius: 10, border: 'none', backgroundColor: modalState.type === 'error' ? '#ef4444' : '#3b82f6', color: '#ffffff', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = modalState.type === 'error' ? '#dc2626' : '#2563eb'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = modalState.type === 'error' ? '#ef4444' : '#3b82f6'}
              >
                {modalState.type === 'error' ? 'Đã hiểu' : 'Đồng ý'}
              </button>
            </div>
          </div>
          <style>{`
            @keyframes modalIn {
              from { opacity: 0; transform: scale(0.95) translateY(10px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
