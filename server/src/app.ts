import express, { type ErrorRequestHandler } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { ZodError } from 'zod';
import type { DB } from './db/connection.js';
import { ConflictError, NotFoundError } from './domain/errors.js';
import { createEmployeeRepository } from './repositories/employeeRepository.js';
import { employeeRoutes } from './routes/employeeRoutes.js';
import { createEmployeeService } from './services/employeeService.js';

interface AppOptions {
  /** Absolute path to the built React app; served as static files with SPA fallback when present. */
  staticDir?: string;
}

/** Composition root. The DB is injected so tests can pass an in-memory database. */
export function createApp(db: DB, options: AppOptions = {}) {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  const service = createEmployeeService(createEmployeeRepository(db));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', employeeRoutes(service));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  if (options.staticDir && fs.existsSync(options.staticDir)) {
    app.use(express.static(options.staticDir));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(options.staticDir!, 'index.html')));
  }

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        fields: Object.fromEntries(err.issues.map((i) => [i.path.join('.'), i.message])),
      });
      return;
    }
    if (err instanceof NotFoundError || err instanceof ConflictError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (err?.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Malformed JSON body' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  };
  app.use(errorHandler);

  return app;
}
