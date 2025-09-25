// This file will not end up inside the main application JavaScript bundle.
// Instead, it will simply be copied inside the build folder.
// The generated "index.html" will require it just before this main bundle.
// You can thus use it to define some environment variables that will
// be made available synchronously in all your JS modules under "src".
//
// Warning: this file will not be transpiled and cannot contain
// any syntax that is not yet supported by your targeted browsers.

// ---- Global service URLs ----
// You can override these via a custom config.js or using the Docker entrypoint.
window.CATALOG_SERVICE_URL = window.CATALOG_SERVICE_URL || 'http://localhost:5062';
window.MENU_ITEMS_API_URL = `${window.CATALOG_SERVICE_URL}/menu-items`;
window.MENU_CATEGORIES_API_URL = `${window.CATALOG_SERVICE_URL}/menu-items/categories`;

window.INVENTORY_SERVICE_URL = window.INVENTORY_SERVICE_URL || 'http://localhost:5094';
window.INVENTORY_ITEMS_API_URL = `${window.INVENTORY_SERVICE_URL}/inventory-items`;

window.IDENTITY_SERVICE_URL = window.IDENTITY_SERVICE_URL || 'http://localhost:5265';

window.USERS_API_URL = `${window.IDENTITY_SERVICE_URL}/users`;

window.ORDER_SERVICE_URL = window.ORDER_SERVICE_URL || 'http://localhost:5236';
window.ORDERS_API_URL = `${window.ORDER_SERVICE_URL}/orders`;
window.TABLES_API_URL = `${window.ORDER_SERVICE_URL}/api/tables`;

window.PAYMENT_SERVICE_URL = window.PAYMENT_SERVICE_URL || 'http://localhost:5238';
// Payment session endpoint pattern: `${PAYMENT_SERVICE_URL}/orders/{orderId}/payment-session`

window.RABBITMQ_URL = window.RABBITMQ_URL || 'http://localhost:15672';

window.TENANT_SERVICE_URL = window.TENANT_SERVICE_URL || 'http://localhost:5200'; 
