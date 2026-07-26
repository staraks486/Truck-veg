import { InventoryItem, Order, CustomerRecord } from '../types';

export const INITIAL_INVENTORY: InventoryItem[] = [

  {
    id: 'veg-1',
    name: 'Fresh Red Tomatoes',
    category: 'Daily Essentials',
    pricePerUnit: 40,
    unitType: 'kg',
    stockQuantity: 35.0,
    inStock: true,
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
    description: 'Farm-fresh vine ripened red tomatoes, juicy and packed with Vitamin C.',
    origin: 'Nashik Organic Farms',
    isOrganic: true
  },
  {
    id: 'veg-2',
    name: 'Organic Farm Potatoes',
    category: 'Root Vegetables',
    pricePerUnit: 30,
    unitType: 'kg',
    stockQuantity: 50.0,
    inStock: true,
    image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80',
    description: 'Nutrient-dense clean potatoes, ideal for everyday cooking and roasting.',
    origin: 'Satara Highlands',
    isOrganic: true
  },
  {
    id: 'veg-3',
    name: 'Fresh Red Onions',
    category: 'Daily Essentials',
    pricePerUnit: 35,
    unitType: 'kg',
    stockQuantity: 42.0,
    inStock: true,
    image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cf?auto=format&fit=crop&w=600&q=80',
    description: 'Crisp, pungent red onions harvested fresh for long shelf life.',
    origin: 'Lasalgaon Wholesale Market',
    isOrganic: false
  },
  {
    id: 'veg-4',
    name: 'Tender Green Spinach (Palak)',
    category: 'Leafy Greens',
    pricePerUnit: 25,
    unitType: 'bunch',
    stockQuantity: 20,
    inStock: true,
    image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80',
    description: 'Iron-rich washed tender spinach bunches from local hydroponic farms.',
    origin: 'Green Valley Hydroponics',
    isOrganic: true
  },
  {
    id: 'veg-5',
    name: 'Crunchy Orange Carrots',
    category: 'Root Vegetables',
    pricePerUnit: 50,
    unitType: 'kg',
    stockQuantity: 18.5,
    inStock: true,
    image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=600&q=80',
    description: 'Naturally sweet and juicy carotene-packed carrots.',
    origin: 'Ooty Hills Produce',
    isOrganic: true
  },
  {
    id: 'veg-6',
    name: 'Aromatic Garlic Pods',
    category: 'Daily Essentials',
    pricePerUnit: 180,
    unitType: 'kg',
    stockQuantity: 12.0,
    inStock: true,
    image: 'https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&w=600&q=80',
    description: 'Sun-dried premium garlic cloves with intense flavor profile.',
    origin: 'Mandsaur Agriculture Hub',
    isOrganic: false
  },
  {
    id: 'veg-7',
    name: 'Sweet Alphonso Mangoes',
    category: 'Exotic Fruits',
    pricePerUnit: 150,
    unitType: 'kg',
    stockQuantity: 15.0,
    inStock: true,
    image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80',
    description: 'GI-tagged Ratnagiri Alphonso mangoes, rich aroma and velvety pulp.',
    origin: 'Ratnagiri Orchards',
    isOrganic: true
  },
  {
    id: 'veg-8',
    name: 'Fresh Coriander / Cilantro',
    category: 'Organic Herbs',
    pricePerUnit: 15,
    unitType: 'bunch',
    stockQuantity: 30,
    inStock: true,
    image: 'https://images.unsplash.com/photo-1588879460405-592f768b556b?auto=format&fit=crop&w=600&q=80',
    description: 'Fragrant leafy coriander bunches plucked early morning.',
    origin: 'Pune Peri-Urban Growers',
    isOrganic: true
  },
  {
    id: 'veg-9',
    name: 'English Cucumber',
    category: 'Daily Essentials',
    pricePerUnit: 40,
    unitType: 'kg',
    stockQuantity: 22.0,
    inStock: true,
    image: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?auto=format&fit=crop&w=600&q=80',
    description: 'Crisp seedless cucumbers perfect for salads and hydration.',
    origin: 'Polyhouse Green Tech',
    isOrganic: true
  }
];

export const DEFAULT_STORE = {
  id: 'store-001',
  name: "Farmer's Gate - Fresh Produce",
  branch: 'Main Market Branch #402',
  address: 'Plot 14, Green Agro Avenue, Sector 5, City Center',
  upiId: 'farmersgate@upi'
};

export const SAMPLE_ORDERS: Order[] = [
  {
    id: 'FG-8920',
    customerName: 'Aarav Sharma',
    customerPhone: '+91 98765 43210',
    storeName: "Farmer's Gate - Fresh Produce",
    items: [
      { itemId: 'veg-1', name: 'Fresh Red Tomatoes', unitType: 'kg', quantityOrWeight: 1000, pricePerUnit: 40, totalPrice: 40 },
      { itemId: 'veg-2', name: 'Organic Farm Potatoes', unitType: 'kg', quantityOrWeight: 1500, pricePerUnit: 30, totalPrice: 45 },
      { itemId: 'veg-4', name: 'Tender Green Spinach (Palak)', unitType: 'bunch', quantityOrWeight: 2, pricePerUnit: 25, totalPrice: 50 }
    ],
    subtotal: 135,
    tax: 0,
    platformFee: 0,
    grandTotal: 135,
    status: 'approved',
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    paymentMethod: 'UPI'
  }
];

export const SAMPLE_CUSTOMERS: CustomerRecord[] = [
  {
    id: 'cust-9876543210',
    name: 'Aarav Sharma',
    phone: '+91 98765 43210',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    lastActive: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    notes: 'Regular organic vegetable buyer',
    totalOrders: 3,
    totalSpent: 420
  },
  {
    id: 'cust-9822211000',
    name: 'Priya Patel',
    phone: '+91 98222 11000',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    lastActive: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    notes: 'Prefers hydroponic greens & tomatoes',
    totalOrders: 2,
    totalSpent: 280
  },
  {
    id: 'cust-9733344555',
    name: 'Rahul Verma',
    phone: '+91 97333 44555',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    lastActive: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    notes: 'Buys root vegetables in bulk',
    totalOrders: 1,
    totalSpent: 160
  }
];

