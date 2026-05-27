import { useEffect, useRef, useCallback, useState } from "react";
import { GridStack, GridStackNode } from "gridstack";
import { Product, Category } from "../types";
import { GridLayout } from "../DataContext";
import { apiFetch } from "../api";
import "gridstack/dist/gridstack.min.css";

interface Props {
  categories: Category[];
  layouts: GridLayout[];
  editMode: boolean;
  dialogOpen?: boolean;
  targetProducts?: Product[];  // Override for live editing — renders these instead of deriving from categories
  rebuildKey?: number;         // Bump to force grid rebuild (e.g. Cancel in edit mode)
  onAddToCart: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  saveLayoutRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  specialProduct?: Product;     // Virtual "Special" grid item (not from backend)
  onTapSpecial: () => void;     // Called when special product is tapped in normal mode
  onEditSpecial: () => void;    // Called when special product is double-tapped in edit mode
  containerProducts?: Product[];  // Virtual container grid items (return + additional per container)
  onTapContainer?: (product: Product) => void;  // Called when container box tapped
}

const COLUMNS = 18;
const ROWS = 24;

// Helper: derive containerId and whether it's "In" (return) or "Out" (additional) from virtual product ID
function containerIdFromVirtual(productId: number): { containerId: number; isReturn: boolean } | null {
  if (productId >= -5000) return null;
  const base = -productId - 5000;
  const containerId = Math.floor(base / 2);
  const isReturn = base % 2 === 0;
  return { containerId, isReturn };
}

