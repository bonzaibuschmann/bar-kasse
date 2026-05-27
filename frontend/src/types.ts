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
  display: boolean;
  order: number;
  color: string | null;
  image: string | null;
  depositId: number | null;
  deposit: Product | null;
  depositFor: Product[];
  defaultContainerId: number | null;
  defaultContainer: Container | null;
  category?: Category;
}

export interface Container {
  id: number;
  name: string;
  deposit: number;
  image: string | null;
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
  containerFor?: number;   // index of parent product row (container is tied to it)
  containerName?: string;  // display name of the container
  containerDeposit?: number; // deposit price of the container
}

export interface Order {
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
  registers: { registerId: number | null; registerName: string; revenue: number; orderCount: number }[];
  topProducts: {
    product: Product | undefined;
    totalQuantity: number | null;
    orderCount: number;
  }[];
  hourlyData: Record<number, { count: number; revenue: number }>;
}

export interface StaffMember {
  id: number;
  name: string;
  order: number;
  groupId: number;
}

export interface StaffGroup {
  id: number;
  name: string;
  order: number;
  members: StaffMember[];
}
