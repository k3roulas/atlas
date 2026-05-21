import { Hono } from 'hono';

const map = new Hono();

// Placeholder — implemented in Part 3
map.get('/v1/map/styles', (c) => c.json({ message: 'Not implemented yet' }));

export { map };
