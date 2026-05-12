"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BlogAdminMetrics } from "@/lib/blog/service";

type Props = {
  data: BlogAdminMetrics["viewsLast7Days"];
};

export default function AdminBlogViewsChart({ data }: Props) {
  const hasViews = data.some((item) => item.views > 0);

  return (
    <div className="h-64 min-w-0 w-full">
      {hasViews ? (
        <ResponsiveContainer width="100%" height={256} minWidth={280} minHeight={256}>
          <LineChart data={data} margin={{ left: -24, right: 8, top: 12, bottom: 0 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }}
            />
            <Tooltip
              cursor={{ stroke: "#0f172a", strokeWidth: 1, strokeDasharray: "4 4" }}
              contentStyle={{
                border: "1px solid #e2e8f0",
                borderRadius: 16,
                boxShadow: "0 18px 50px rgba(15, 23, 42, 0.12)",
                fontWeight: 800,
              }}
              labelStyle={{ color: "#334155" }}
            />
            <Line
              type="monotone"
              dataKey="views"
              stroke="#0f172a"
              strokeWidth={3}
              dot={{ r: 4, fill: "#f8fafc", stroke: "#0f172a", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "#0f172a" }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm font-bold leading-6 text-slate-500">
          Sem leituras registradas nos ultimos 7 dias.
        </div>
      )}
    </div>
  );
}
