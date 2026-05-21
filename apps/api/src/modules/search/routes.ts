import { Hono } from 'hono';

const search = new Hono();

// Placeholder — implemented in Part 2
search.get('/v1/localities/autocomplete', (c) => c.json({ message: 'Not implemented yet' }));
search.get('/v1/localities/geocode', (c) => c.json({ message: 'Not implemented yet' }));
search.get('/v1/localities/reverse', (c) => c.json({ message: 'Not implemented yet' }));

export { search };
