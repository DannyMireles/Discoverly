"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CommissionStatusPoint, MonthlyRevenuePoint, TopAffiliatePoint } from "@/lib/company/charts";
import { formatCurrency } from "@/lib/utils/format";

const ACCENT = "#1e40af";
const ACCENT_LIGHT = "#3b82f6";
const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  eligible: "#3b82f6",
  approved: "#6366f1",
  paid: "#10b981",
  held: "#94a3b8",
  canceled: "#ef4444",
  clawback_needed: "#dc2626",
};

export function RevenueOverTimeChart({ data }: { data: MonthlyRevenuePoint[] }) {
  const hasAny = data.some((p) => p.revenue > 0);
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Revenue driven (last 6 months)</CardTitle>
      </CardHeader>
      <CardContent>
        {hasAny ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Month: ${label}`}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
                />
                <Area type="monotone" dataKey="revenue" stroke={ACCENT} strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="Once paid affiliate bookings sync, revenue will trend here." />
        )}
      </CardContent>
    </Card>
  );
}

export function BookingsBarChart({ data }: { data: MonthlyRevenuePoint[] }) {
  const hasAny = data.some((p) => p.bookings > 0);
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Paid bookings per month</CardTitle>
      </CardHeader>
      <CardContent>
        {hasAny ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={32} />
                <Tooltip
                  formatter={(value: number) => `${value} ${value === 1 ? "booking" : "bookings"}`}
                  labelFormatter={(label) => `Month: ${label}`}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
                />
                <Bar dataKey="bookings" fill={ACCENT_LIGHT} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="Paid affiliate-matched bookings will appear here once they sync." />
        )}
      </CardContent>
    </Card>
  );
}

export function TopAffiliatesChart({ data }: { data: TopAffiliatePoint[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top affiliates by revenue</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <XAxis
                  type="number"
                  tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === "revenue" ? formatCurrency(value) : `${value} bookings`
                  }
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
                />
                <Bar dataKey="revenue" fill={ACCENT} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="No revenue attributed to affiliates yet." />
        )}
      </CardContent>
    </Card>
  );
}

export function CommissionStatusChart({ data }: { data: CommissionStatusPoint[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Commissions by status</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="total"
                  nameKey="status"
                  innerRadius={56}
                  outerRadius={92}
                  paddingAngle={2}
                  stroke="#fff"
                >
                  {data.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, _name: unknown, item) => [
                    formatCurrency(value),
                    `${(item.payload as CommissionStatusPoint).count} commission(s)`,
                  ]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(value) => formatStatusLabel(String(value))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="Commissions will appear here once bookings start matching." />
        )}
      </CardContent>
    </Card>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-72 items-center justify-center text-sm text-slate-500">
      <p className="max-w-xs text-center">{message}</p>
    </div>
  );
}

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}
