// Production config.js — mounted over the image's baked-in dev config.js
// (see deploy/docker-compose.yml's frontend service). Static file, so URLs are
// the fixed spoontab.com subdomains rather than templated.

window.CATALOG_SERVICE_URL = 'https://catalog.spoontab.com';
window.MENU_ITEMS_API_URL = `${window.CATALOG_SERVICE_URL}/menu-items`;
window.MENU_CATEGORIES_API_URL = `${window.CATALOG_SERVICE_URL}/menu-items/categories`;

window.IDENTITY_SERVICE_URL = 'https://identity.spoontab.com';
window.USERS_API_URL = `${window.IDENTITY_SERVICE_URL}/users`;

window.ORDER_SERVICE_URL = 'https://order.spoontab.com';
window.ORDERS_API_URL = `${window.ORDER_SERVICE_URL}/orders`;
window.TABLES_API_URL = `${window.ORDER_SERVICE_URL}/api/tables`;

window.PAYMENT_SERVICE_URL = 'https://payment.spoontab.com';
// Payment session endpoint pattern: `${PAYMENT_SERVICE_URL}/orders/{orderId}/payment-session`

// RabbitMQ's management UI isn't exposed publicly in production. src/config/env.ts's
// must() throws on a falsy value, so this just needs to be a non-empty placeholder —
// nothing in the app actually calls it.
window.RABBITMQ_URL = 'https://payment.spoontab.com';

// Replaced with the real value from the STRIPE_PUBLISHABLE_KEY secret by
// .github/workflows/deploy.yml at deploy time — never committed here for real.
window.STRIPE_PUBLISHABLE_KEY = '__STRIPE_PUBLISHABLE_KEY__';
