import type { SupabaseClient } from "@supabase/supabase-js";
import { createErpReadClient, createPortalAdminClient } from "@/lib/supabase/admin";
import {
  mapBill,
  mapBillingPeriod,
  mapCustomer,
  mapDebtSnapshot,
  mapMeter,
  mapMeterReading,
  mapPayment,
  mapPaymentAllocation
} from "@/lib/sync/mappers";

type SyncEntity = {
  name: string;
  portalTable: string;
  erpTable: string;
  select: string;
  orderColumn: string;
  watermarkColumn?: string;
  mapper: (row: any) => Record<string, unknown> | null;
  rollingWindowHours?: number;
};

const ENTITIES: SyncEntity[] = [
  {
    name: "customers",
    portalTable: "customers",
    erpTable: "customers",
    select: "id, customer_code, full_name, address, phone, tax_code, current_meter_id, status_bool, credit_balance, created_at, updated_at, area:area_id(name), route:route_id(name)",
    orderColumn: "updated_at",
    watermarkColumn: "updated_at",
    mapper: mapCustomer
  },
  {
    name: "meters",
    portalTable: "meters",
    erpTable: "meters",
    select: "id, meter_code, meter_size, meter_class, status, created_at",
    orderColumn: "created_at",
    mapper: mapMeter
  },
  {
    name: "billing_periods",
    portalTable: "billing_periods",
    erpTable: "billing_periods",
    select: "id, period_name, start_date, end_date, status, created_at",
    orderColumn: "created_at",
    mapper: mapBillingPeriod
  },
  {
    name: "meter_readings",
    portalTable: "meter_readings",
    erpTable: "water_readings",
    select: "id, customer_id, period_id, meter_id, old_reading, new_reading, consumption, status, reading_time, created_at, updated_at",
    orderColumn: "updated_at",
    watermarkColumn: "updated_at",
    mapper: mapMeterReading
  },
  {
    name: "bills",
    portalTable: "bills",
    erpTable: "invoices",
    select: "id, customer_id, reading_id, period_id, old_reading, new_reading, consumption, unit_price, pre_tax_amount, tax, tax_amount, total_amount, paid_amount, status, due_date, start_date, end_date, created_at, updated_at",
    orderColumn: "updated_at",
    watermarkColumn: "updated_at",
    mapper: mapBill
  },
  {
    name: "payments",
    portalTable: "payments",
    erpTable: "payments",
    select: "id, customer_id, amount, payment_method_code, note, payment_date, status, created_at",
    orderColumn: "created_at",
    mapper: mapPayment,
    rollingWindowHours: 48
  },
  {
    name: "payment_allocations",
    portalTable: "payment_allocations",
    erpTable: "payment_allocations",
    select: "id, payment_id, invoice_id, allocated_amount, created_at, payment:payment_id(customer_id)",
    orderColumn: "created_at",
    mapper: mapPaymentAllocation,
    rollingWindowHours: 48
  },
  {
    name: "customer_debt_snapshots",
    portalTable: "customer_debt_snapshots",
    erpTable: "customer_debt_projection",
    select: "customer_id, customer_code, full_name, total_invoiced, total_collected, debt_amount, credit_balance, last_refresh_at, updated_at",
    orderColumn: "updated_at",
    watermarkColumn: "updated_at",
    mapper: mapDebtSnapshot
  }
];

type RunSyncOptions = {
  full?: boolean;
  batchSize?: number;
  erp?: SupabaseClient;
  portal?: SupabaseClient;
};

export async function runErpSync(options: RunSyncOptions = {}) {
  const erp = options.erp ?? createErpReadClient();
  const portal = options.portal ?? createPortalAdminClient();
  const batchSize = options.batchSize ?? 500;
  const mode = options.full ? "full" : "incremental";
  const { data: run, error: runError } = await portal
    .from("sync_runs")
    .insert({ mode, status: "running" })
    .select("id")
    .single();

  if (runError) throw new Error(runError.message);
  const runId = run.id as string;
  const stats: Record<string, number> = {};

  try {
    for (const entity of ENTITIES) {
      stats[entity.name] = await syncEntity({ entity, erp, portal, full: !!options.full, batchSize });
    }

    await portal
      .from("sync_runs")
      .update({ status: "success", finished_at: new Date().toISOString(), stats })
      .eq("id", runId);

    return { runId, status: "success", stats };
  } catch (error) {
    await portal
      .from("sync_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        stats,
        error: error instanceof Error ? error.message : "Unknown sync error"
      })
      .eq("id", runId);
    throw error;
  }
}

