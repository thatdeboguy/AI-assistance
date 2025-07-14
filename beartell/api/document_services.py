from pgvector.django import L2Distance
from  openai import OpenAIError, OpenAI
from .models import Document
from minio import Minio, S3Error
import os
from django.conf import settings
from .minio_storage import MinIOClient
from django.conf import settings

EMBEDDING_MODEL = "text-embedding-3-small"
openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)

def extract_text_from_document(file_path):
    """Extract text based on file type"""
    try:

        minio_client = MinIOClient()
        document = minio_client.extract_text(file_path)
        
        return document
    except S3Error as e:
        print(f"Error in extracting text {e}")
        raise
    

def generate_embedding(text):
    """Generate vector embedding for text"""
    try:
        if not text or not isinstance(text, str):
            raise ValueError("Invalid text input for embedding generation")

        response = openai_client.embeddings.create(
            input=[text.replace("\n", " ")],
            model="text-embedding-3-small",
        )
        print(response)
        return response.data[0].embedding
    except OpenAIError as e:
        print(f"Error with openai: {e}")
        raise


def process_document_embedding(document_id):
    """Main function to process and store embeddings"""
    document = Document.objects.get(id=document_id)
    try:
        # 1. Extract text
        text_content = extract_text_from_document(document.storage_path)
        if not text_content.strip():
                raise ValueError("Extracted text is empty")
        document.text_content = text_content
        document.save()
    except ValueError as e:
        print(f"Text extraction failed for document {document_id}: {str(e)}")
        return None
    try:
        # 2. Generate embedding
        embedding = generate_embedding(text_content)
        
        # 3. Store embedding
        document.embedding = embedding
        document.save()
        
        return document
    except Exception as e:
        print(f"Error processing document {e}")

def find_similar_documents(query_embedding, user, limit=10):
    """Find similar documents for a given embedding"""
    return Document.objects.filter(owner=user).annotate(
        distance=L2Distance('embedding', query_embedding)
    ).order_by('distance')[:limit]