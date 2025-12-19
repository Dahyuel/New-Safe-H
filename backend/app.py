from flask import Flask, request, jsonify
from flask_cors import CORS
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine
from presidio_analyzer.nlp_engine import NlpEngineProvider

app = Flask(__name__)
CORS(app)

# Use Small Spacy Model (en_core_web_sm) ~12MB instead of Large (~560MB)
configuration = {
    "nlp_engine_name": "spacy",
    "models": [{"lang_code": "en", "model_name": "en_core_web_sm"}],
}
provider = NlpEngineProvider(nlp_configuration=configuration)
nlp_engine = provider.create_engine()

analyzer = AnalyzerEngine(nlp_engine=nlp_engine)
# No need for anonymizer engine if we do manual replacement for unique IDs but good to have
anonymizer = AnonymizerEngine()

import io
from pypdf import PdfReader

@app.route('/extract-text', methods=['POST'])
def extract_text():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    try:
        # Read file to memory
        file_stream = io.BytesIO(file.read())
        reader = PdfReader(file_stream)
        text = ""
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text += f"--- Page {i+1} ---\n{page_text}\n\n"
        
        return jsonify({'text': text})
    except Exception as e:
        print(f"Extraction Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/anonymize', methods=['POST'])
def anonymize():
    data = request.json
    text = data.get('text', '')
    
    if not text:
        return jsonify({'anonymizedText': '', 'findings': [], 'originalMap': {}}), 400

    # 1. Analyze
    # Add more entities if needed: "DATE_TIME", "NRP", "LOCATION" etc.
    results = analyzer.analyze(text=text, entities=["PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", "CREDIT_CARD", "US_SSN", "IP_ADDRESS"], language='en')

    # 2. Custom Anonymization for Unique Placeholders (e.g. [PERSON_1])
    # Sort results by start index in descending order to replace without affecting earlier indices
    results.sort(key=lambda x: x.start, reverse=True)
    
    anonymized_text = list(text)
    original_map = {}
    counters = {}
    findings = set()
    
    for res in results:
        entity_type = res.entity_type
        findings.add(entity_type)
        
        # Get count for this entity type
        count = counters.get(entity_type, 0) + 1
        counters[entity_type] = count
        
        # Extract original value
        original_value = text[res.start:res.end]
        
        # Check if this value was already mapped? (Optimization: Reuse placeholder for same value?)
        # For simplicity and security, unique placeholders for every occurrence is safer for restoration context
        # but reusing placeholder is nicer for LLM context (it knows it's the same person).
        # Let's try to reuse if value matches.
        
        existing_placeholder = None
        for p, v in original_map.items():
            if v == original_value and p.startswith(f"[{entity_type}"):
                existing_placeholder = p
                break
        
        if existing_placeholder:
            placeholder = existing_placeholder
            # Decrement counter since we reused one? No, keep counter incremented or just don't increment?
            # actually if we reuse, we don't increment.
            counters[entity_type] -= 1 
        else:
            placeholder = f"[{entity_type}_{count}]"
            original_map[placeholder] = original_value

        # Replace in text
        # Since we traverse reverse, we can safely slice
        anonymized_text[res.start:res.end] = list(placeholder)

    final_text = "".join(anonymized_text)
    
    return jsonify({
        'anonymizedText': final_text,
        'findings': list(findings),
        'originalMap': original_map
    })

if __name__ == '__main__':
    print("Starting Safe Harbour PII Backend on port 5000...")
    app.run(port=5000, debug=True)