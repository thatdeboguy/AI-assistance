from pgvector.django import L2Distance
import openai
from .models import Document
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


EMBEDDING_MODEL = "text-embedding-3-small"
openai.api_key = settings.OPENAI_API_KEY
encoding_name = "cl100k_base"


def generate_embedding(text):
    """Generate vector embedding for text"""
    try:
        if not text or not isinstance(text, str):
            raise ValueError("Invalid text input for embedding generation")
        encoding  = tiktoken.get_encoding(encoding_name)
        num_of_tokens = len(encoding.encode(text))
        print(f"number of tokens: {num_of_tokens} cost of embedding number of tokens: {num_of_tokens/ 1000*0.002}")
        start_time = time.time()
        
        # Generate embedding using OpenAI API
        response = openai.embeddings.create(
            input = text.replace('\n', ''),
            model = "text-embedding-3-small",
        )
        elapsed_time = time.time() - start_time
        print(f"Embedding generated in  {elapsed_time:.2f} seconds")
        return response.data[0].embedding
    except Exception as e:
        print(f"Error with openai: {e}")
        raise

def find_similar_documents(query_embedding, user, limit=10):
    """Find similar documents for a given embedding"""
    # get documents to user including a match threshold
    if not query_embedding: 
        return None 
    try:
        documents = Document.objects.filter(owner=user).annotate(
            distance=L2Distance('embedding', query_embedding)
        ).order_by('distance')[:limit]
    except Exception as e:
        print(f"Error finding similar documents: {e}")
        return None
    return documents


# generating a response from the chatgpt without the documents
def process_chat_message(message, chat_log):
    """Process chat message and return a response"""
    start_time = time.time()
    print("started processing chat message")
    if not message:
        return {"error": "Message cannot be empty"}
    if not chat_log:
        chat_log = []
    
    system_prompt = """You are a helpful AI assistant. """

    
    messages = [{"role": "system", "content": system_prompt}]
    try:      
            # Add only the last few messages to avoid token limits
        recent_history = chat_log[-6:]  # Keep last 3 exchanges (6 messages)
        for msg in recent_history:
            messages.append({"role": msg.get('role', 'user'), "content": msg.get('content', '')})

        messages.append({"role": "user", "content": message})

        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.2,
            max_tokens=1024
        )
        elapsed_time = time.time() - start_time
        print(f"Chat message processed in {elapsed_time:.2f} seconds")
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error processing chat message: {e}")
        return {"error": "An error occurred while processing the message."}




# Generating a RAG response from chatgpt using the documents
def generate_rag_response(user, documents=None, chat_log=None, query=None): 
    """Generate a RAG response using OpenAI"""
    if not documents:
        return "No relevant documents found."
    
    # Prepare the context from the documents
    context = "\n\n".join([doc.text_content for doc in documents])
    conversation_history = format_chat_log(chat_log)
    
    system_prompt = f"""You are a helpful AI assistant that provides answers based on the provided context.

    Context from user's documents:{context}

    Please answer the user's question based on the context above. If the context doesn't contain relevant information, say so politely."""
    
    
    
    try:
        # Prepare messages for OpenAI
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add only the last few messages to avoid token limits
        recent_history = chat_log[-6:]  # Keep last 3 exchanges (6 messages)
        for msg in recent_history:
            messages.append({"role": msg.get('role', 'user'), "content": msg.get('content', '')})
            
            # Add the current query
        messages.append({"role": "user", "content": query})

        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.2,
            max_tokens=1024
        )
        print(f"Response from OpenAI: {response.choices[0].message.content}")
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error generating RAG response: {e}")
        return "An error occurred while generating the response."
    
def format_chat_log( chat_history):
    """Format chat history for the prompt"""
    if not chat_history:
        return "No previous conversation."
        
    formatted_history = []
    for msg in chat_history:
        role = msg.get('role', 'user')
        content = msg.get('content', '')
        formatted_history.append(f"{role.capitalize()}: {content}")
        
    return "\n".join(formatted_history[-10:])
    


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
            embeddings = generate_embedding(text)
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
        return text, embeddings
    
    except Exception as e:
        print(f"Error reading file object: {e}")
        raise
