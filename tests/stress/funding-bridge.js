import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = { vus: 10, duration: '30s' };

export default function () {
  // Placeholder: would hit an internal funding endpoint or simulate RPC.
  const res = http.get('https://example.com/fund');
  check(res, { 'status < 500': r => r.status < 500 });
  sleep(0.5);
}
