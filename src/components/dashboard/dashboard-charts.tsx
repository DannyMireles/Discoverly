"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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
import type {
  CommissionStatusPoint,
  MonthlyRevenuePoint,
  TopAffiliatePoint,
  TopPropertyPoint,
} from "@/lib/company/charts";
import { formatCurrency } from "@/lib/utils/format";

const REVENUE_COLOR = "#1d4ed8";
const COMMISSIONS_PAID_COLOR = "#10b981";
const COMMISSIONS_ACCRUED_COLOR = "#f59e0b";
const BOOKING_PALETTE = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e"];
const AFFILIATE_PALETTE = ["#0ea5e9", "#14b8a6", "#10b981", "#84cc16", "#facc15"];
const PROPERTY_PALETTE = ["#f59e0b", "#fb923c", "#f97316", "#ef4444", "#ec4899"];
const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  eligible: "#3b82f6",
  approved: "#6366f1",
  paid: "#10b981",
  held: "#94a3b8",
  canceled: "#ef4444",
  clawback_needed: "#dc2626",
};

const tooltipStyle = { borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 8px 24px rgba(0,0,0,0.06)" };

export function RevenueOverTimeChart({
  data,
  onMonthClick,
}: {
  data: MonthlyRevenuePoint[];
  onMonthClick?: (point: MonthlyRevenuePoint) => void;
}) {
  const hasAny = data.some((p) => p.revenue > 0 || p.commissionsPaid > 0 || p.commissionsAccrued > 0);
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Revenue driven vs. commissions (last 6 months)</CardTitle>
      </CardHeader>
      <CardContent>
        {hasAny ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                onClick={(state) => {
                  const point = state?.activePayload?.[0]?.payload as MonthlyRevenuePoint | undefined;
                  if (point && onMonthClick) onMonthClick(point);
                }}
                style={onMonthClick ? { cursor: "pointer" } : undefined}
              >
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={REVENUE_COLOR} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={REVENUE_COLOR} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="commPaid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COMMISSIONS_PAID_COLOR} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={COMMISSIONS_PAID_COLOR} stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="commAccrued" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COMMISSIONS_ACCRUED_COLOR} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={COMMISSIONS_ACCRUED_COLOR} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), labelFor(name)]}
                  labelFormatter={(label) => `Month: ${label}`}
                  contentStyle={tooltipStyle}
                />
                <Legend formatter={(value) => labelFor(String(value))} wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke={REVENUE_COLOR} strokeWidth={2.5} fill="url(#rev)" />
                <Area type="monotone" dataKey="commissionsAccrued" stroke={COMMISSIONS_ACCRUED_COLOR} strokeWidth={2} fill="url(#commAccrued)" />
                <Area type="monotone" dataKey="commissionsPaid" stroke={COMMISSIONS_PAID_COLOR} strokeWidth={2} fill="url(#commPaid)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="Once paid affiliate bookings sync, revenue and commissions will trend here." />
        )}
      </CardContent>
    </Card>
  );
}

export function BookingsBarChart({
  data,
  onMonthClick,
}: {
  data: MonthlyRevenuePoint[];
  onMonthClick?: (point: MonthlyRevenuePoint) => void;
}) {
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
              <BarChart
                data={data}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                onClick={(state) => {
                  const point = state?.activePayload?.[0]?.payload as MonthlyRevenuePoint | undefined;
                  if (point && onMonthClick) onMonthClick(point);
                }}
                style={onMonthClick ? { cursor: "pointer" } : undefined}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={32} />
                <Tooltip
                  formatter={(value: number) => `${value} ${value === 1 ? "booking" : "bookings"}`}
                  labelFormatter={(label) => `Month: ${label}`}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="bookings" radius={[8, 8, 0, 0]}>
                  {data.map((_, index) => (
                    <Cell key={index} fill={BOOKING_PALETTE[index % BOOKING_PALETTE.length]} />
                  ))}
                </Bar>
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

export function TopAffiliatesChart({
  data,
  onAffiliateClick,
}: {
  data: TopAffiliatePoint[];
  onAffiliateClick?: (point: TopAffiliatePoint) => void;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top affiliates by revenue</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={data}
                margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                onClick={(state) => {
                  const point = state?.activePayload?.[0]?.payload as TopAffiliatePoint | undefined;
                  if (point && onAffiliateClick) onAffiliateClick(point);
                }}
                style={onAffiliateClick ? { cursor: "pointer" } : undefined}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" horizontal={false} />
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
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="revenue" radius={[0, 8, 8, 0]}>
                  {data.map((_, index) => (
                    <Cell key={index} fill={AFFILIATE_PALETTE[index % AFFILIATE_PALETTE.length]} />
                  ))}
                </Bar>
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

export function TopPropertiesChart({
  data,
  onPropertyClick,
}: {
  data: TopPropertyPoint[];
  onPropertyClick?: (point: TopPropertyPoint) => void;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top properties by revenue</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={data}
                margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                onClick={(state) => {
                  const point = state?.activePayload?.[0]?.payload as TopPropertyPoint | undefined;
                  if (point && onPropertyClick) onPropertyClick(point);
                }}
                style={onPropertyClick ? { cursor: "pointer" } : undefined}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="propertyId"
                  width={140}
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === "revenue" ? formatCurrency(value) : `${value} bookings`
                  }
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="revenue" radius={[0, 8, 8, 0]}>
                  {data.map((_, index) => (
                    <Cell key={index} fill={PROPERTY_PALETTE[index % PROPERTY_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="No revenue attributed to properties yet." />
        )}
      </CardContent>
    </Card>
  );
}

export function CommissionStatusChart({
  data,
  onStatusClick,
}: {
  data: CommissionStatusPoint[];
  onStatusClick?: (point: CommissionStatusPoint) => void;
}) {
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
                  onClick={(payload) => {
                    const point = (payload as unknown as { payload?: CommissionStatusPoint }).payload;
                    if (point && onStatusClick) onStatusClick(point);
                  }}
                  cursor={onStatusClick ? "pointer" : undefined}
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
                  contentStyle={tooltipStyle}
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

function labelFor(key: string) {
  if (key === "revenue") return "Revenue driven";
  if (key === "commissionsPaid") return "Commissions paid";
  if (key === "commissionsAccrued") return "Commissions accrued";
  return formatStatusLabel(key);
}