export default function ProductGrid({ categories, layouts, editMode, dialogOpen, targetProducts, rebuildKey, onAddToCart, onEditProduct, saveLayoutRef, specialProduct, onTapSpecial, onEditSpecial, containerProducts, onTapContainer }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gsRef = useRef<GridStack | null>(null);
  const layoutsRef = useRef<GridLayout[]>(layouts);
  const editModeRef = useRef(editMode);
  const draggingRef = useRef(false);
  const [buildKey, setBuildKey] = useState(0);

  // Keep refs in sync — these are read inside closures that shouldn't go stale
  useEffect(() => { layoutsRef.current = layouts; }, [layouts]);
  useEffect(() => { editModeRef.current = editMode; }, [editMode]);

  // Flatten products (non-deposit, display=true) — use override for live editing
  const categoryProducts = categories.flatMap((cat) =>
    cat.products.filter((p) => !p.isDeposit && p.display !== false)
  );
  const allProducts = targetProducts
    ? targetProducts.filter((p) => !p.isDeposit && p.display !== false)
    : categoryProducts;
  // Merge regular, special, and container products
  const virtualProducts = [...(specialProduct ? [specialProduct] : []), ...(containerProducts || [])];
  const allWithSpecial = [...allProducts, ...virtualProducts];

  // Track product identity for rebuilds
  const productKey = allWithSpecial.map((p) => `${p.id}:${p.name}:${p.price}:${p.active}:${p.color}:${p.image}`).join(",");

  // Save layout to backend — unified: all items go to GridLayout table
  const saveLayout = useCallback(async (nodes: GridStackNode[]) => {
    try {
      const items = nodes
        .filter((n) => n.id != null)
        .map((n) => {
          const id = parseInt(n.id!);
          const pos = {
            xPosition: (n as any).x ?? 0,
            yPosition: (n as any).y ?? 0,
            width: n.w ?? 1,
            height: n.h ?? 1,
          };

          if (id === -1) {
            // Special box
            return {
              itemType: "Special",
              productId: null,
              containerId: null,
              ...pos,
              color: specialProduct?.color ?? null,
              icon: specialProduct ? ((specialProduct as any).icon ?? null) : null,
            };
          }

          const containerInfo = containerIdFromVirtual(id);
          if (containerInfo) {
            // Container virtual product
            const cp = containerProducts?.find(p => p.id === id);
            return {
              itemType: containerInfo.isReturn ? "ContainerIn" : "ContainerOut",
              productId: null,
              containerId: containerInfo.containerId,
              ...pos,
              color: cp?.color ?? null,
              icon: cp ? ((cp as any).icon ?? null) : null,
            };
          }

          // Regular product
          return {
            itemType: "Product",
            productId: id,
            containerId: null,
            ...pos,
            color: null,
            icon: null,
          };
        });
      await apiFetch("/layouts", {
        method: "PUT",
        body: JSON.stringify(items),
      });
    } catch (err) {
      console.error("Failed to save layout:", err);
    }
  }, [specialProduct, containerProducts]);

  // Save current layout from grid instance
  const saveCurrentLayout = useCallback(async () => {
    const gs = gsRef.current;
    if (!gs) return;
    const els = gs.getGridItems();
    const nodes = els.map((el: HTMLElement) => (el as any).gridstackNode).filter(Boolean);
    await saveLayout(nodes);
  }, [saveLayout]);

  // Expose save function via ref for manual triggering
  useEffect(() => {
    if (saveLayoutRef) {
      saveLayoutRef.current = saveCurrentLayout;
    }
    return () => {
      if (saveLayoutRef) saveLayoutRef.current = null;
    };
  }, [saveLayoutRef, saveCurrentLayout]);

  // Rebuild grid when products change or rebuildKey is bumped
  useEffect(() => {
    setBuildKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productKey, rebuildKey]);

  // Build the grid DOM + init GridStack
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    // Build position lookups from unified layouts array
    const saved = new Map<string, { x: number; y: number; w: number; h: number }>();
    for (const l of layoutsRef.current) {
      if (l.itemType === "Product" && l.productId != null) {
        saved.set(`product:${l.productId}`, { x: l.xPosition, y: l.yPosition, w: l.width, h: l.height });
      } else if (l.itemType === "Special") {
        saved.set("special", { x: l.xPosition, y: l.yPosition, w: l.width, h: l.height });
      } else if ((l.itemType === "ContainerIn" || l.itemType === "ContainerOut") && l.containerId != null) {
        const offset = l.itemType === "ContainerIn" ? 0 : 1;
        const vid = -(5000 + l.containerId * 2 + offset);
        saved.set(`container:${vid}`, { x: l.xPosition, y: l.yPosition, w: l.width, h: l.height });
      }
    }

    // Default layout for regular products
    const defaults = new Map<number, { x: number; y: number; w: number; h: number }>();
    let y = 0;
    categories.forEach((cat) => {
      const prods = cat.products.filter((p) => !p.isDeposit);
      prods.forEach((p, i) => {
        defaults.set(p.id, { x: i % COLUMNS, y: y + Math.floor(i / COLUMNS), w: 1, h: 1 });
      });
      y += Math.ceil(prods.length / COLUMNS);
    });

    // Pre-compute container product default positions to avoid overlap
    const containerDefaultPositions = new Map<number, { x: number; y: number; w: number; h: number }>();
    const cp = containerProducts || [];
    cp.forEach((p, i) => {
      containerDefaultPositions.set(p.id, { x: i % COLUMNS, y: 17 + Math.floor(i / COLUMNS), w: 1, h: 1 });
    });

    // Create DOM elements for each product
    allWithSpecial.forEach((product) => {
      const isSpecial = product.id === -1;
      const isContainerProduct = product.id < -1;
      let pos: { x: number; y: number; w: number; h: number };
      if (isSpecial) {
        pos = saved.get("special") || { x: 17, y: 17, w: 1, h: 1 };
      } else if (isContainerProduct) {
        pos = saved.get(`container:${product.id}`) || containerDefaultPositions.get(product.id) || { x: 0, y: 17, w: 1, h: 1 };
      } else {
        pos = saved.get(`product:${product.id}`) || defaults.get(product.id) || { x: 0, y: 0, w: 1, h: 1 };
      }

      const el = document.createElement("div");
      el.className = "grid-stack-item";
      el.setAttribute("gs-id", String(product.id));
      el.setAttribute("gs-x", String(pos.x));
      el.setAttribute("gs-y", String(pos.y));
      el.setAttribute("gs-w", String(pos.w));
      el.setAttribute("gs-h", String(pos.h));
      el.setAttribute("gs-min-w", "1");
      el.setAttribute("gs-min-h", "1");

      const inner = document.createElement("div");
      inner.className = "grid-stack-item-content";

      const btn = document.createElement("button");
      const bgColor = product.color || "rgb(43,43,43)";
      btn.className = "w-full h-full p-1 text-center flex flex-row items-center gap-1 relative overflow-hidden";
      btn.style.backgroundColor = bgColor;
      btn.style.borderRadius = "0";
      btn.style.willChange = "filter";  // pre-promote to GPU layer for instant animation start

      if (!product.active) {
        const overlay = document.createElement("div");
        overlay.className = "absolute inset-0 z-10";
        overlay.innerHTML = '<div style="position:absolute;inset:0;background:rgba(0,0,0,0.5)"></div><svg style="position:absolute;inset:0;width:100%;height:100%" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="0" y1="0" x2="100" y2="100" stroke="rgba(239,68,68,0.3)" stroke-width="4" vector-effect="non-scaling-stroke"/><line x1="100" y1="0" x2="0" y2="100" stroke="rgba(239,68,68,0.3)" stroke-width="4" vector-effect="non-scaling-stroke"/></svg>';
        btn.appendChild(overlay);
      }

      // Text wrapper (left side)
      const textWrap = document.createElement("div");
      textWrap.className = "flex-1 flex flex-col items-center justify-center min-w-0";

      const name = document.createElement("span");
      name.className = "font-semibold text-base leading-snug";
      name.style.color = "rgb(200,200,200)";
      name.style.backgroundColor = "rgb(43,43,43)";
      name.style.display = "inline-block";
      name.style.borderRadius = "2px";
      name.style.padding = "0 2px";
      name.style.maxWidth = "100%";
      name.style.whiteSpace = "normal";
      name.style.wordBreak = "break-word";
      name.textContent = product.name;
      textWrap.appendChild(name);

      if (product.volume) {
        const vol = document.createElement("span");
        vol.className = "text-[10px] text-gray-500";
        vol.style.backgroundColor = "rgb(43,43,43)";
        vol.style.display = "inline-block";
        vol.style.borderRadius = "3px";
        vol.style.padding = "0 2px";
        vol.textContent = `${product.volume}L`;
        textWrap.appendChild(vol);
      }

      const priceEl = document.createElement("span");
      priceEl.className = "text-emerald-400 font-bold text-xs mt-0.5";
      priceEl.style.backgroundColor = "rgb(43,43,43)";
      priceEl.style.display = "inline-block";
      priceEl.style.borderRadius = "3px";
      priceEl.style.padding = "0 2px";
      priceEl.textContent = isSpecial ? "Input €" : isContainerProduct ? `${(product.price < 0 ? "" : "+") + product.price.toFixed(2).replace(".", ",")} €` : `${product.price.toFixed(2).replace(".", ",")} €`;
      textWrap.appendChild(priceEl);

      btn.appendChild(textWrap);

      // Image on the right side
      if (product.image) {
        const img = document.createElement("img");
        img.src = product.image;
        img.alt = "";
        img.className = "h-full w-auto max-w-[40%] object-contain rounded shrink-0";
        img.style.maxHeight = "100%";
        btn.appendChild(img);
      }

      // Pointer handler — works on both mouse (PC) and touch (iPad)
      btn.addEventListener("pointerdown", (e) => {
        if (draggingRef.current) return;

        const isEditMode = editModeRef.current;

        // Edit mode: don't handle taps — gridstack handles drag/resize.
        if (isEditMode) return;

        if (!isSpecial && !product.active) return;

        // Prevent the event from bubbling to gridstack
        e.stopPropagation();

        // Press animation — cancel any running animation and restart instantly.
        btn.getAnimations().forEach(a => a.cancel());
        btn.animate([
          { transform: "scale(1)", filter: "brightness(1)" },
          { transform: "scale(0.9)", filter: "brightness(1.5)", offset: 0.25 },
          { transform: "scale(1)", filter: "brightness(1)" },
        ], { duration: 150, easing: "ease-out" });

        if (isSpecial) {
          onTapSpecial();
          return;
        }

        if (isContainerProduct && onTapContainer) {
          // Prevent tap on inactive container products too
          if (!product.active) return;
          onTapContainer(product);
          return;
        }

        // Add to cart immediately — every tap counts
        for (const cat of categories) {
          const found = cat.products.find((p) => p.id === product.id);
          if (found) {
            onAddToCart(found);
            break;
          }
        }
      });

      // Double-tap for edit dialog (edit mode only)
      // Attached to the grid-stack-item (not the button) because the button
      // has pointer-events: none in edit mode so gridstack can handle drag.
      let editTapCount = 0;
      let editTapTimer: ReturnType<typeof setTimeout> | null = null;
      el.addEventListener("click", (e) => {
        const isEditMode = editModeRef.current;
        if (!isEditMode) return;
        if (draggingRef.current) return;

        editTapCount++;
        if (editTapCount === 1) {
          editTapTimer = setTimeout(() => {
            editTapCount = 0;
          }, 400);
        } else if (editTapCount >= 2) {
          if (editTapTimer) clearTimeout(editTapTimer);
          editTapCount = 0;
          e.stopPropagation();
          e.preventDefault();
          if (isSpecial) {
            onEditSpecial();
          } else {
            onEditProduct(product);
          }
        }
      });

      inner.appendChild(btn);
      el.appendChild(inner);
      containerRef.current!.appendChild(el);
    });

    // Init GridStack — static initially, edit mode toggle enables interaction
    const container = containerRef.current;
    const MARGIN = 4;

    // Compute cell height so the grid fills the available height exactly
    const parent = container.parentElement;
    const availableHeight = parent ? parent.clientHeight : 600;
    const computedCellHeight = Math.floor((availableHeight - (ROWS - 1) * MARGIN) / ROWS);

    const gs = GridStack.init(
      {
        column: COLUMNS,
        cellHeight: computedCellHeight,
        animate: false,
        float: true,
        staticGrid: true,
        margin: MARGIN,
        minW: 1,
        minH: 1,
        row: ROWS,
      },
      container
    );

    gsRef.current = gs;

    gs.on("dragstart", () => { draggingRef.current = true; });
    gs.on("resizestart", () => { draggingRef.current = true; });
    gs.on("dragstop", () => { setTimeout(() => { draggingRef.current = false; }, 50); });
    gs.on("resizestop", () => { setTimeout(() => { draggingRef.current = false; }, 50); });

    return () => {
      gs.destroy(false);
      gsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildKey]);

  // Toggle edit mode on existing grid using setStatic.
  // buildKey is in the dependency array so that when the grid is rebuilt
  // (e.g. because targetProducts changes at the same time editMode toggles),
  // the static state is re-applied to the fresh GridStack instance.
  useEffect(() => {
    const gs = gsRef.current;
    if (!gs) return;
    const interactive = editMode && !dialogOpen;
    if (interactive) {
      gs.setStatic(false);
      containerRef.current?.classList.add("grid-edit-mode");
    } else {
      gs.setStatic(true);
      containerRef.current?.classList.remove("grid-edit-mode");
    }
  }, [editMode, dialogOpen, buildKey]);

  // Keep cellHeight in sync with container height so grid always fills viewport
  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    const MARGIN = 4;
    const updateCellHeight = () => {
      const gs = gsRef.current;
      if (!gs) return;
      const h = Math.floor((parent.clientHeight - (ROWS - 1) * MARGIN) / ROWS);
      if (h > 0) gs.cellHeight(h);
    };

    const observer = new ResizeObserver(updateCellHeight);
    observer.observe(parent);
    updateCellHeight();

    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={containerRef}
        className="grid-stack"
        style={{ minHeight: "100%" }}
      />
    </div>
  );
}
