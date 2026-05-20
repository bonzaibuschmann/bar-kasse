export interface Category {
  id: number;
  name: string;
  order: number;
  products: Product[];
}

export interface Product {
  id: number;
  name: string;
  price: number;
  volume: number | null;
  categoryId: number;
  isDeposit: boolean;
  active: boolean;
  order: number;
  depositId: number | null;
  deposit: Product | null;
  depositFor: Product[];
  category?: Category;
}

export interface CartItem {
  productId: number;
  productName: string;
  volume: number | null;
  unitPrice: number;
  quantity: number;
  isDeposit: boolean;
  depositFor: number | null;
  depositId: number | null;
}

export interface Order {
  id: number;
  total: number;
  cashGiven: number | null;
  changeDue: number | null;
  register: string;
  note: string | null;
  createdAt: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  isDeposit: boolean;
  depositFor: number | null;
  product: Product;
}

export interface DashboardSummary {
  totalOrders: number;
  todayOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  avgOrderValue: number;
  registers: { register: string; revenue: number; orderCount: number }[];
  topProducts: {
    product: Product | undefined;
    totalQuantity: number | null;
    orderCount: number;
  }[];
  hourlyData: Record<number, { count: number; revenue: number }>;
}
