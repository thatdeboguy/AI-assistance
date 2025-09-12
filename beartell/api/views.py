from django.shortcuts import render
from django.contrib.auth.models import User
from .minio_storage import MinIOClient
from .serializers import Userserializer, DocumentSerializer, DocumentListSerializer
from .models import Document, DocumentChunk
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import generics
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
import os
from django.utils import timezone
from pgvector.django import L2Distance
from .document_services import get_content, generate_embedding
from PIL import Image
from django.http import StreamingHttpResponse
import json
import time
import openai
from django.conf import settings

EMBEDDING_MODEL = "text-embedding-3-small"
openai.api_key = settings.OPENAI_API_KEY
encoding_name = "cl100k_base"

# Create your views here.

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all() # a list of users so when we are creating a new user we don't create one that already exist
    serializer_class = Userserializer #Tells this view what kind of data we are going to accept
    permission_classes = [AllowAny] #Who can actually call this class


class ChatView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, *args, **kwargs):
        user = request.user
        message = request.data.get('message', '').strip()
        chat_log = request.data.get('chat_log', [])
        document_ids = request.data.get('document_ids', [])
        print(f"Received message: {message}")
        print(f"document_ids: {document_ids}")
        if not message:
            return Response(
                {"error": "Message cannot be empty"},
                status=status.HTTP_400_BAD_REQUEST
            )  
        
        if document_ids:            
            # Return a streaming response
            return StreamingHttpResponse(
                self.stream_document_chat_response(user, message, chat_log, document_ids),
                content_type='text/event-stream'
            )
        else:
            # Original non-streaming logic
            return StreamingHttpResponse(
                self.non_streaming_response(user, message, chat_log),
                content_type='text/event-stream'
            )
    
    def stream_document_chat_response(self, user, message, chat_log, document_ids):
        """Generator function for streaming responses"""
        start_time = time.time()
        # RAG logic with documents
        documents = DocumentChunk.objects.filter(document__owner=user, document__id__in=document_ids)
        if not documents.exists():
            yield f"data: {json.dumps({'error': 'No documents found for the user'})}\n\n"
            return
        
        try:
            query_embedding = generate_embedding(message)
            similar_docs = documents.annotate(
                distance=L2Distance('embedding', query_embedding)
            ).order_by('distance')[:3]
            if not similar_docs:    
                yield f"data: {json.dumps({'error': 'No similar documents found'})}\n\n"
                return  
            # Prepare the context from the documents
            context = "\n\n".join([doc.content for doc in similar_docs if doc.content])
                        
            system_prompt = f"""You are a helpful AI assistant that provides answers based on the provided context.

            Context from user's documents:{context}

            Please answer the user's question based on the context above. If the context doesn't contain relevant information, say so politely."""
            # Prepare messages for OpenAI
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add only the last few messages to avoid token limits
            recent_history = chat_log[-6:]  # Keep last 3 exchanges (6 messages)
            for msg in recent_history:
                messages.append({"role": msg.get('role', 'user'), "content": msg.get('content', '')})
                
                # Add the current query
            messages.append({"role": "user", "content": message})

            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                temperature=0.2,
                max_tokens=1024,
                stream=True  # Enable streaming
            )
            
            # Stream the response
            full_response = ""
            for chunk in response:
                
                if chunk.choices[0].delta.content is not None:
                    content = chunk.choices[0].delta.content
                    full_response += content
                    
                    # Send each chunk to the client
                    yield f"data: {json.dumps({'content': content})}\n\n"
            elapsed_time = time.time() - start_time
            print(f"RAG response processed in {elapsed_time:.2f} seconds")
        except Exception as e:
            print(f"Error: {e}")
            error_msg = f"Error: {str(e)}"
            yield f"data: {json.dumps({'error': error_msg})}\n\n"
            return
    
    def non_streaming_response(self, user, message, chat_log):
        """Handle non-streaming requests (your original logic)"""
        # Your existing non-streaming logic here
        
        # RAG logic with documents
        
        start_time = time.time()
        system_prompt = """You are a helpful AI assistant. """
        messages = [{"role": "system", "content": system_prompt}]
        try:
            # Add only the last few messages to avoid token limits
            recent_history = chat_log[-6:]  # Keep last 3 exchanges (6 messages)
            for msg in recent_history:
                messages.append({"role": msg.get('role', 'user'), "content": msg.get('content', '')})

            messages.append({"role": "user", "content": message})

            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                temperature=0.2,
                max_tokens=1024,
                stream=True  # Enable streaming
            )
            if response: 
                print("standard chat, starting to stream...")
            # Stream the response
            full_response = ""
            for chunk in response:
                
                if chunk.choices[0].delta.content is not None:
                    content = chunk.choices[0].delta.content
                    full_response += content
                    
                    # Send each chunk to the client
                    yield f"data: {json.dumps({'content': content})}\n\n"
            elapsed_time = time.time() - start_time
            print(f"Chat response processed in {elapsed_time:.2f} seconds")
        except Exception as e:
            print(f"Error: {e}")
            return Response(
                {"error": "Failed to process request"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )        
        

    
class DocumentListView(generics.ListAPIView):
    serializer_class = DocumentListSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Return only document names and IDs for the authenticated user
        return Document.objects.filter(owner=user).values('id', 'file_name', 'document_type')
 

class DocumentUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        start_time = time.time()
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response(
                {"error": "No file provided"},
                status=status.HTTP_400_BAD_REQUEST
            )        
        # Validate file size (e.g., 200MB limit)
        max_size = 200 * 1024 * 1024  # 200MB
        if file_obj.size > max_size:
            return Response(
                {"error": "File size exceeds 200MB limit"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get file extension and determine document type
        file_name = file_obj.name
        
        file_ext = os.path.splitext(file_name)[1].lower().replace('.', '')
        
        # Map extensions to your document types
        ext_to_type = {
            'pdf': 'pdf',
            'doc': 'doc', 'docx': 'doc',
            'ppt': 'ppt', 'pptx': 'ppt',
            'xls': 'xls', 'xlsx': 'xls',
            'txt': 'txt', 
            'jpg': 'img', 'jpeg': 'img', 'png': 'img', 'gif': 'img', 'JPG': 'img',
            'mp3': 'aud', 'wav': 'aud',
            'mp4': 'vid', 'mov': 'vid', 'avi': 'vid',
            'zip': 'arc', 'rar': 'arc', '7z': 'arc',
        }
        
        document_type = ext_to_type.get(file_ext, 'oth')
        

        try:            
            print(f"Processing file: {file_name} of type {document_type}")
            document_content, embeddings = get_content(file_obj, document_type)
            if not document_content or not embeddings:
                # If no content was extracted, return an error response immediately 
                return Response(
                    {"error": "No content or embedding was extracted from the document"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Upload to MinIO
            minio_client = MinIOClient()       
            storage_path = minio_client.upload_file(file_obj, file_name)
            # Save metadata to PostgreSQL
            document = Document.objects.create(
                file_name=file_name,
                owner=request.user,
                upload_time=timezone.now(),
                document_type=document_type,
                storage_path=storage_path,
                text_content=document_content,
            )
            # create an embedding
            # document = process_document_embedding(document.id)
            for idx, (chunk, embedding) in enumerate(embeddings):
                DocumentChunk.objects.create(
                    #store document id not the whole object
                    document=document,
                    chunk_index=idx,
                    content=chunk,
                    embedding=embedding
                ) 
            serializer = DocumentSerializer(document)
            elapsed_time = time.time() - start_time
            print(f"Document processed in {elapsed_time:.2f} seconds")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"Error processing document: {e}")
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )