import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { FiUpload, FiX, FiCheck } from "react-icons/fi";
import "../styles/FileUploadInterface.css"

const FileUploadInterface = () => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle', 'uploading', 'success', 'error'
  const [preview, setPreview] = useState(null);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      generatePreview(selectedFile);
    }
  };

  // Generate preview for images/PDFs
  const generatePreview = (file) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      generatePreview(droppedFile);
    }
  };

  // File upload handler
  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);

    try {
      setUploadStatus('uploading');
      
      const response = await axios.post('/api/documents/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        }
      });

      setUploadStatus('success');
      setTimeout(() => {
        setUploadStatus('idle');
        setFile(null);
        setPreview(null);
      }, 3000);
      
      console.log('Upload successful:', response.data);
    } catch (error) {
      setUploadStatus('error');
      console.error('Upload failed:', error);
    }
  };

  // Remove selected file
  const removeFile = () => {
    setFile(null);
    setPreview(null);
    setUploadStatus('idle');
  };

  return (
    <div className="file-upload-container">
      <h2>Upload Your Documents</h2>
      <p>Store, organize, and process your files with our AI assistant</p>
      
      <div 
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {!file ? (
          <>
            <FiUpload className="upload-icon" />
            <p>Drag & drop files here, or click to browse</p>
            <input 
              type="file" 
              id="file-upload"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <label htmlFor="file-upload" className="browse-btn">
              Select File
            </label>
          </>
        ) : (
          <div className="file-preview">
            {preview ? (
              <img src={preview} alt="Preview" className="thumbnail" />
            ) : (
              <div className="file-icon">
                {file.type.split('/')[0] === 'application' ? 
                  <span className="doc-icon">DOC</span> : 
                  <span className="file-ext">{file.name.split('.').pop()}</span>
                }
              </div>
            )}
            <div className="file-info">
              <h4>{file.name}</h4>
              <p>{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              {uploadStatus === 'uploading' && (
                <div className="progress-bar">
                  <div 
                    className="progress" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
            {uploadStatus !== 'uploading' && (
              <button onClick={removeFile} className="remove-btn">
                <FiX />
              </button>
            )}
          </div>
        )}
      </div>

      {file && uploadStatus === 'idle' && (
        <button 
          onClick={handleUpload}
          className="upload-btn primary"
        >
          Upload Document
        </button>
      )}

      {uploadStatus === 'success' && (
        <div className="status-message success">
          <FiCheck /> Upload successful!
        </div>
      )}

      {uploadStatus === 'error' && (
        <div className="status-message error">
          Upload failed. Please try again.
        </div>
      )}

      <div className="supported-formats">
        <h4>Supported Formats:</h4>
        <div className="format-tags">
          <span>PDF</span>
          <span>DOCX</span>
          <span>PPTX</span>
          <span>XLSX</span>
          <span>JPG/PNG</span>
          <span>MP3/MP4</span>
          <span>TXT</span>
        </div>
      </div>
    </div>
  );
};

export default FileUploadInterface;