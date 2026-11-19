import { Router } from 'express';
import { z } from 'zod';
import { employeeInputSchema, insightsQuerySchema, listQuerySchema } from '../domain/employee.js';
import type { EmployeeService } from '../services/employeeService.js';

const idParam = z.coerce.number().int().positive();

export function employeeRoutes(service: EmployeeService): Router {
  const router = Router();

  router.get('/employees', (req, res) => {
    res.json(service.list(listQuerySchema.parse(req.query)));
  });

  router.get('/employees/:id', (req, res) => {
    res.json(service.get(idParam.parse(req.params.id)));
  });

  router.post('/employees', (req, res) => {
    res.status(201).json(service.create(employeeInputSchema.parse(req.body)));
  });

  router.put('/employees/:id', (req, res) => {
    res.json(service.update(idParam.parse(req.params.id), employeeInputSchema.parse(req.body)));
  });

  router.delete('/employees/:id', (req, res) => {
    service.remove(idParam.parse(req.params.id));
    res.status(204).end();
  });

  router.get('/insights', (req, res) => {
    res.json(service.insights(insightsQuerySchema.parse(req.query)));
  });

  router.get('/meta/facets', (_req, res) => {
    res.json(service.facets());
  });

  router.get('/meta/summary', (_req, res) => {
    res.json(service.summary());
  });

  return router;
}
