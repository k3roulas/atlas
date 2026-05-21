import { Hono } from 'hono';

const stores = new Hono();

// Placeholder — implemented in Part 3
stores.get('/v1/stores/search', (c) => c.json({ message: 'Not implemented yet' }));
stores.get('/v1/stores/autocomplete', (c) => c.json({ message: 'Not implemented yet' }));

export { stores };
