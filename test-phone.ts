import { isPhoneInDeletedList } from "./src/utils/storageManager";

const list = ["9876543210", "+919876543210"];
console.log("Expected true:", isPhoneInDeletedList("9876543210", list));
console.log("Expected true:", isPhoneInDeletedList("+919876543210", list));
console.log("Expected false:", isPhoneInDeletedList("1234567890", list));
