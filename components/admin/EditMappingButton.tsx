"use client";

import { useState } from "react";
import { Edit2 } from "lucide-react";
import { updateScadaMapping } from "@/app/admin/actions";
import ConfirmSubmitButton from "@/components/admin/ConfirmSubmitButton";

export default function EditMappingButton({ mapping }: { mapping: any }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        type="button" 
        onClick={() => setIsOpen(true)}
        style={{ color: "#3b82f6", background: "transparent", border: "none", cursor: "pointer", padding: "4px", transition: 'color 0.2s' }}
        onMouseOver={(e) => e.currentTarget.style.color = '#2563eb'}
        onMouseOut={(e) => e.currentTarget.style.color = '#3b82f6'}
        title="Chỉnh sửa"
      >
        <Edit2 size={18} />
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: 16, padding: '24px 32px', width: '90%', maxWidth: 500, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            transform: 'scale(1)', animation: 'modalIn 0.2s ease-out'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
              Chỉnh sửa API URL
            </h3>
            <p style={{ margin: '0 0 24px 0', fontSize: 14, color: '#475569' }}>
              Mã Khách Hàng: <strong style={{ color: '#0f172a' }}>{mapping.customer_code}</strong>
            </p>
            
            <form action={(formData) => {
               updateScadaMapping(formData);
               setIsOpen(false);
            }}>
              <input type="hidden" name="customerCode" value={mapping.customer_code} />
              
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>API URL mới</label>
                <input 
                  type="url" 
                  name="apiUrl" 
                  defaultValue={mapping.api_url} 
                  required
                  className="admin-input" 
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button 
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{ padding: '10px 20px', borderRadius: 10, border: 'none', backgroundColor: '#f1f5f9', color: '#475569', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                >
                  Hủy bỏ
                </button>
                <ConfirmSubmitButton
                  style={{ padding: '10px 20px', borderRadius: 10, border: 'none', backgroundColor: '#3b82f6', color: '#ffffff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  Lưu thay đổi
                </ConfirmSubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
