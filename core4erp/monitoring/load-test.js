import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // ramp up: 0 → 10 usuários
    { duration: '1m',  target: 50 },   // carga moderada
    { duration: '2m',  target: 100 },  // pico: 100 usuários simultâneos
    { duration: '1m',  target: 200 },  // stress: 200 usuários
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% das requests < 2s
    errors: ['rate<0.05'],              // < 5% de erros
  },
};

const BASE_URL = 'http://localhost:8080';
const TOKEN = __ENV.JWT_TOKEN;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`,
};

export default function () {
  // Dashboard — rota mais consultada
  const dashRes = http.get(`${BASE_URL}/api/dashboard`, { headers });
  check(dashRes, { 'dashboard 200': (r) => r.status === 200 });
  errorRate.add(dashRes.status !== 200);

  sleep(1);

  // Listagem de contas com paginação
  const contasRes = http.get(`${BASE_URL}/api/contas?size=20&page=0`, { headers });
  check(contasRes, { 'contas 200': (r) => r.status === 200 });
  errorRate.add(contasRes.status !== 200);

  sleep(Math.random() * 2);

  // Health check (público)
  const healthRes = http.get(`${BASE_URL}/actuator/health`);
  check(healthRes, { 'health UP': (r) => r.status === 200 });

  sleep(1);
}
