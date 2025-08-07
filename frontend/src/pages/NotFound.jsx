import React, { useState } from 'react';
import api from '../api';

const FileUpload = () => {
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadResult, setUploadResult] = useState(null);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a file');
            return;
        }

        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post('/api/upload/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    setUploadProgress(percentCompleted);
                },
            });

            setUploadResult(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div>
            <h2>Upload Document</h2>
            <form onSubmit={handleSubmit}>
                <input type="file" onChange={handleFileChange} />
                <button type="submit" disabled={isUploading}>
                    {isUploading ? 'Uploading...' : 'Upload'}
                </button>
            </form>

            {isUploading && (
                <div>
                    <progress value={uploadProgress} max="100" />
                    <span>{uploadProgress}%</span>
                </div>
            )}

            {error && <div style={{ color: 'red' }}>{error}</div>}

            {uploadResult && (
                <div>
                    <h3>Upload Successful!</h3>
                    <p>File Name: {uploadResult.file_name}</p>
                    <p>Document Type: {uploadResult.document_type}</p>
                    {/* You can add a short link here later */}
                </div>
            )}
            <div>   
                <h1>Query</h1>
                <p> 
                    <input type='text' name="query"></input>
                </p>
            </div>
        </div>
    );
};

export default FileUpload;