const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, v),
  removeItem: (k) => store.delete(k)
};
global.window = {
  dispatchEvent: () => {}
} as any;

import { getStoredCustomers, deleteStoredCustomer, getStoredOrders } from "./src/utils/storageManager";
import { SAMPLE_ORDERS } from "./src/data/mockData";

// ensure sample orders are in store
global.localStorage.setItem('kirana_orders', JSON.stringify(SAMPLE_ORDERS));

const initial = getStoredCustomers();
if (initial.length > 0) {
    console.log("Orders before:", getStoredOrders().map(o => o.customerName));
    deleteStoredCustomer(initial[0].phone); // "+91 98765 43210"
    console.log("Orders after:", getStoredOrders().map(o => o.customerName));
}
