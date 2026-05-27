import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { apiFetch, isLoggedIn, logout } from "../api";
import { Product, CartItem } from "../types";
import { useData } from "../DataContext";
import Basket from "../components/Basket";
import EuroBill from "../components/EuroBill";
import ProductGrid from "../components/ProductGrid";
import ProductEditDialog from "../components/ProductEditDialog";
import Modal from "../components/Modal";
import OrderHistoryDialog from "../components/OrderHistoryDialog";

const BILLS = [100, 50, 20, 10, 5];
const COIN_ROWS: { amount: number; image: string; diameter: number }[][] = [
  [
    { amount: 2,    image: "/coins/2e.png",   diameter: 25.75 },
    { amount: 1,    image: "/coins/1e.png",   diameter: 23.25 },
    { amount: 0.5,  image: "/coins/50ct.png", diameter: 24.25 },
    { amount: 0.2,  image: "/coins/20ct.png", diameter: 22.25 },
  ],
  [
    { amount: 0.1,  image: "/coins/10ct.png", diameter: 19.75 },
    { amount: 0.05, image: "/coins/5ct.png",  diameter: 21.25 },
    { amount: 0.02, image: "/coins/2ct.png",  diameter: 18.75 },
    { amount: 0.01, image: "/coins/1ct.png",  diameter: 16.25 },
  ],
];

const MAX_COIN_DIAMETER = 25.75;

// Bill pixel widths from cropped images (used for proportional sizing)
const BILL_PIXEL_WIDTHS: Record<number, number> = { 100: 300, 50: 286, 20: 271, 10: 259, 5: 245 };
const BILL_PIXEL_HEIGHTS: Record<number, number> = { 100: 156, 50: 110, 20: 104, 10: 92, 5: 83 };
const BIGGEST_BILL_W = 300;

