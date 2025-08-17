from django.shortcuts import render
from django.contrib.auth.models import User
from .minio_storage import MinIOClient
from .serializers import Userserializer, DocumentSerializer
from .models import Document
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import generics
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
import os
from django.utils import timezone
from .document_services import get_content
from PIL import Image
import pytesseract
import time
# Create your views here.

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all() # a list of users so when we are creating a new user we don't create one that already exist
    serializer_class = Userserializer #Tells this view what kind of data we are going to accept
    permission_classes = [AllowAny] #Who can actually call this class

class ChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        start_time = time.time()
        user = request.user
        message = request.data.get('message', '').strip()
        
        if not message:
            return Response(
                {"error": "Message cannot be empty"},
                status=status.HTTP_400_BAD_REQUEST
            )
        documents = Document.objects.filter(owner=user)
        # scan the documents available from the user and then process the chat message
        if not documents.exists():
            return Response(
                {"error": "No documents found for the user"},
                status=status.HTTP_404_NOT_FOUND
            )
        # Here you would typically process the chat message with the user's documents
        # Get a response message from the chat processing logic
        response_message = self.process_chat_message(user, message)
        
        elapsed_time = time.time() - start_time
        print(f"Chat processed in {elapsed_time:.2f} seconds")
        
        return Response({"response": response_message}, status=status.HTTP_200_OK)

    def process_chat_message(self, user, message):
        # Placeholder for actual chat processing logic
        return f"Processed message from {user.username}: {message}"
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
                document_type=document_type,
                storage_path=storage_path,
                embedding = embeddings,
                text_content=document_content,
            )
            # create an embedding
            # document = process_document_embedding(document.id)
            
            serializer = DocumentSerializer(document)
            elapsed_time = time.time() - start_time
            print(f"Document processed in {elapsed_time:.2f} seconds")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )