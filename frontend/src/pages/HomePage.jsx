import { useState, useRef, useEffect } from "react";
import api from '../api'
import "../styles/HomePage.css"
import "../styles/Normalize.css"
import Message from "../components/Chatlog";
import { Link } from 'react-router-dom';


function HomePage() {
    const [chatlog, setchatlog] = useState([
        { role: 'assistant', content: 'Hello! How can I help you today?' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [popupaddfile, setPopupAddFile] = useState(false);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    // Clear chatlog To start a new chat.
    function clearChat() {
        setchatlog([]);
        setInputValue('');
        setIsLoading(false);   
    }



    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatlog]);

    // Auto-resize textarea based on content
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [inputValue]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        // Add user message
        const userMessage = { role: 'user', content: inputValue };
        setchatlog( [...chatlog, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            // send the chat message to the backend
            const response = await api.post('/api/chat', { message: inputValue });
            
            // Add assistant response
            setchatlog( [...chatlog, { role: 'assistant', content: response.data.reply }]);
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
        const file = e.target.files[0];
        if (!file) {
            alert('Please select a file to upload');
            return;
        }
        if (file.size > 200 * 1024 * 1024) { // 200MB limit
            alert('File size exceeds 200MB limit');
            return;
        }
        if (file){
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await api.post('/api/upload/', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
                alert(`File uploaded successfully: ${response.data.file_name}`);
            } catch (error) {
                console.error('File upload error:', error);
                alert('Failed to upload file');
            }
        }
    };

    return (
        <div className="panel-container">
            <aside className="sidemenu">
                <h1>Resources</h1>
                <button className="add-file"  onClick={() => setPopupAddFile(true)}>
                    <span className="add-file-icon">+</span>                  
                    Add a File
                    
                </button>    
                <div className="Notes">
                    
                </div>
            </aside>

            <section className="chatbox">
                <div className="chat-log">
                    {chatlog.map((message, index) => (
                        <Message key= {index} message = {message}/>
                    ))}
                </div>  
                {
                    popupaddfile && 
                    <div className="popup">
                        <div className="popup-content">
                            <h2>Add a File</h2>
                            <button className="close-popup" onClick={() => setPopupAddFile(false)}>X</button>
                        </div>
                        <form onSubmit={handleFileSubmit} className="file-upload-form">
                            <input 
                                type="file" 
                                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png" 
                                onChange={handleFileSubmit} 
                                className="file-input"
                            />
                            <button type="submit" className="upload-button">Upload</button>

                        </form>

                    </div>
                }  
                         
                <div className="chat-input-holder">
                    <form onSubmit={handleSubmit}>
                        <input
                            type="text"
                            ref={textareaRef}
                            className="chat-input-textarea"
                            placeholder="Start Typing..."
                            rows="1"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                        />
                        {/* <button 
                            type="submit" 
                            className="send-button"
                            disabled={!inputValue.trim() || isLoading}
                        >
                            Send
                        </button> */}
                    </form>
                </div>
            </section>
        </div>
    );
}

export default HomePage;
