"""
Vercel Serverless Function: Analyze and Anonymize Endpoint
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
    import traceback
    traceback.print_exc()
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
def analyze_and_anonymize_handler(data):
    """Process analyze and anonymize request"""
    try:
        service = get_presidio_service()
        if not service:
            raise Exception("Presidio service not initialized")
        
        if 'text' not in data:
            raise ValueError("Missing 'text' field in request body")
        
        text = data.get('text', '')
        language = data.get('language', 'en')
        
        if not text.strip():
            return {
                "anonymizedText": text,
                "detectedPii": {},
                "entityCount": 0
            }
        
        result = service.analyze_and_anonymize(text, language)
        return result
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Analyze error: {str(e)}\n{error_trace}")
        raise

# Vercel handler (for direct access)
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body) if body else {}
            
            result = analyze_and_anonymize_handler(data)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except ValueError as e:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Handler error: {str(e)}\n{error_trace}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "Internal server error",
                "message": str(e)
            }).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

