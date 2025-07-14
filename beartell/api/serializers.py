from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Document

class Userserializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "password"]
        extra_kwargs ={"password": {"write_only": True}}

    #The serializer would look for the model 'user' and the check and validate the fields
    # We would then create the user below by accepting the validated data. 
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        #'**' is used to split up the username and password.
        return user
    
#We use this as an api, so we send data to the front end using json, we serialize the attributes of a model.

class DocumentSerializer(serializers.ModelSerializer):

    class Meta:
        model = Document
        fields = [
            'id', 'file_name', 'owner', 'document_type', 
            'upload_time', 'storage_path'
        ]
        extra_kwargs = {
            'owner': {'read_only': True}
        }