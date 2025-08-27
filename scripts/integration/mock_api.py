#!/usr/bin/env python3
"""Simple mock API for KYCut to run integration tests locally.

Implements minimal endpoints used by KYCut bot:
- GET /api/bot/ping
- GET /api/orders/telegram?telegram_user_id=...
- PATCH /api/orders/{id}/status
- POST /api/telegram/link
- POST /api/telegram/ensure-session

Run: python3 scripts/integration/mock_api.py
"""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
import re
from datetime import datetime, timedelta

PORT = 3000
WEBHOOK_SECRET = 'kycut_webhook_2024_secure_key_789xyz'

# Simple in-memory orders store
ORDERS = {
    '99999': [
        {
            'id': '1',
            'order_number': 'ORD-1001',
            'total_amount': 49.99,
            'created_at': datetime.utcnow().isoformat() + 'Z',
            'status': 'pending',
            'items': [
                {'product_name': 'Red Widget', 'quantity': 1, 'product_price': 49.99}
            ],
            'customer_name': 'Integration Tester',
            'customer_email': 'test@example.com'
        }
    ]
}

class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def _send(self, status, data):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)

        if path == '/api/bot/ping':
            # optional webhook secret check
            header = self.headers.get('X-Webhook-Secret')
            if header and header != WEBHOOK_SECRET:
                return self._send(401, {'success': False, 'message': 'Invalid webhook secret'})
            return self._send(200, {
                'success': True,
                'message': 'Bot connection successful (mock)',
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'server': 'KYCut Mock API',
                'version': 'mock-1.0',
                'status': 'online'
            })

        if path == '/api/orders/telegram':
            tg = qs.get('telegram_user_id', ['99999'])[0]
            orders = ORDERS.get(tg, [])
            return self._send(200, {'success': True, 'orders': orders})

        # default 404
        return self._send(404, {'success': False, 'message': 'Not found'})

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8') if length else '{}'
        try:
            data = json.loads(body) if body else {}
        except Exception:
            data = {}

        if path == '/api/telegram/link':
            code = data.get('code')
            tg = str(data.get('telegramUserId', '99999'))
            # Return success with a mock bot token
            token = 'mock_bot_token_123:ABC'
            # Persist link mapping (simple)
            ORDERS.setdefault(tg, ORDERS.get(tg, []))
            return self._send(200, {'success': True, 'botToken': token, 'expiresAt': (datetime.utcnow() + timedelta(hours=1)).isoformat() + 'Z', 'userId': 'user-123'})

        if path == '/api/telegram/ensure-session':
            tg = str(data.get('telegramUserId', '99999'))
            token = 'mock_bot_token_123:ABC'
            return self._send(200, {'success': True, 'userId': 'user-123', 'botToken': token, 'expiresAt': (datetime.utcnow() + timedelta(hours=1)).isoformat() + 'Z'})

        return self._send(404, {'success': False, 'message': 'Not found'})

    def do_PATCH(self):
        parsed = urlparse(self.path)
        path = parsed.path
        m = re.match(r'^/api/orders/([^/]+)/status$', path)
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8') if length else '{}'
        try:
            data = json.loads(body) if body else {}
        except Exception:
            data = {}

        if m:
            order_id = m.group(1)
            # find order and update status
            found = None
            for tg, orders in ORDERS.items():
                for o in orders:
                    if o.get('id') == order_id or o.get('order_number') == order_id:
                        o['status'] = data.get('status', o.get('status'))
                        found = o
                        break
                if found:
                    break
            if found:
                return self._send(200, {'success': True, 'order': found})
            else:
                return self._send(404, {'success': False, 'message': 'Order not found'})

        return self._send(404, {'success': False, 'message': 'Not found'})

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', PORT), Handler)
    print(f"Mock API listening on http://0.0.0.0:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('Shutting down mock API')
        server.server_close()
