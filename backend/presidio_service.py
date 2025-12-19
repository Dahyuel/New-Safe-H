"""
Presidio Service for PII Detection and Anonymization
Handles detection, anonymization, and caching of PII entities
"""

from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig
from presidio_analyzer.nlp_engine import NlpEngineProvider
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PresidioService:
    def __init__(self):
        """Initialize Presidio analyzer and anonymizer engines"""
        try:
            # Configure NLP engine to use the small spaCy model
            configuration = {
                "nlp_engine_name": "spacy",
                "models": [{"lang_code": "en", "model_name": "en_core_web_sm"}]
            }
            
            # Create NLP engine provider with custom configuration
            provider = NlpEngineProvider(nlp_configuration=configuration)
            nlp_engine = provider.create_engine()
            
            # Initialize analyzer with custom NLP engine
            self.analyzer = AnalyzerEngine(nlp_engine=nlp_engine)
            self.anonymizer = AnonymizerEngine()
            
            logger.info("Presidio engines initialized successfully with en_core_web_sm")
        except Exception as e:
            logger.error(f"Failed to initialize Presidio: {str(e)}")
            raise

    def analyze_text(self, text, language="en"):
        """
        Analyze text for PII entities
        
        Args:
            text (str): Input text to analyze
            language (str): Language code (default: "en")
            
        Returns:
            list: List of detected PII entities
        """
        try:
            results = self.analyzer.analyze(
                text=text,
                language=language,
                entities=None  # Detect all supported entities
            )
            logger.info(f"Detected {len(results)} PII entities")
            return results
        except Exception as e:
            logger.error(f"Error analyzing text: {str(e)}")
            raise

    def anonymize_text(self, text, analyzer_results):
        """
        Anonymize text by replacing PII with placeholders
        
        Args:
            text (str): Original text
            analyzer_results (list): Results from analyze_text
            
        Returns:
            dict: Contains anonymized text and mapping of placeholders to original values
        """
        try:
            # Create operators for each entity type with unique placeholders
            operators = {}
            entity_counter = {}
            
            # Count entities by type for unique numbering
            for result in analyzer_results:
                entity_type = result.entity_type
                entity_counter[entity_type] = entity_counter.get(entity_type, 0) + 1
            
            # Reset counter for actual replacement
            entity_index = {}
            
            # Anonymize the text
            anonymized_result = self.anonymizer.anonymize(
                text=text,
                analyzer_results=analyzer_results,
                operators={
                    entity_type: OperatorConfig("replace", {"new_value": f"[{entity_type}]"})
                    for entity_type in set(r.entity_type for r in analyzer_results)
                }
            )
            
            # Build PII mapping with unique placeholders
            pii_mapping = {}
            sorted_results = sorted(analyzer_results, key=lambda x: x.start)
            
            for result in sorted_results:
                entity_type = result.entity_type
                original_value = text[result.start:result.end]
                
                # Create unique placeholder
                entity_index[entity_type] = entity_index.get(entity_type, 0) + 1
                placeholder = f"[{entity_type}_{entity_index[entity_type]}]"
                
                pii_mapping[placeholder] = original_value
            
            # Replace generic placeholders with unique ones
            anonymized_text = anonymized_result.text
            entity_index = {}
            
            for result in sorted_results:
                entity_type = result.entity_type
                entity_index[entity_type] = entity_index.get(entity_type, 0) + 1
                unique_placeholder = f"[{entity_type}_{entity_index[entity_type]}]"
                generic_placeholder = f"[{entity_type}]"
                
                # Replace first occurrence of generic placeholder
                anonymized_text = anonymized_text.replace(
                    generic_placeholder, 
                    unique_placeholder, 
                    1
                )
            
            logger.info(f"Text anonymized with {len(pii_mapping)} unique PII placeholders")
            
            return {
                "anonymizedText": anonymized_text,
                "detectedPii": pii_mapping,
                "entityCount": len(pii_mapping)
            }
            
        except Exception as e:
            logger.error(f"Error anonymizing text: {str(e)}")
            raise

    def analyze_and_anonymize(self, text, language="en"):
        """
        Combined method to analyze and anonymize text
        
        Args:
            text (str): Input text
            language (str): Language code
            
        Returns:
            dict: Anonymized result with PII mapping
        """
        try:
            # Step 1: Analyze for PII
            analyzer_results = self.analyze_text(text, language)
            
            if not analyzer_results:
                logger.info("No PII detected in text")
                return {
                    "anonymizedText": text,
                    "detectedPii": {},
                    "entityCount": 0
                }
            
            # Step 2: Anonymize
            result = self.anonymize_text(text, analyzer_results)
            
            return result
            
        except Exception as e:
            logger.error(f"Error in analyze_and_anonymize: {str(e)}")
            raise

    def deanonymize_text(self, anonymized_text, pii_mapping):
        """
        Replace placeholders with original PII values
        
        Args:
            anonymized_text (str): Text with placeholders
            pii_mapping (dict): Mapping of placeholders to original values
            
        Returns:
            str: Text with original PII restored
        """
        try:
            deanonymized_text = anonymized_text
            
            for placeholder, original_value in pii_mapping.items():
                deanonymized_text = deanonymized_text.replace(
                    placeholder, 
                    original_value
                )
            
            logger.info("Text deanonymized successfully")
            return deanonymized_text
            
        except Exception as e:
            logger.error(f"Error deanonymizing text: {str(e)}")
            raise

    def get_supported_entities(self):
        """
        Get list of supported PII entity types
        
        Returns:
            list: Supported entity types
        """
        try:
            return self.analyzer.get_supported_entities()
        except Exception as e:
            logger.error(f"Error getting supported entities: {str(e)}")
            raise