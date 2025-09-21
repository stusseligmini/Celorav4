import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = { vus: 5, duration: '30s' };

export default function () {
  // Placeholder: call a mock endpoint (user should replace with actual RPC proxy URL)
  const res = http.get('https://example.com/health');
  check(res, { 'status is 200/OK-ish': r => r.status < 500 });
  sleep(1);
}
