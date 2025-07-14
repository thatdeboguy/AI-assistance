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
from .document_services import process_document_embedding
# Create your views here.

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all() # a list of users so when we are creating a new user we don't create one that already exist
    serializer_class = Userserializer #Tells this view what kind of data we are going to accept
    permission_classes = [AllowAny] #Who can actually call this class

    
class DocumentUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
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
            # Upload to MinIO
            minio_client = MinIOClient()            
            storage_path = minio_client.upload_file(file_obj, file_name)            
            
            # Save metadata to PostgreSQL
            document = Document.objects.create(
                file_name=file_name,
                owner=request.user,
                document_type=document_type,
                storage_path=storage_path
            )
            # create an embedding
            document = process_document_embedding(document.id)
            
            serializer = DocumentSerializer(document)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )