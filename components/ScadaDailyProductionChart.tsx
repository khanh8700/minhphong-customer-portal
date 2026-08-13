"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ScadaDailyProduction } from "@/lib/scada-history";

type ScadaDailyProductionChartProps = {
  data: ScadaDailyProduction[];
  title?: string;
};

function formatProduction(value: number) {
  return value.toLocaleString("vi-VN", { maximumFractionDigits: 3 });
}

export function ScadaDailyProductionChart({ data, title = "Sản lượng nước theo ngày" }: ScadaDailyProductionChartProps) {
  if (data.length === 0) {
    return <div className="empty">Chưa có dữ liệu SCADA theo giờ để tạo biểu đồ.</div>;
  }

  const validDays = data.filter((item) => item.production !== null).length;

  return (
    <section style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, color: "var(--ink)" }}>{title}</h2>
          <p style={{ margin: "5px 0 0", color: "var(--muted)", fontSize: 13 }}>
            Chênh lệch chỉ số lưu lượng thuận trong ngày · dữ liệu tối đa 3 tháng
          </p>
        </div>
        <span className="badge">{validDays}/{data.length} ngày đủ dữ liệu</span>
      </div>

      <div style={{ height: 300, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={{ stroke: "#cbd5e1" }}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={54}
              tickFormatter={(value) => formatProduction(Number(value))}
            />
            <Tooltip
              cursor={{ fill: "rgba(14, 165, 233, 0.08)" }}
              contentStyle={{ borderRadius: 10, border: "1px solid #cbd5e1", boxShadow: "0 8px 20px rgba(15, 23, 42, 0.12)" }}
              formatter={(value) => {
                if (value === undefined || value === null) return ["Chưa đủ dữ liệu", "Sản lượng"];
                return [`${formatProduction(Number(value))} m³`, "Sản lượng"];
              }}
              labelFormatter={(_label, payload) => payload[0]?.payload?.date ?? ""}
            />
            <Bar dataKey="production" radius={[5, 5, 0, 0]} maxBarSize={34} name="Sản lượng">
              {data.map((item) => (
                <Cell key={item.date} fill={item.production === null ? "#cbd5e1" : "#0284c7"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {validDays < data.length && (
        <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 12 }}>
          Ngày bị trống là ngày có ít hơn 2 lần ghi nhận nên chưa thể tính chính xác sản lượng.
        </p>
      )}
    </section>
  );
}
