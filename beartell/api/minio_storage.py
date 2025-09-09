from minio import Minio
from minio.error import S3Error
from django.conf import settings
import os
import pdfplumber
import pytesseract
from PIL import Image
from docx import Document
import io
from dotenv import load_dotenv


load_dotenv('.env.local')  # Load environment variables from .env file
class MinIOClient:
    def __init__(self):
        self.client = Minio(
            "localhost:9000",
            access_key=os.getenv("MINIO_ACCESS_KEY"),
            secret_key=os.getenv("MINIO_SECRET_KEY"),
            secure=False  
        )
        self.bucket_name = os.getenv('MINIO_BUCKET_NAME')

    def ensure_bucket_exists(self):
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
        except S3Error as e:
            print(f"Error creating bucket: {e}")
            raise

    def upload_file(self, file_object, file_name):
        try:
            print(f"Uploading file: {file_name} to bucket: {self.bucket_name}")
            self.ensure_bucket_exists()
            # Universal file size detection
            # Reset file pointer to start (critical for re-reading)
            if hasattr(file_object, 'seek'):
                file_object.seek(0)

            # Get file size correctly
            if hasattr(file_object, 'size'):
                file_size = file_object.size
            else:
                # For in-memory files (BytesIO, etc.)
                file_object.seek(0, os.SEEK_END)
                file_size = file_object.tell()
                file_object.seek(0)  # Rewind after measurement

            # Ensure content_type is set (default to 'application/octet-stream')
            content_type = getattr(file_object, 'content_type', 'application/octet-stream')

            self.client.put_object(
                self.bucket_name,
                file_name,
                file_object,
                file_size,
                content_type=content_type
            )
            return f"{self.bucket_name}/{file_name}"
        except S3Error as e:
            print(f"Error uploading file: {e}")
            raise 

    def extract_text(self, file_path: str) -> str:
        try:            
            # Get object from MinIO
            bucket, file_name = file_path.split('/', 1)
            try:

                file_obj = self.client.get_object(bucket, file_name)
                print(f"{file_obj}")

                # Read into bytes and identify file type
                file_bytes = file_obj.read()
            finally:
                file_obj.close()
                file_obj.release_conn()
            # Get file extension from path
            file_ext = file_name.split('.')[-1].lower() if '.' in file_name else ''

            # Define supported extensions and their types
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
        
            # Get document type or default to 'oth' (other)
            document_type = ext_to_type.get(file_ext, 'oth')

            if document_type == 'pdf':
                
                return self._extract_pdf_text(file_bytes)
            elif document_type == 'doc':
                return self._extract_docx_text(file_bytes)
            elif document_type == 'img':
                return self._extract_image_text(file_bytes)
            elif document_type == 'txt':
                return file_bytes.decode('utf-8')  # Directly read text files
            else:
                return f"Unsupported file type: {file_ext}"
        except Exception as e:
            print (f"Error extracting text: {e}")
            raise

    try:

        def _extract_pdf_text(self, file_bytes: bytes) -> str:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                return "\n".join(page.extract_text() or "" for page in pdf.pages)

        def _extract_docx_text(self, file_bytes: bytes) -> str:
            doc = Document(io.BytesIO(file_bytes))
            return "\n".join(paragraph.text for paragraph in doc.paragraphs)

        def _extract_image_text(self, file_bytes: bytes) -> str:
            image = Image.open(io.BytesIO(file_bytes))
            return pytesseract.image_to_string(image)
    except Exception as e:
        print(f"Error extraction:  {e}")
        raise