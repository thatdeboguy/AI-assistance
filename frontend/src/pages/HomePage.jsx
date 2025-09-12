import { useState, useRef, useEffect, use } from "react";
import api from '../api'
import "../styles/HomePage.css"
import Message from "../components/Chatlog";
import LoadingIndicator from "../components/LoadingIndicator" 
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constsnts";
import { Navigate } from "react-router-dom"


function HomePage() {
    const [chatlog, setchatlog] = useState([
        { role: 'assistant', content: 'Hello! How can I help you today?' }
    ]);
    const [documents , setDocuments] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [popupaddfile, setPopupAddFile] = useState(false);
    const [file, setFile] = useState(null);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const [selectedDocIds, setSelectedDocIds] = useState([]);
    // Clear chatlog To start a new chat.
    function clearChat() {
        setchatlog([]);
        setInputValue('');
        setIsLoading(false);   
    }

    const handleDocSelection = (docId) => {
        setSelectedDocIds(prev => 
            prev.includes(docId) 
                ? prev.filter(id => id !== docId)
                : [...prev, docId]
        );
        console.log('Selected document IDs:', selectedDocIds);
    };

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatlog]);

    // Auto-resize textarea based on content
    const handleInputChange = (e) => {
        setInputValue(e.target.value);

        // Auto-resize textarea
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto"; // Reset height
            textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"; // Set new height
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;
        
        // Get selected documents
        const selectedDocs = Array.from(document.querySelectorAll('input[name="file-select"]:checked'))
            .map(input => input.id);
        
        // Add user message
        const userMessage = { role: 'user', content: inputValue };
        setchatlog(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            // For streaming, we'll add a placeholder assistant message
            const assistantMessageId = Date.now(); // Unique ID for the message
            setchatlog(prev => [...prev, { 
                id: assistantMessageId, 
                role: 'assistant', 
                content: '', 
                isStreaming: true 
            }]);
            
            // Send request with streaming enabled
            const response = await fetch('/api/chat/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem(ACCESS_TOKEN)}`,
                },
                body: JSON.stringify({
                    message: inputValue,
                    chat_log: chatlog,
                    document_ids: selectedDocs,
                    stream: true
                }),
            });
            console.log('The response is ', response);
            if (!response.ok || !response.body) {
                throw new Error('Network response was not ok');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n').filter(line => line.trim());

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = JSON.parse(line.substring(6));

                        if (data.content) {
                            assistantContent += data.content;
                            setchatlog(prev => prev.map(msg =>
                                msg.id === assistantMessageId
                                    ? { ...msg, content: assistantContent }
                                    : msg
                            ));
                        } else if (data.done) {
                            setchatlog(prev => prev.map(msg =>
                                msg.id === assistantMessageId
                                    ? { ...msg, isStreaming: false }
                                    : msg
                            ));
                            console.log(`Chat processed in ${data.time} seconds`);
                        } else if (data.error) {
                            throw new Error(data.error);
                        }
                    }
                }
            }
        } catch (error) {
            setchatlog(prev => [...prev, { 
                role: 'assistant', 
                content: 'Sorry, there was an error processing your request.' 
            }]);
            console.error('Chat error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };
    const handleFileSubmit = async (e) => {
        e.preventDefault();
        
        if (!file) {
            alert('Please select a file to upload');
            return;
        }
        if (file.size > 200 * 1024 * 1024) { // 200MB limit
            alert('File size exceeds 200MB limit');
            return;
        }
        setIsLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post('/api/upload/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            alert(`File uploaded successfully: ${response.data.file_name}`);
            const documentResponse = await api.get('/api/documents/');
            setDocuments(documentResponse.data);
            setPopupAddFile(false);
        } catch (error) {
            console.error('File upload error:', error);
            alert('Failed to upload file');
        }finally {
            setIsLoading(false);
            setFile(null);
        }
        
        
    };
    useEffect(() => {
        const fetchDocuments = async () => {
            try {
                const response = await api.get('/api/documents/');
                setDocuments(response.data);
            } catch (error) {
                console.error('Error fetching documents:', error);
            }
        };

        fetchDocuments();
    }, [popupaddfile]);
    const handleLogout = (e) => {
    e.preventDefault();
    
    // Clear authentication tokens
    localStorage.clear()
    
    // Clear chat state if needed
    setchatlog([]);
    
    // Redirect to login page
    window.location.href = '/login';
    };

    return (
    <div className="homepage-container">
        <header className="header">
            <div className="header-content">
                <a href="/login" className="logout-link" onClick={handleLogout}>
                    Logout
                </a>
                <h1 className="app-title">AI Chat Application</h1>
                
            </div>
        </header>
        <div className="panel-container">
            
            <aside className="sidemenu">
                <h1>Resources</h1>
                <button className="add-file"  onClick={() => setPopupAddFile(true)}>
                    <span className="add-file-icon">+</span>                  
                    Add a File
                    
                </button> 
                
                
                { 
                    documents &&(
                        <div className="files-list">
                            {documents.map((doc, index) => (
                                <div key={index} className="file-item">
                                    <input 
                                        type="checkbox" 
                                        id={`${doc.id}`} 
                                        name="file-select" 
                                        value={doc.file_name}
                                        checked={selectedDocIds.includes(doc.id)}
                                        onChange={() => handleDocSelection(doc.id)}
                                    />
                                    <label htmlFor={`file-${index}`}>{doc.file_name}</label>
                                </div>
                                )
                            )}
                        </div>

                    )
                        
                }
                
            </aside>

            <div className="chatbox"> 
                <div className="chat-log"> 
                        {chatlog.map((message, index) => (
                            <Message key= {index} message = {message}/>
                        ))}
                        
                    
                    {popupaddfile && (
                        <div className="popup-overlay">
                            <div className="popup-box">
                            <div className="popup-header">
                                <h2>Add a File</h2>
                                <button className="close-popup" onClick={() => setPopupAddFile(false)}>✕</button>
                            </div>

                            <form onSubmit={handleFileSubmit} className="popup-form">
                                <input 
                                type="file" 
                                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                                onChange={(e) => setFile(e.target.files[0])}
                                className="file-input"
                                />
                                {isLoading && <LoadingIndicator />}
                                <button type="submit" className="upload-button">Upload</button>
                            </form>
                            </div>
                        </div>
                        )}                          
                    <div className="chat-input-holder">
                        <form onSubmit={handleSubmit} className="chat-input-form">
                            <textarea
                                type="text"
                                ref={textareaRef}
                                className="chat-input-textarea"
                                placeholder="Start Typing..."
                                rows="1"
                                value={inputValue}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                disabled={isLoading}
                            />
                            <div className="input-group-append" onClick={handleSubmit}>
                                <span className="input-group-text send-icon"><i className="bi bi-send"></i></span>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HomePage;
