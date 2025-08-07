from django.urls import path
from . import views

urlpatterns = [    
    path("upload/", views.DocumentUploadView.as_view(), name="document-upload"),
    path("test/", views.DocumentTesting.as_view(), name="document-test"),    
]