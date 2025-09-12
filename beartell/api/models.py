from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from pgvector.django import VectorField


class Document(models.Model):

        # Document types
    DOCUMENT_TYPES = (
        ('pdf', 'PDF'),
        ('doc', 'Word'),
        ('ppt', 'PowerPoint'),
        ('xls', 'Excel'),
        ('txt', 'Text'),
        ('img', 'Image'),
        ('aud', 'Audio'),
        ('vid', 'Video'),
        ('arc', 'Archive'),
        ('oth', 'Other'),
    )

    file_name= models.CharField(max_length=100)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="documets")
    upload_time = models.DateTimeField(default=timezone.now)
    document_type = models.CharField(max_length=3, choices=DOCUMENT_TYPES)
    storage_path = models.CharField(max_length=512) #path in S3 MinIO
    text_content = models.TextField(null=True, blank=True)    

    #configuring how the table behaves
    class Meta:
        indexes = [
            models.Index(fields=['owner', 'upload_time']),
            models.Index(fields=['file_name']),
        ]
        ordering = ['-upload_time']
    

    def __str__(self):
        return f"{self.file_name} {self.document_type}"
class DocumentChunk(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="chunks")
    chunk_index = models.IntegerField()
    content = models.TextField(null=True, blank=True)
    embedding = VectorField(dimensions=1536, null=True, blank=True)


