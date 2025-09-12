from pgvector.django import L2Distance
import openai
from .models import Document, DocumentChunk
from minio import Minio, S3Error
import os
from django.conf import settings
from .minio_storage import MinIOClient
import tiktoken
import PyPDF2
from PIL import Image
import pytesseract
# from docx import Document
import time 
from sentence_transformers import SentenceTransformer, util
from django.db import connection

def generate_embedding(text):
    """Generate vector embedding for text"""
    try:
        if not text:
            return None
        model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        embedding = model.encode(text)
        return embedding.tolist()
    except Exception as e:
        print(f"Error with generating embedding: {e}")
        raise
    

def chunk_text(text, chunk_size=500, overlap=50):
    """Chunk text into smaller pieces with overlap"""
    if not text:
        return []
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += chunk_size - overlap  # move forward with overlap
    return chunks

def get_content(file_obj, document_type):
    """Get content from file object"""
    text = ""  # Initialize text
    embeddings = None  # Initialize embeddings
    try:
        if(document_type == 'pdf'):
            pdf_reader = PyPDF2.PdfReader(file_obj)
            text = ""

            # Read the PDF directly from the in-memory file
            for page in pdf_reader.pages:
                text += page.extract_text()             
        elif document_type == ('doc', 'docx'):
            doc = Document(file_obj)
            text = "\n".join(paragraph.text for paragraph in doc.paragraphs)
            embeddings = generate_embedding(text)
        elif document_type == 'txt':
            text = file_obj.read().decode('utf-8')
            embeddings = generate_embedding(text)
        elif document_type == 'img':
            image = Image.open(file_obj)
            text = pytesseract.image_to_string(image)
            embeddings = generate_embedding(text)
        else:
            raise ValueError(f"Unsupported document type: {document_type}")
        chunks= chunk_text(text, chunk_size=500, overlap=50)
        #print the first 5 chunks to debug
        embeddings = []
        for chunk in chunks:
            emb = generate_embedding(chunk)
            embeddings.append(emb)
        return text, list(zip(chunks, embeddings)) #(chunk, embedding) pairs     
        chunks= chunk_text(text, chunk_size=500, overlap=50)
        #print the first 5 chunks to debug
        embeddings = []
        for chunk in chunks:
            emb = generate_embedding(chunk)
            embeddings.append(emb)
        return text, list(zip(chunks, embeddings)) #(chunk, embedding) pairs    
    except Exception as e:
        print(f"Error reading file object: {e}")
        raise
