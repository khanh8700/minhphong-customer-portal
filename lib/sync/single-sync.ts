import { createErpReadClient, createPortalAdminClient } from "@/lib/supabase/admin";
import { mapCustomer, mapContract } from "@/lib/sync/mappers";

export interface SyncSingleParams {
  contractId?: string;
  customerId?: string;
  customerCode?: string;
}

export interface SyncSingleResult {
  success: boolean;
  syncedCustomer?: string;
  syncedContract?: string;
  error?: string;
}

/**
 * Đồng bộ ngay lập tức 1 khách hàng và/hoặc 1 hợp đồng từ ERP sang Portal DB (Realtime Sync)
 */
export async function syncSingleCustomerAndContract(
  params: SyncSingleParams
): Promise<SyncSingleResult> {
  const { contractId, customerCode } = params;
  let customerId = params.customerId;

  if (!contractId && !customerId && !customerCode) {
    return { success: false, error: "Cần cung cấp ít nhất một trong ba: contractId, customerId, customerCode" };
  }

  try {
    const erp = createErpReadClient();
    const portal = createPortalAdminClient();

    let contractRow: any = null;

    // 1. Tìm thông tin Hợp đồng từ ERP
    if (contractId) {
      const { data, error } = await erp
        .from("contracts")
        .select("id, customer_id, customer_code, contract_number, status, template_code, signing_channel, customer_signer_type, final_pdf_url, paper_scan_pdf_url, pdf_sha256, created_at, updated_at")
        .eq("id", contractId)
        .maybeSingle();

      if (!error && data) {
        contractRow = data;
        if (!customerId && data.customer_id) {
          customerId = data.customer_id;
        }
      }
    }

    // 2. Nếu chưa có contractRow nhưng có customerId, tìm hợp đồng mới nhất của khách hàng đó từ ERP
    if (!contractRow && customerId) {
      const { data, error } = await erp
        .from("contracts")
        .select("id, customer_id, customer_code, contract_number, status, template_code, signing_channel, customer_signer_type, final_pdf_url, paper_scan_pdf_url, pdf_sha256, created_at, updated_at")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        contractRow = data;
      }
    }

    // 3. Nếu chưa có customerId nhưng có customerCode, tìm customer_id từ ERP
    if (!customerId && customerCode) {
      const { data: custLookup } = await erp
        .from("customers")
        .select("id")
        .eq("customer_code", customerCode)
        .maybeSingle();

      if (custLookup?.id) {
        customerId = custLookup.id;
      }
    }

    // 4. Nếu vẫn chưa có contractRow nhưng có customerCode, thử tìm hợp đồng theo customer_code
    if (!contractRow && customerCode) {
      const { data, error } = await erp
        .from("contracts")
        .select("id, customer_id, customer_code, contract_number, status, template_code, signing_channel, customer_signer_type, final_pdf_url, paper_scan_pdf_url, pdf_sha256, created_at, updated_at")
        .eq("customer_code", customerCode)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        contractRow = data;
        if (!customerId && data.customer_id) {
          customerId = data.customer_id;
        }
      }
    }

    // 5. Tìm thông tin Khách hàng từ ERP
    let customerRow: any = null;
    if (customerId) {
      const { data, error } = await erp
        .from("customers")
        .select("id, customer_code, full_name, address, phone, email, tax_code, current_meter_id, contract_id, status_bool, credit_balance, created_at, updated_at, area:area_id(name), route:route_id(name)")
        .eq("id", customerId)
        .maybeSingle();

      if (!error && data) {
        customerRow = data;
      }
    }

    let syncedCustomer: string | undefined;
    let syncedContract: string | undefined;

    // 6. Map và Upsert Customer vào Portal DB
    if (customerRow) {
      const mappedCust = mapCustomer(customerRow);
      if (mappedCust) {
        if (contractRow?.id) {
          mappedCust.contract_id = contractRow.id;
        }
        const { error: upsertCustErr } = await portal
          .from("customers")
          .upsert(mappedCust, { onConflict: "id" });

        if (upsertCustErr) {
          console.warn("[single-sync] Lỗi upsert customer vào Portal DB:", upsertCustErr.message);
        } else {
          syncedCustomer = String(mappedCust.customer_code);
        }
      }
    }

    // 7. Map và Upsert Contract vào Portal DB
    if (contractRow) {
      const mappedContract = mapContract(contractRow);
      if (mappedContract) {
        const { error: upsertContractErr } = await portal
          .from("contracts")
          .upsert(mappedContract, { onConflict: "id" });

        if (upsertContractErr) {
          console.warn("[single-sync] Lỗi upsert contract vào Portal DB:", upsertContractErr.message);
        } else {
          syncedContract = String(mappedContract.contract_number);
        }
      }
    }

    return {
      success: !!(syncedCustomer || syncedContract),
      syncedCustomer,
      syncedContract,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[single-sync] Lỗi ngoại lệ khi đồng bộ đơn lẻ:", msg);
    return { success: false, error: msg };
  }
}
