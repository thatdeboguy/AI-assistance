from django.urls import path
from . import views

urlpatterns = [    
    path("upload/", views.DocumentUploadView.as_view(), name="document-upload"), 
    path("chat/", views.ChatView.as_view(), name="chat"),
    path("documents/", views.DocumentListView.as_view(), name="document-list"),
    
]