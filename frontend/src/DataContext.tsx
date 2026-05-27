import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { Category, Product, StaffGroup, Container } from "./types";

export interface Register {
  id: number;
  name: string;
  active: boolean;
}

export interface GridLayout {
  id: number;
  itemType: string; // "Product" | "ContainerIn" | "ContainerOut" | "Special"
  productId: number | null;
  containerId: number | null;
  xPosition: number;
  yPosition: number;
  width: number;
  height: number;
  color: string | null;
  icon: string | null;
}

export interface SpecialBox {
  id: number;
  name: string;
  price: number;
  color: string | null;
  icon: string | null;
  image: string | null;
}

interface DataContextType {
  categories: Category[];
  allProducts: Product[];
  registers: Register[];
  staffGroups: StaffGroup[];
  containers: Container[];
  layouts: GridLayout[];
  specialBox: SpecialBox | null;
  loading: boolean;
  connected: boolean;
  editProducts: Product[] | null;
  startEditMode: () => void;
  updateEditProduct: (productId: number, changes: Partial<Product>) => void;
  endEditMode: () => void;
  setConfigSuppressed: (suppress: boolean) => void;
  hasSuppressedConfig: () => boolean;
  flushSuppressedConfig: () => void;
  commitProductEdits: (edits: Array<{ productId: number; name: string; price: number; volume: number | null; active: boolean; display: boolean; categoryId: number; color: string; image?: string | null; defaultContainerId?: number | null }>) => void;
}

const DataContext = createContext<DataContextType | null>(null);

export function useData(): DataContextType {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [staffGroups, setStaffGroups] = useState<StaffGroup[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [layouts, setLayouts] = useState<GridLayout[]>([]);
  const [specialBox, setSpecialBox] = useState<SpecialBox | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);
  const [editProducts, setEditProducts] = useState<Product[] | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressRef = useRef(false);
  const suppressedConfigRef = useRef<{
    categories: Category[];
    products: Product[];
    registers: Register[];
    staffGroups: StaffGroup[];
    layouts?: GridLayout[];
    containers?: Container[];
    specialBox?: SpecialBox | null;
  } | null>(null);

  const applyConfig = useCallback((data: {
    categories: Category[];
    products: Product[];
    registers: Register[];
    staffGroups: StaffGroup[];
    layouts?: GridLayout[];
    containers?: Container[];
    specialBox?: SpecialBox | null;
  }) => {
    setCategories(data.categories);
    setAllProducts(data.products);
    setRegisters(data.registers);
    setStaffGroups(data.staffGroups || []);
    setLayouts(data.layouts || []);
    setContainers(data.containers || []);
    setSpecialBox(data.specialBox || null);
    setLoading(false);
  }, []);

  const setConfigSuppressed = useCallback((suppress: boolean) => {
    suppressRef.current = suppress;
    if (!suppress) {
      suppressedConfigRef.current = null;
    }
  }, []);

  const hasSuppressedConfig = useCallback(() => {
    return suppressedConfigRef.current !== null;
  }, []);

  const flushSuppressedConfig = useCallback(() => {
    const cfg = suppressedConfigRef.current;
    suppressedConfigRef.current = null;
    if (cfg) {
      applyConfig(cfg);
    }
  }, [applyConfig]);

  const commitProductEdits = useCallback((edits: Array<{ productId: number; name: string; price: number; volume: number | null; active: boolean; display: boolean; categoryId: number; color: string; image?: string | null; defaultContainerId?: number | null }>) => {
    setAllProducts(prev => prev.map(p => {
      const edit = edits.find(e => e.productId === p.id);
      if (!edit) return p;
      return { ...p, name: edit.name, price: edit.price, volume: edit.volume, active: edit.active, display: edit.display, categoryId: edit.categoryId, color: edit.color, image: edit.image ?? p.image, defaultContainerId: edit.defaultContainerId ?? p.defaultContainerId };
    }));
  }, []);

  const startEditMode = useCallback(() => {
    // Deep-clone current products for live editing
    setEditProducts(allProducts.map(p => ({ ...p })));
  }, [allProducts]);

  const updateEditProduct = useCallback((productId: number, changes: Partial<Product>) => {
    setEditProducts(prev => prev?.map(p => p.id === productId ? { ...p, ...changes } : p) ?? null);
  }, []);

  const endEditMode = useCallback(() => {
    setEditProducts(null);
  }, []);

  // WebSocket — backend sends full config on connect and on every mutation
  useEffect(() => {
    const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws/config`;
    let alive = true;

    function connect() {
      if (!alive) return;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          // Any message from the server resets the heartbeat timer
          if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
          setConnected(true);
          heartbeatTimerRef.current = setTimeout(() => setConnected(false), 7000);

          const msg = JSON.parse(event.data);
          if (msg.type === "config-update") {
            const cfg = {
              categories: msg.categories,
              products: msg.products,
              registers: msg.registers,
              staffGroups: msg.staffGroups || [],
              layouts: msg.layouts || [],
              containers: msg.containers || [],
              specialBox: msg.specialBox || null,
            };
            if (suppressRef.current) {
              suppressedConfigRef.current = cfg;
            } else {
              applyConfig(cfg);
              // Clear edit buffer when we get live config — edit mode is done
              setEditProducts(null);
            }
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (alive) setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      alive = false;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [applyConfig]);

  return (
    <DataContext.Provider value={{
      categories, allProducts, registers, staffGroups, containers, layouts, specialBox, loading, connected,
      editProducts, startEditMode, updateEditProduct, endEditMode,
      setConfigSuppressed, hasSuppressedConfig, flushSuppressedConfig, commitProductEdits
    }}>
      {children}
    </DataContext.Provider>
  );
}