function CalcPanel({ handedAmount, setHandedAmount, billCounts, setBillCounts, coinCounts, setCoinCounts, total, formatEuro }: {
  handedAmount: number;
  setHandedAmount: React.Dispatch<React.SetStateAction<number>>;
  billCounts: Record<number, number>;
  setBillCounts: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  coinCounts: Record<number, number>;
  setCoinCounts: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  total: number;
  formatEuro: (n: number) => string;
}) {
  const calcRef = useRef<HTMLDivElement>(null);
  const [billMaxWidth, setBillMaxWidth] = useState(160);
  const [coinScale, setCoinScale] = useState(1);

  useEffect(() => {
    const el = calcRef.current;
    if (!el) return;

    const measure = () => {
      const h = el.clientHeight;
      const w = el.clientWidth;
      if (h <= 0 || h < 60) return;

      // Bills: 3 rows * tallest bill per row
      const billRowsTallest = [157, 146, 123];
      const billHeightPerW = billRowsTallest.reduce((s, h2) => s + h2, 0) / BIGGEST_BILL_W;
      const billGapsH = 2 * 4;
      const billPadTop = 8;

      // Coin section base: 2 rows * 56px + 1 gap * 6px + pt-2 + pb-1 = 130
      const coinBaseH = 130;

      // Width: row 1 has 2 bills
      const row1W = 1 + BILL_PIXEL_WIDTHS[50] / BIGGEST_BILL_W;
      const maxFromWidth = Math.floor((w - 24 - 8) / row1W);

      // billPadTop + bw * billHeightPerW + billGapsH + cs * coinBaseH = h
      let bw = Math.floor((h - billPadTop - billGapsH - coinBaseH) / billHeightPerW);
      bw = Math.max(60, Math.min(bw, maxFromWidth));

      const billTotalH = billPadTop + bw * billHeightPerW + billGapsH;
      const csFromHeight = Math.max(0.35, (h - billTotalH) / coinBaseH);
      // Cap coin scale to available width — widest row: 4 coins + 3 gaps
      const widestCoinRow = (25.75 + 23.25 + 24.25 + 22.25) / MAX_COIN_DIAMETER * 56 + 3 * 8;
      const csFromWidth = (w - 24) / widestCoinRow;
      const cs = Math.min(csFromHeight, csFromWidth);

      setBillMaxWidth(bw);
      setCoinScale(cs);
    };

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // Let the DOM settle then measure twice
    requestAnimationFrame(() => requestAnimationFrame(measure));
    return () => ro.disconnect();
  }, []);

  // Split bills into rows: max 2 per row
  const BILL_ROWS = [[100, 50], [20, 10], [5]];

  return (
    <div ref={calcRef} className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-3 pt-2 flex flex-col items-center gap-1 shrink-0">
        {BILL_ROWS.map((row, ri) => (
          <div key={ri} className="flex gap-2 justify-center items-start">
            {row.map((amount) => (
              <EuroBill
                key={amount}
                amount={amount}
                count={billCounts[amount] || 0}
                onClick={() => {
                  setHandedAmount((p) => Math.round((p + amount) * 100) / 100);
                  setBillCounts((prev) => ({ ...prev, [amount]: (prev[amount] || 0) + 1 }));
                }}
                className="hover:brightness-110 active:brightness-90 transition-all"
                maxWidth={billMaxWidth}
              />
            ))}
          </div>
        ))}
      </div>

      <div data-coins className="px-3 pt-2 pb-1 shrink-0 flex flex-col gap-1.5 items-center">
        {COIN_ROWS.map((row, ri) => (
          <div key={ri} className="flex gap-2 justify-center items-center flex-wrap">
            {row.map((coin) => {
              const size = (coin.diameter / MAX_COIN_DIAMETER) * 56 * coinScale;
              const coinAmt = coin.amount;
              const coinCnt = coinCounts[coinAmt] || 0;
              const hasCount = coinCnt > 0;
              return (
                <button
                  key={coin.amount}
                  onPointerDown={() => {
                    setHandedAmount((p) => Math.round((p + coinAmt) * 100) / 100);
                    setCoinCounts((prev) => ({ ...prev, [coinAmt]: (prev[coinAmt] || 0) + 1 }));
                  }}
                  className="rounded-full touch-button hover:brightness-110 active:brightness-90 transform transition-transform active:scale-95 overflow-hidden relative"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    boxShadow: hasCount ? "inset 0 0 0 3px rgba(0,0,0,0.55)" : undefined,
                    opacity: hasCount ? 1 : 0.55,
                  }}
                >
                  <img src={coin.image} alt={`${coinAmt}`} className="w-full h-full object-cover rounded-full" />
                  {hasCount && (
                    <div className="absolute flex items-center justify-center"
                      style={{
                        top: "6px", right: "6px",
                        width: "25px", height: "25px", borderRadius: "50%",
                        backgroundColor: "rgba(0,0,0,0.85)",
                        color: "#fff", fontSize: "18px", fontWeight: "bold", pointerEvents: "none",
                      }}
                    >{coinCnt}</div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex-1" />
    </div>
  );
}

export default function RegisterPage() {
  const { categories, registers: allRegisters, staffGroups, containers, layouts, specialBox, connected, editProducts, startEditMode, updateEditProduct, endEditMode, setConfigSuppressed, hasSuppressedConfig, flushSuppressedConfig, commitProductEdits } = useData();
  const [selectedRegisterId, setSelectedRegisterId] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const undoStackRef = useRef<CartItem[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const cartRef = useRef<CartItem[]>([]);
  const [customerType, setCustomerType] = useState("Guest");
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  const [view, setView] = useState<"order" | "calc">("order");
  const [handedAmount, setHandedAmount] = useState(0);
  const [billCounts, setBillCounts] = useState<Record<number, number>>({});
  const [coinCounts, setCoinCounts] = useState<Record<number, number>>({});
  const [editMode, setEditMode] = useState(false);
  const [gridRebuildKey, setGridRebuildKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showSpecialDialog, setShowSpecialDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editedOrderId, setEditedOrderId] = useState<number | null>(null);
  const [specialCents, setSpecialCents] = useState(0);
  const [specialHasDecimal, setSpecialHasDecimal] = useState(false);
  const [specialDecimals, setSpecialDecimals] = useState(0);
  // Special product — server-driven from SpecialBox table
  const specialProduct = useMemo<Product>(() => {
    const box = specialBox;
    return {
      id: -1,
      name: box?.name || "Special",
      price: box?.price ?? 5,
      volume: null,
      active: true,
      display: true,
      categoryId: -1,
      isDeposit: false,
      deposit: null,
      depositId: null,
      color: box?.color || "#b45309",
      icon: box?.icon || null,
      image: box?.image || null,
      defaultContainerId: null,
      defaultContainer: null,
    } as Product;
  }, [specialBox]);
  // Editable overrides for container virtual products (name, price, active, image — color moved to GridLayout)
  const [containerOverrides, setContainerOverrides] = useState<Record<number, { name?: string; price?: number; active?: boolean; image?: string | null }>>(() => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem("containerOverrides") : null;
    if (saved) { try { return JSON.parse(saved); } catch {} }
    return {};
  });
  const [admin, setAdmin] = useState(isLoggedIn());
  const saveLayoutRef = useRef<(() => Promise<void>) | null>(null);
  const editBufferRef = useRef<Array<{ productId: number; name: string; price: number; volume: number | null; active: boolean; display: boolean; categoryId: number; color: string; icon?: string | null; image?: string | null; defaultContainerId?: number | null }>>([]);

  // effectiveSpecialProduct is now merged into specialProduct above
  // (color overlay from GridLayout handled in the specialProduct useMemo)

  // Build virtual container products: return (←) and additional (+) per container
  // Color/icon come from the Container table (synced across clients)
  const containerProducts = useMemo(() => {
    return containers.flatMap((c) => {
      const returnId = -(5000 + c.id * 2);
      const addId = -(5000 + c.id * 2 + 1);
      const returnOv = containerOverrides[returnId] || {};
      const addOv = containerOverrides[addId] || {};
      return [
        {
          id: returnId,
          name: returnOv.name ?? `← ${c.name}`,
          price: returnOv.price ?? -c.deposit,
          volume: null,
          categoryId: -1,
          isDeposit: false,
          active: returnOv.active ?? true,
          display: true,
          order: 0,
          color: c.inboundColor || "#1e3a5f",
          image: returnOv.image !== undefined ? returnOv.image : c.image,
          depositId: null,
          deposit: null,
          depositFor: [],
          defaultContainerId: null,
          defaultContainer: null,
        } as Product,
        {
          id: addId,
          name: addOv.name ?? `+ ${c.name}`,
          price: addOv.price ?? c.deposit,
          volume: null,
          categoryId: -1,
          isDeposit: false,
          active: addOv.active ?? true,
          display: true,
          order: 0,
          color: c.outboundColor || "#92400e",
          image: addOv.image !== undefined ? addOv.image : c.image,
          depositId: null,
          deposit: null,
          depositFor: [],
          defaultContainerId: null,
          defaultContainer: null,
        } as Product,
      ];
    });
  }, [containers, containerOverrides, layouts]);

  // Checkout double-tap
  const [checkoutPhase, setCheckoutPhase] = useState(0);
  const checkoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkoutCartRef = useRef<string>("");
  const rootRef = useRef<HTMLDivElement>(null);

  // Non-passive touchmove to kill iPad rubber-band overscroll
  // React's onTouchMove is passive on mobile so preventDefault() has no effect.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const inScrollable = target.closest('[data-scrollable], #basket-scroll');
      if (!inScrollable) e.preventDefault();
    };
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, []);

  const registers = allRegisters.filter((r) => r.active);

  // Listen for login/logout changes
  useEffect(() => {
    const check = () => setAdmin(isLoggedIn());
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, []);

  useEffect(() => {
    if (registers.length > 0 && !registers.find((r) => r.id === selectedRegisterId)) {
      setSelectedRegisterId(registers[0].id);
    }
  }, [registers]);

  const orderSignature = JSON.stringify(cart.map((i) => `${i.productId}-${i.quantity}`)) + "|" + customerType;

  // Keep cartRef synced with latest cart for undo snapshotting
  useEffect(() => { cartRef.current = cart; }, [cart]);

  // Push current cart onto undo stack (max 50), to be called BEFORE any cart mutation
  const pushUndo = () => {
    const snapshot = cartRef.current;
    if (snapshot.length === 0) return;
    undoStackRef.current.push(snapshot.map((item) => ({ ...item, depositFor: item.depositFor })));
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
    setCanUndo(true);
  };

  function undo() {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    setCart(stack.pop()!);
    if (stack.length === 0) setCanUndo(false);
  }

  useEffect(() => {
    if (checkoutPhase > 0 && checkoutCartRef.current !== orderSignature) {
      setCheckoutPhase(0);
      if (checkoutTimerRef.current) {
        clearTimeout(checkoutTimerRef.current);
        checkoutTimerRef.current = null;
      }
    }
  }, [orderSignature, checkoutPhase]);

  const addToCart = useCallback((product: Product) => {
    pushUndo();
    setCart((prev) => {
      const newCart = [...prev];
      const existingIdx = newCart.findIndex(
        (item) => item.productId === product.id && !item.isDeposit && item.depositFor === null && !item.containerFor
      );
      if (existingIdx >= 0) {
        newCart[existingIdx] = { ...newCart[existingIdx], quantity: newCart[existingIdx].quantity + 1 };
        // Sync attached container row quantity
        for (let i = 0; i < newCart.length; i++) {
          if (newCart[i].containerFor === existingIdx) {
            newCart[i] = { ...newCart[i], quantity: newCart[existingIdx].quantity };
          }
        }
      } else {
        newCart.push({
          productId: product.id, productName: product.name, volume: product.volume,
          unitPrice: product.price, quantity: 1, isDeposit: false, depositFor: null, depositId: null,
          containerFor: undefined, containerName: undefined, containerDeposit: undefined,
        });
        // Auto-add default container as a tied row
        if (product.defaultContainerId && product.defaultContainer) {
          newCart.push({
            productId: product.defaultContainer.id,
            productName: product.defaultContainer.name,
            volume: null,
            unitPrice: product.defaultContainer.deposit,
            quantity: 1,
            isDeposit: false,
            depositFor: null,
            depositId: null,
            containerFor: newCart.length - 1, // links to the parent product row
            containerName: undefined,
            containerDeposit: undefined,
          });
        }
        if (product.depositId && product.deposit) {
          const parentIdx = newCart.length - 1;
          newCart.push({
            productId: product.deposit.id, productName: product.deposit.name, volume: null,
            unitPrice: product.deposit.price, quantity: 1, isDeposit: true,
            depositFor: parentIdx, depositId: product.deposit.id,
            containerFor: undefined, containerName: undefined, containerDeposit: undefined,
          });
        }
      }
      return newCart;
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    pushUndo();
    setCart((prev) => {
      const newCart = [...prev];
      const item = newCart[index];
      if (!item.isDeposit) {
        for (let i = newCart.length - 1; i >= 0; i--) {
          if (newCart[i].depositFor === index || newCart[i].containerFor === index) newCart.splice(i, 1);
        }
      }
      newCart.splice(index, 1);
      for (let i = 0; i < newCart.length; i++) {
        if (newCart[i].depositFor != null && newCart[i].depositFor! > index) {
          newCart[i] = { ...newCart[i], depositFor: newCart[i].depositFor! - 1 };
        }
        if (newCart[i].containerFor != null && newCart[i].containerFor! > index) {
          newCart[i] = { ...newCart[i], containerFor: newCart[i].containerFor! - 1 };
        }
      }
      return newCart;
    });
  }, []);

  const removeDepositOnly = useCallback((index: number) => {
    pushUndo();
    setCart((prev) => {
      const newCart = [...prev];
      newCart.splice(index, 1);
      for (let i = 0; i < newCart.length; i++) {
        if (newCart[i].depositFor != null && newCart[i].depositFor! > index) {
          newCart[i] = { ...newCart[i], depositFor: newCart[i].depositFor! - 1 };
        }
        if (newCart[i].containerFor != null && newCart[i].containerFor! > index) {
          newCart[i] = { ...newCart[i], containerFor: newCart[i].containerFor! - 1 };
        }
      }
      return newCart;
    });
  }, []);

  const changeQuantity = useCallback((index: number, delta: number) => {
    pushUndo();
    setCart((prev) => {
      const newCart = [...prev];
      const item = newCart[index];
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        // Remove the item and any container/deposit rows tied to it
        return newCart.filter((_, i) => {
          if (i === index) return false;
          if (newCart[i].containerFor === index) return false;
          if (newCart[i].depositFor === index) return false;
          return true;
        });
      }
      newCart[index] = { ...item, quantity: newQty };
      // Sync attached container row quantity
      for (let i = 0; i < newCart.length; i++) {
        if (newCart[i].containerFor === index) {
          newCart[i] = { ...newCart[i], quantity: newQty };
        }
      }
      return newCart;
    });
  }, []);

  const total = cart.reduce((sum: number, item: CartItem) => sum + item.unitPrice * item.quantity, 0);

  async function submitOrder() {
    const cashGiven = view === "calc" && handedAmount > 0 ? handedAmount : undefined;
    setCheckoutPhase(2);
    try {
      const items = cart.map((item) => ({
        productId: item.productId, quantity: item.quantity,
        isDeposit: item.isDeposit, depositFor: item.depositFor,
      }));
      const body = { items, cashGiven, registerId: selectedRegisterId, customerType };
      if (editedOrderId !== null) {
        await apiFetch(`/orders/${editedOrderId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        setEditedOrderId(null);
      } else {
        await apiFetch("/orders", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      clearCart();
      setCustomerType("Guest");
      setHandedAmount(0);
      setBillCounts({});
      setCoinCounts({});
      setView("order");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
    setCheckoutPhase(0);
    checkoutCartRef.current = "";
  }

  function handleCheckoutTap() {
    if (cart.length === 0 || checkoutPhase === 2) return;
    if (checkoutPhase === 0) {
      checkoutCartRef.current = orderSignature;
      setCheckoutPhase(1);
      checkoutTimerRef.current = setTimeout(() => {
        setCheckoutPhase(0);
        checkoutTimerRef.current = null;
      }, 1500);
    } else if (checkoutPhase === 1) {
      if (checkoutCartRef.current === orderSignature) {
        if (checkoutTimerRef.current) { clearTimeout(checkoutTimerRef.current); checkoutTimerRef.current = null; }
        submitOrder();
      } else {
        setCheckoutPhase(0);
      }
    }
  }

  function clearCart() {
    if (cart.length === 0) return;
    pushUndo();
    setCart([]);
  }

  // Load order items into cart from history (deposits are handled by addToCart logic)
  function handleLoadCopy(items: Array<{ productId: number; product: { id: number; name: string; volume: number | null }; quantity: number; unitPrice: number; isDeposit: boolean; depositFor: number | null }>) {
    loadOrderItems(items);
    setShowHistory(false);
  }

  // Edit an order from history — load items, set editedOrderId, switch to order panel
  function handleEditOrder(orderId: number, items: Array<{ productId: number; product: { id: number; name: string; volume: number | null }; quantity: number; unitPrice: number; isDeposit: boolean; depositFor: number | null }>) {
    loadOrderItems(items);
    setEditedOrderId(orderId);
    switchView("order");
    setShowHistory(false);
  }

  function loadOrderItems(items: Array<{ productId: number; product: { id: number; name: string; volume: number | null }; quantity: number; unitPrice: number; isDeposit: boolean; depositFor: number | null }>) {
    pushUndo();
    const newCart: CartItem[] = [];
    for (const item of items) {
      newCart.push({
        productId: item.productId,
        productName: item.product.name,
        volume: item.product.volume ?? null,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        isDeposit: item.isDeposit,
        depositFor: item.depositFor ?? null,
        depositId: item.isDeposit ? item.productId : null,
      });
    }
    // Re-index depositFor references (they point to positions in the original order)
    // In the original order, depositFor is an index into the items array.
    // We map old index to new index for non-deposit items.
    const oldToNew = new Map<number, number>();
    let newIdx = 0;
    for (let i = 0; i < items.length; i++) {
      if (!items[i].isDeposit) {
        oldToNew.set(i, newIdx);
        newIdx++;
      }
    }
    for (const ci of newCart) {
      if (ci.isDeposit && ci.depositFor !== null) {
        ci.depositFor = oldToNew.get(ci.depositFor) ?? null;
      }
    }
    setCart(newCart);
  }

  function addSpecialItem(price: number) {
    const pid = -(Math.round(price * 100)); // same price = same productId → groups in basket
    pushUndo();
    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.productId === pid);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], quantity: updated[existingIdx].quantity + 1 };
        return updated;
      }
      return [...prev, {
        productId: pid,
        productName: specialProduct.name, volume: null,
        unitPrice: price, quantity: 1, isDeposit: false,
        depositFor: null, depositId: null,
      }];
    });
  }

  function handleTapSpecial() {
    setSpecialCents(0);
    setSpecialHasDecimal(false);
    setSpecialDecimals(0);
    setShowSpecialDialog(true);
  }

  function handleTapContainer(product: Product) {
    pushUndo();
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.productId === product.id && !item.containerFor
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], quantity: updated[existingIdx].quantity + 1 };
        return updated;
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        volume: null,
        unitPrice: product.price,
        quantity: 1,
        isDeposit: false,
        depositFor: null,
        depositId: null,
        containerFor: undefined as any,
      }];
    });
  }

  function specialDigit(d: number) {
    if (!specialHasDecimal) {
      setSpecialCents(c => c * 10 + d);
    } else if (specialDecimals < 2) {
      setSpecialCents(c => c * 10 + d);
      setSpecialDecimals(d => d + 1);
    }
  }

  function specialDecimal() {
    if (!specialHasDecimal) {
      setSpecialHasDecimal(true);
      setSpecialDecimals(0);
    }
  }

  function specialBackspace() {
    if (specialDecimals > 0) {
      setSpecialCents(c => Math.floor(c / 10));
      setSpecialDecimals(d => d - 1);
    } else if (specialHasDecimal) {
      setSpecialHasDecimal(false);
    } else {
      setSpecialCents(c => Math.floor(c / 10));
    }
  }

  function specialDisplay(): string {
    const eur = Math.floor(specialCents / 100);
    const ct = specialCents % 100;
    return `${eur},${String(ct).padStart(2, "0")} €`;
  }

  function formatVolume(v: number | null): string {
    return v ? `${v}L` : "";
  }

  function formatEuro(n: number): string {
    return n.toFixed(2).replace(".", ",") + " €";
  }

  const isGuest = customerType === "Guest";
  function selectStaff(name: string) { setCustomerType(name); setShowStaffDialog(false); }



  function switchView(v: "order" | "calc") {
    setView(v);
  }

  const cashback = handedAmount - total;

  function handleLogout() {
    if (editMode) {
      setConfigSuppressed(false);
      editBufferRef.current = [];
      endEditMode();
    }
    logout();
    setAdmin(false);
    setEditMode(false);
  }

  function handleEnterEdit() {
    startEditMode();
    setConfigSuppressed(true);
    editBufferRef.current = [];
    setEditMode(true);
  }

  async function handleSaveEdit() {
    setSaving(true);
    try {
      // Snapshot edits before clearing the buffer
      const bufferedEdits = [...editBufferRef.current];
      editBufferRef.current = [];

      // Send all buffered product changes
      for (const data of bufferedEdits) {
        if (data.productId === -1) {
          // Special product — persist to server via PUT /api/special-box
          try {
            await apiFetch("/special-box", {
              method: "PUT",
              body: JSON.stringify({ name: data.name, price: data.price, color: data.color, icon: data.icon, image: data.image }),
            });
          } catch (err: any) {
            console.error("Failed to save special box:", err);
          }
          continue;
        }
        if (data.productId < -1) {
          // Container product — persist to Container table and localStorage overrides
          const containerId = Math.floor((-data.productId - 5000) / 2);
          const isInbound = (-data.productId) % 2 === 0;
          // Update localStorage overrides for name/price/active/image
          setContainerOverrides(prev => {
            const next = { ...prev, [data.productId]: { name: data.name, price: data.price, active: data.active, image: data.image } };
            localStorage.setItem("containerOverrides", JSON.stringify(next));
            return next;
          });
          // Persist color to Container table
          try {
            const colorField = isInbound ? "inboundColor" : "outboundColor";
            await apiFetch(`/containers/${containerId}`, {
              method: "PUT",
              body: JSON.stringify({ [colorField]: data.color }),
            });
          } catch (err: any) {
            console.error("Failed to save container color:", err);
          }
          continue;
        }
        try {
          await apiFetch(`/products/${data.productId}`, {
            method: "PUT",
            body: JSON.stringify(data),
          });
        } catch (err: any) {
          console.error("Failed to save product:", err);
        }
      }

      // Apply edits directly to allProducts (bypasses WebSocket timing)
      commitProductEdits(bufferedEdits);

      // Save layout
      if (saveLayoutRef.current) {
        await saveLayoutRef.current();
      }

      // Apply any config that was buffered during save.
      // The PUT /api/layouts triggers a WebSocket broadcast with the new layouts,
      // but suppression was still active — the config got buffered. We must apply
      // it before clearing suppression, otherwise layouts revert to pre-edit state.
      if (hasSuppressedConfig()) {
        flushSuppressedConfig();
      }

      // Exit edit mode — backend broadcasts will keep other clients in sync
      setConfigSuppressed(false);
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    editBufferRef.current = [];
    endEditMode();  // Discard buffered products
    const hadSuppressed = hasSuppressedConfig();
    if (hadSuppressed) {
      flushSuppressedConfig();
    }
    setConfigSuppressed(false);
    setEditMode(false);
    setGridRebuildKey((k) => k + 1);  // force grid to revert to saved positions
    // If no suppressed config arrived, re-fetch current state from backend
    if (!hadSuppressed) {
      apiFetch("/config").catch(() => {});
    }
  }

  return (
    <div
      ref={rootRef}
      className="flex flex-col h-screen no-select"
      style={{ overscrollBehavior: "none", overflow: "hidden" }}
    >
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Products */}
        <div className="flex-1 flex flex-col p-3 overflow-hidden relative" style={editMode ? { boxShadow: "inset 0 0 0 2px rgb(250, 204, 21)" } : undefined}>
          <ProductGrid
            categories={categories}
            layouts={layouts}
            editMode={editMode}
            dialogOpen={editingProduct !== null || showSpecialDialog || showStaffDialog || showHistory}
            targetProducts={editProducts ?? undefined}
            rebuildKey={gridRebuildKey}
            onAddToCart={addToCart}
            onEditProduct={(p) => setEditingProduct(p)}
            saveLayoutRef={saveLayoutRef}
            specialProduct={specialProduct}
            onTapSpecial={handleTapSpecial}
            onEditSpecial={() => setEditingProduct({ ...specialProduct, id: -1 } as Product)}
            containerProducts={containerProducts}
            onTapContainer={handleTapContainer}
          />
        </div>

        {/* Right sidebar */}
        <div className="w-[360px] border-l border-gray-800 flex flex-col bg-[#111]">
          {/* Nav */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
            <div className="flex items-center gap-2">
              {!connected && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-600 text-white animate-pulse">OFFLINE</span>
              )}
              {admin ? (
                <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-white">LogOut</button>
              ) : (
                <Link to="/login" className="text-xs text-gray-500 hover:text-white">LogIn</Link>
              )}
              <select value={selectedRegisterId ?? ""} onChange={(e) => setSelectedRegisterId(e.target.value ? Number(e.target.value) : null)}
                className="bg-black text-white rounded p-0 text-xs border border-gray-700" style={{ colorScheme: "dark" }}>
                {registers.map((r) => <option key={r.id} value={r.id} className="bg-[#111]">{r.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3">
              {admin && (
                <>
                  {!editMode ? (
                    <button
                      onClick={handleEnterEdit}
                      className="text-xs px-[5px] py-[2px] rounded bg-gray-700 text-white hover:bg-gray-600 touch-button inline-flex items-center justify-center"
                    >
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        disabled={saving}
                        className="text-xs px-[5px] py-[2px] rounded bg-emerald-600 text-white hover:bg-emerald-500 touch-button disabled:opacity-70 inline-flex items-center justify-center"
                      >
                        <span className="relative inline-flex items-center justify-center">
                          <span style={{ visibility: saving ? "hidden" : "visible" }}>Save</span>
                          {saving && (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            </span>
                          )}
                        </span>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-xs px-[5px] py-[2px] rounded bg-gray-600 text-white hover:bg-gray-500 touch-button inline-flex items-center justify-center"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  <Link to="/dashboard" className="text-xs text-gray-500 hover:text-white">Dashboard</Link>
                  <Link to="/config" className="text-xs text-gray-500 hover:text-white">Config</Link>
                </>
              )}
            </div>
          </div>

          {/* Order / Calc toggle */}
          <div className="flex border-b border-gray-800">
            <button
              onClick={() => switchView("order")}
              className={`flex-1 py-2 text-sm font-bold touch-button border-b-2 transition-colors ${
                view === "order"
                  ? "text-yellow-400 border-yellow-400 bg-yellow-400/5"
                  : "text-gray-500 border-transparent hover:text-gray-300"
              }`}
            >
              Order
            </button>
            <button
              onClick={() => switchView("calc")}
              className={`flex-1 py-2 text-sm font-bold touch-button border-b-2 transition-colors ${
                view === "calc"
                  ? "text-emerald-400 border-emerald-400 bg-emerald-400/5"
                  : "text-gray-500 border-transparent hover:text-gray-300"
              }`}
            >
              Calc
            </button>
          </div>

          {view === "order" ? (
            <Basket
              cart={cart} total={total} removeItem={removeItem} removeDepositOnly={removeDepositOnly}
              changeQuantity={changeQuantity} clearCart={clearCart} undo={undo} canUndo={canUndo}
              onHistory={() => setShowHistory(true)}
            />
          ) : (
            <CalcPanel
              handedAmount={handedAmount}
              setHandedAmount={setHandedAmount}
              billCounts={billCounts}
              setBillCounts={setBillCounts}
              coinCounts={coinCounts}
              setCoinCounts={setCoinCounts}
              total={total}
              formatEuro={formatEuro}
            />
          )}

          {/* Given / Change bar — always visible on Calc, only when money entered on Order */}
          {(view === "calc" || handedAmount > 0) && (
            <div className="px-3 py-1 border-t border-gray-800 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase">Given</div>
                    <div className="text-2xl font-bold text-white">{formatEuro(handedAmount)}</div>
                  </div>
                  {cashback >= 0 ? (
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase">Change</div>
                      <div className="text-2xl font-bold text-emerald-400">{formatEuro(cashback)}</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase">Missing</div>
                      <div className="text-2xl font-bold text-red-400">{formatEuro(Math.abs(cashback))}</div>
                    </div>
                  )}
                </div>
                <button
                  onPointerDown={() => { setHandedAmount(0); setBillCounts({}); setCoinCounts({}); }}
                  className="text-xs text-gray-500 hover:text-white bg-gray-800 px-3 py-1.5 rounded-lg touch-button"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Total — always visible */}
          <div className="px-3 py-3 border-t border-gray-800">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">Total:</span>
              <span className="text-2xl font-bold text-emerald-400">{formatEuro(total)}</span>
            </div>
          </div>

          {/* Customer type selector */}
          <div className="px-3 py-1 flex gap-2">
            <button
              onClick={() => setCustomerType("Guest")}
              className={`flex-1 py-2 rounded-lg text-sm font-bold touch-button transition-all ${
                isGuest
                  ? "border-2 border-yellow-400 bg-yellow-400/10 text-yellow-400"
                  : "border border-gray-700 bg-gray-800/50 text-gray-400"
              }`}
            >
              Guest
            </button>
            <button
              onClick={() => setShowStaffDialog(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold touch-button transition-all truncate px-2 ${
                !isGuest
                  ? "border-2 border-yellow-400 bg-yellow-400/10 text-yellow-400"
                  : "border border-gray-700 bg-gray-800/50 text-gray-400"
              }`}
            >
              {isGuest ? "Staff" : customerType}
            </button>
          </div>

          {/* Checkout button — double tap */}
          <div className="px-3 pb-3 pt-1">
            {editedOrderId !== null && (
              <div className="text-center text-xs text-amber-400 mb-1">
                Editing Order #{editedOrderId}
                <button
                  onClick={() => { setEditedOrderId(null); clearCart(); }}
                  className="ml-2 text-gray-500 hover:text-gray-300 underline"
                >
                  cancel
                </button>
              </div>
            )}
            <button
              onClick={handleCheckoutTap}
              disabled={cart.length === 0 || checkoutPhase === 2}
              className={`relative w-full py-4 rounded-xl text-xl font-bold touch-button transition-all overflow-hidden
                disabled:opacity-30 disabled:cursor-not-allowed text-white ${editedOrderId !== null ? "bg-amber-600 hover:bg-amber-500" : "bg-rose-600 hover:bg-rose-500"}`}
            >
              <div
                className="absolute inset-0 bg-rose-800 transition-all duration-300 ease-out"
                style={{ width: checkoutPhase === 0 ? "0%" : checkoutPhase === 1 ? "50%" : "100%" }}
              />
              <span className="relative z-10">
                {checkoutPhase === 0 && (editedOrderId !== null ? `Update Order #${editedOrderId}` : "Checkout")}
                {checkoutPhase === 1 && "TAP AGAIN"}
                {checkoutPhase === 2 && "Submitting..."}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Staff selection dialog */}
      {showStaffDialog && (
        <Modal onClose={() => setShowStaffDialog(false)}>
          <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl">
            <h2 className="text-lg font-bold text-center mb-3 text-yellow-400">Select Staff</h2>
            <div className="grid grid-cols-3 gap-4">
              {staffGroups.map((group) => (
                <div key={group.id}>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-2 text-center font-bold">{group.name}</div>
                  <div className="flex flex-col gap-2">
                    {[...group.members].sort((a, b) => a.name.localeCompare(b.name)).map((member) => (
                      <button key={member.id} onClick={() => selectStaff(member.name)}
                        className={`w-full py-3 rounded-lg text-sm font-bold touch-button transition-all ${
                          customerType === member.name
                            ? "bg-yellow-400/20 border-2 border-yellow-400 text-yellow-400"
                            : "bg-gray-800 border border-gray-700 text-white hover:bg-gray-700"
                        }`}
                      >
                        {member.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <button onClick={() => setShowStaffDialog(false)}
                className="w-full py-3 bg-gray-800 rounded-xl font-bold text-lg touch-button text-gray-300 hover:bg-gray-700">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Special item dialog */}
      {showSpecialDialog && (
        <Modal onClose={() => setShowSpecialDialog(false)}>
          <div className="bg-[#111] border border-gray-800 rounded-2xl p-8 mx-4 shadow-2xl" style={{ width: "40vw", minWidth: "420px" }}>
            <h2 className="text-2xl font-bold text-center mb-6 text-amber-400">Input Price</h2>

            {/* Price display */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl px-6 py-5 mb-6 text-white text-4xl text-center font-mono min-h-[72px] flex items-center justify-center">
              {specialCents > 0 ? specialDisplay() : <span className="text-gray-500">0,00 €</span>}
            </div>

            {/* Number pad */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  onPointerDown={(e) => { e.preventDefault(); specialDigit(n); }}
                  onPointerUp={(e) => e.preventDefault()}
                  className="bg-gray-800 hover:bg-gray-700 active:bg-gray-600 rounded-xl py-5 text-white text-3xl font-bold touch-button select-none"
                >
                  {n}
                </button>
              ))}
              <button
                onPointerDown={(e) => { e.preventDefault(); specialDecimal(); }}
                onPointerUp={(e) => e.preventDefault()}
                disabled={specialHasDecimal}
                className={`rounded-xl py-5 text-3xl font-bold touch-button select-none ${
                  specialHasDecimal ? "bg-gray-800/50 text-gray-600" : "bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white"
                }`}
              >
                ,
              </button>
              <button
                onPointerDown={(e) => { e.preventDefault(); specialDigit(0); }}
                onPointerUp={(e) => e.preventDefault()}
                className="bg-gray-800 hover:bg-gray-700 active:bg-gray-600 rounded-xl py-5 text-white text-3xl font-bold touch-button select-none"
              >
                0
              </button>
              <button
                onPointerDown={(e) => { e.preventDefault(); setSpecialCents(0); setSpecialHasDecimal(false); setSpecialDecimals(0); }}
                onPointerUp={(e) => e.preventDefault()}
                className="bg-gray-800 hover:bg-gray-700 active:bg-gray-600 rounded-xl py-5 text-red-400 text-3xl touch-button select-none"
              >
                C
              </button>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowSpecialDialog(false)}
                className="flex-1 py-4 bg-gray-800 rounded-xl font-bold text-xl touch-button"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (specialCents > 0) {
                    addSpecialItem(specialCents / 100);
                    setShowSpecialDialog(false);
                  }
                }}
                disabled={specialCents <= 0}
                className={`flex-1 py-4 rounded-xl font-bold text-xl touch-button ${
                  specialCents > 0
                    ? "bg-amber-500 text-black"
                    : "bg-gray-700 text-gray-500"
                }`}
              >
                Add
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Product edit dialog */}
      {editingProduct && (
        <ProductEditDialog
          product={editingProduct}
          categories={categories}
          containers={containers}
          specialMode={editingProduct.id === -1}
          containerMode={editingProduct.id < -1}
          onClose={() => setEditingProduct(null)}
          onSaveData={(data) => {
            editBufferRef.current.push(data);
            if (data.productId < -1) {
              // Container product — apply immediately for live preview
              setContainerOverrides(prev => {
                const next = { ...prev, [data.productId]: { name: data.name, price: data.price, active: data.active, image: data.image } };
                localStorage.setItem("containerOverrides", JSON.stringify(next));
                return next;
              });
            } else {
              updateEditProduct(data.productId, {
                name: data.name,
                price: data.price,
                volume: data.volume,
                active: data.active,
                display: data.display,
                categoryId: data.categoryId,
                color: data.color,
                image: data.image,
              });
            }
          }}
        />
      )}

      {/* Order history dialog */}
      {showHistory && (
        <OrderHistoryDialog
          onClose={() => setShowHistory(false)}
          onLoadCopy={handleLoadCopy}
          onEditOrder={handleEditOrder}
          registers={allRegisters}
          defaultRegisterId={selectedRegisterId}
        />
      )}
    </div>
  );
}
