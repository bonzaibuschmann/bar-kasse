import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch, isLoggedIn, logout } from "../api";
import { DashboardSummary } from "../types";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) { navigate("/login"); return; }
    loadSummary();
    const interval = setInterval(loadSummary, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadSummary() {
    try {
      const data = await apiFetch<DashboardSummary>("/dashboard/summary");
      setSummary(data);
    } catch (err: any) {
      if (err.message.includes("401") || err.message.includes("403")) {
        logout(); navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }

  function formatEuro(n: number): string {
    return n.toFixed(2).replace(".", ",") + " €";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!summary) return null;

  const hours = Object.entries(summary.hourlyData)
    .filter(([, v]) => v.count > 0)
    .sort(([a], [b]) => Number(a) - Number(b));

  return (
    <div className="min-h-screen no-select p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-yellow-400">📊 Dashboard</h1>
        <div className="flex gap-3">
          <Link to="/" className="text-gray-500 hover:text-white text-sm">← Register</Link>
          <Link to="/config" className="text-gray-500 hover:text-white text-sm">Config</Link>
          <button onClick={() => { logout(); navigate("/login"); }} className="text-red-400 hover:text-red-300 text-sm">
            Logout
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Today Revenue" value={formatEuro(summary.todayRevenue)} color="text-emerald-400" />
        <StatCard label="Today Orders" value={summary.todayOrders.toString()} color="text-yellow-400" />
        <StatCard label="Total Revenue" value={formatEuro(summary.totalRevenue)} color="text-emerald-400" />
        <StatCard label="Total Orders" value={summary.totalOrders.toString()} color="text-yellow-400" />
        <StatCard label="Avg. Order Value" value={formatEuro(summary.avgOrderValue)} color="text-blue-400" />
      </div>

      {/* Register breakdown */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Register Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summary.registers.map((r) => (
            <div key={r.register} className="bg-[#111] border border-gray-800 p-4 rounded-xl">
              <div className="text-gray-500 text-sm mb-1">Register {r.register}</div>
              <div className="text-2xl font-bold text-emerald-400">{formatEuro(r.revenue)}</div>
              <div className="text-gray-600 text-sm">{r.orderCount} orders</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top products */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Top Products</h2>
        <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden">
          {summary.topProducts.map((tp, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-gray-800 last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-yellow-400 font-bold w-8">#{i + 1}</span>
                <span>{tp.product?.name || "Unknown"}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-500 text-sm">{tp.totalQuantity}× sold</span>
                <span className="text-emerald-400 font-mono">{tp.orderCount} orders</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hourly chart */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Today: Hourly Breakdown</h2>
        <div className="bg-[#111] border border-gray-800 rounded-xl p-4">
          <div className="flex items-end gap-1 h-40">
            {hours.map(([hour, data]) => {
              const maxRevenue = Math.max(...hours.map(([, d]) => d.revenue));
              const heightPct = maxRevenue > 0 ? (data.revenue / maxRevenue) * 100 : 0;
              return (
                <div key={hour} className="flex-1 flex flex-col items-center">
                  <div className="text-xs text-gray-500 mb-1">{formatEuro(data.revenue)}</div>
                  <div className="w-full bg-rose-600 rounded-t" style={{ height: `${Math.max(heightPct, 4)}%` }} />
                  <div className="text-xs text-gray-600 mt-1">{hour}:00</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#111] border border-gray-800 p-4 rounded-xl">
      <div className="text-gray-500 text-sm mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
