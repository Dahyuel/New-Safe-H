"""
Vercel Serverless Function: Health Check Endpoint
"""
import sys
import os
import json

# Add backend to path
backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend')
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

try:
    from presidio_service import PresidioService
except Exception as e:
    print(f"Import error: {str(e)}")
    PresidioService = None

# Global service instance (initialized on first request)
_presidio_service = None

def get_presidio_service():
    global _presidio_service
    if _presidio_service is None:
        try:
            if PresidioService:
                _presidio_service = PresidioService()
            else:
                print("PresidioService not available")
        except Exception as e:
            print(f"Failed to initialize Presidio service: {str(e)}")
            import traceback
            traceback.print_exc()
            _presidio_service = None
    return _presidio_service

# Export function for use in index.py
def get_health_status():
    """Get health status"""
    try:
        service = get_presidio_service()
        return {
            "status": "healthy",
            "analyzer": "active" if service else "inactive",
            "supported_entities": service.get_supported_entities() if service else []
        }
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Health error: {str(e)}\n{error_trace}")
        return {
            "status": "unhealthy",
            "analyzer": "inactive",
            "error": str(e)
        }

# Vercel handler (for direct access)
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            status = get_health_status()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(status).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

