import { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "../api";
import Modal from "./Modal";

interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  isDeposit: boolean;
  depositFor: number | null;
  product: { id: number; name: string; volume: number | null };
}

interface Order {
  id: number;
  total: number;
  cashGiven: number | null;
  changeDue: number | null;
  registerId: number | null;
  register: { id: number; name: string } | null;
  note: string | null;
  customerType: string;
  createdAt: string;
  items: OrderItem[];
}

interface Props {
  onClose: () => void;
  onLoadCopy: (items: OrderItem[]) => void;
  onEditOrder: (items: OrderItem[]) => void;
  registers: { id: number; name: string }[];
  defaultRegisterId: number | null;
}

function formatEuro(n: number): string {
  return n.toFixed(2).replace(".", ",") + " €";
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const MM = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${MM}. ${hh}:${mm}`;
}

export default function OrderHistoryDialog({ onClose, onLoadCopy, onEditOrder, registers, defaultRegisterId }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filterRegisterId, setFilterRegisterId] = useState<number | null>(defaultRegisterId);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const fetchPage = useCallback(async (before?: number) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (before) params.set("before", String(before));
      const data = await apiFetch<{ orders: Order[]; hasMore: boolean }>(`/orders?${params}`);
      setOrders((prev) => [...prev, ...data.orders]);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPage().then(() => setInitialLoading(false));
  }, [fetchPage]);

  // Infinite scroll: IntersectionObserver on sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          const lastOrder = orders[orders.length - 1];
          if (lastOrder) fetchPage(lastOrder.id);
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [orders, hasMore, fetchPage]);

  function itemsSummary(order: Order): string {
    const visible = order.items.filter((i) => !i.isDeposit);
    if (visible.length === 0) return "—";
    return visible.map((i) => `${i.quantity}× ${i.product.name}`).join(", ");
  }

  const filteredOrders = filterRegisterId === null
    ? orders
    : orders.filter((o) => o.registerId === filterRegisterId);

  return (
    <Modal onClose={onClose}>
      <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-2xl flex flex-col" style={{ width: "calc(100vw - 12vh)", height: "88vh" }}>
        <div className="relative flex items-center justify-center mb-4">
          <h2 className="text-lg font-bold text-yellow-400">Order History</h2>
          <button
            onClick={onClose}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white text-sm touch-button"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Register filter */}
        <div className="flex items-center gap-2 mb-4 justify-center">
          <label className="text-xs text-gray-500">Register:</label>
          <select
            value={filterRegisterId ?? ""}
            onChange={(e) => setFilterRegisterId(e.target.value ? Number(e.target.value) : null)}
            className="bg-black text-white rounded px-2 py-1 text-xs border border-gray-700"
            style={{ colorScheme: "dark" }}
          >
            <option value="">All Registers</option>
            {registers.map((r) => (
              <option key={r.id} value={r.id} className="bg-[#111]">{r.name}</option>
            ))}
          </select>
        </div>

        {initialLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">Loading...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No orders found</div>
        ) : (
          <div className="flex-1 overflow-y-auto" data-scrollable>
            <table className="w-full text-sm text-left">
              <thead className="sticky top-0 bg-[#111] z-10">
                <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase">
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Register</th>
                  <th className="py-2 px-3">Items</th>
                  <th className="py-2 px-3 text-right">Total</th>
                  <th className="py-2 px-3">Customer</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-800/50 hover:bg-white/5">
                    <td className="py-2 px-3 text-gray-400 whitespace-nowrap font-mono text-xs">
                      {formatTime(order.createdAt)}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">{order.register?.name || "—"}</td>
                    <td className="py-2 px-3 text-gray-300 max-w-[300px] truncate">
                      {itemsSummary(order)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-400 whitespace-nowrap">
                      {formatEuro(order.total)}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-gray-400">
                      {order.customerType}
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => onLoadCopy(order.items)}
                          className="text-xs px-2 py-1 rounded bg-gray-700 text-white hover:bg-gray-600 touch-button"
                        >
                          Load Copy
                        </button>
                        <button
                          onClick={() => onEditOrder(order.items)}
                          className="text-xs px-2 py-1 rounded bg-gray-700 text-white hover:bg-gray-600 touch-button"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" />
            {loading && (
              <div className="text-center py-4 text-gray-500 text-xs">Loading more...</div>
            )}
            {!hasMore && filteredOrders.length > 0 && (
              <div className="text-center py-4 text-gray-600 text-xs">— End of history —</div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