async function syncEntity(input: {
  entity: SyncEntity;
  erp: SupabaseClient;
  portal: SupabaseClient;
  full: boolean;
  batchSize: number;
}): Promise<number> {
  const { entity, erp, portal, full, batchSize } = input;
  const watermark = !full ? await getWatermark(portal, entity) : null;
  let from = 0;
  let total = 0;
  let latestWatermark: string | null = watermark;

  while (true) {
    let query = erp
      .from(entity.erpTable)
      .select(entity.select)
      .order(entity.orderColumn, { ascending: true, nullsFirst: false })
      .range(from, from + batchSize - 1);

    const minDate = getEntityMinDate(entity, watermark, full);
    if (minDate) query = query.gte(entity.orderColumn, minDate);

    const { data, error } = await query;
    if (error) throw new Error(`${entity.name}: ${error.message}`);
    const rows = data ?? [];
    if (rows.length === 0) break;

    const mapped = rows.map(entity.mapper).filter((row): row is Record<string, unknown> => Boolean(row));
    if (mapped.length > 0) {
      if (entity.name === "customers") {
        // 1. Deduplicate by customer_code_normalized within the batch (keeping the latest updated row)
        const dedupedByCode = new Map<string, Record<string, unknown>>();
        for (const item of mapped) {
          const code = item.customer_code_normalized as string;
          if (code) {
            dedupedByCode.set(code, item);
          }
        }

        // Also ensure deduplication by ID
        const dedupedById = new Map<string, Record<string, unknown>>();
        for (const item of dedupedByCode.values()) {
          dedupedById.set(item.id as string, item);
        }
        const finalMapped = Array.from(dedupedById.values());

        // 2. Resolve conflicts where portal DB already contains customer_code_normalized under an older/different UUID
        const codes = finalMapped.map((c) => c.customer_code_normalized as string);
        if (codes.length > 0) {
          const { data: existing } = await portal
            .from("customers")
            .select("id, customer_code_normalized")
            .in("customer_code_normalized", codes);

          if (existing && existing.length > 0) {
            const codeToIncomingId = new Map(finalMapped.map((c) => [c.customer_code_normalized, c.id]));
            const staleIdsToDelete = existing
              .filter((row) => codeToIncomingId.get(row.customer_code_normalized) !== row.id)
              .map((row) => row.id);

            if (staleIdsToDelete.length > 0) {
              await portal.from("customers").delete().in("id", staleIdsToDelete);
            }
          }
        }

        if (finalMapped.length > 0) {
          const { error: upsertError } = await portal.from(entity.portalTable).upsert(finalMapped);
          if (upsertError) throw new Error(`${entity.name} upsert: ${upsertError.message}`);
          total += finalMapped.length;
        }
      } else {
        // For other entities, deduplicate by primary key (id or customer_id) within the batch
        const deduped = new Map<string, Record<string, unknown>>();
        for (const item of mapped) {
          const pk = (item.id ?? item.customer_id) as string;
          if (pk) {
            deduped.set(pk, item);
          }
        }
        const finalMapped = Array.from(deduped.values());

        if (finalMapped.length > 0) {
          const { error: upsertError } = await portal.from(entity.portalTable).upsert(finalMapped);
          if (upsertError) throw new Error(`${entity.name} upsert: ${upsertError.message}`);
          total += finalMapped.length;
        }
      }
    }
    const last = rows[rows.length - 1] as any;
    const lastWatermark = last?.[entity.watermarkColumn ?? entity.orderColumn];
    if (lastWatermark) latestWatermark = lastWatermark;
    if (rows.length < batchSize) break;
    from += batchSize;
  }

  if (latestWatermark && entity.watermarkColumn) {
    await portal.from("sync_state").upsert({
      entity: entity.name,
      watermark: latestWatermark,
      updated_at: new Date().toISOString()
    });
  }

  return total;
}

async function getWatermark(portal: SupabaseClient, entity: SyncEntity): Promise<string | null> {
  if (!entity.watermarkColumn && !entity.rollingWindowHours) return null;
  const { data } = await portal
    .from("sync_state")
    .select("watermark")
    .eq("entity", entity.name)
    .maybeSingle();
  return (data?.watermark as string | null) ?? null;
}

function getEntityMinDate(entity: SyncEntity, watermark: string | null, full: boolean): string | null {
  if (full) return null;
  if (entity.rollingWindowHours) {
    return new Date(Date.now() - entity.rollingWindowHours * 60 * 60 * 1000).toISOString();
  }
  return watermark;
}

