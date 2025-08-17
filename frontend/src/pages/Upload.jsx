import { useState, useRef, useEffect } from "react";
import api from '../api';
import "../styles/Upload.css";
import "../styles/Normalize.css";

function HomePage() {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! How can I help you today?' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);


    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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
        console.log('User message:', userMessage);
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            // Simulate API call - replace with your actual API call
            const response = await api.post('/api/chat', { message: inputValue });
            
            // Add assistant response
            setMessages(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
        } catch (error) {
            setMessages(prev => [...prev, { 
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

    return (
        <div className="panel-container">
            <aside className="sidemenu">
                <h1>Resources</h1>
                <button className="add-file">
                    <span className="add-icon">+</span>
                    Add a File
                </button>
                <div className="Notes"></div>
            </aside>

            <section className="chatbox">
                <div className="chat-log">
                    {messages.map((message, index) => (
                        <div 
                            key={index} 
                            className={`chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
                        >
                            <div className="avatar">
                                {message.role === 'user' ? 'You' : 'AI'}
                            </div>
                            <div className="message">
                                {message.content.split('\n').map((paragraph, i) => (
                                    <p key={i}>{paragraph}</p>
                                ))}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="chat-message assistant-message">
                            <div className="avatar">AI</div>
                            <div className="message loading">
                                <span className="dot">.</span>
                                <span className="dot">.</span>
                                <span className="dot">.</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                
                <div className="chat-input-holder">
                    <form onSubmit={handleSubmit}>
                        <input
                            type="text"
                            ref={textareaRef}
                            className="chat-input-textarea"
                            placeholder="Type your message here..."
                            rows="1"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                        />
                        <button 
                            type="submit" 
                            className="send-button"
                            disabled={!inputValue.trim() || isLoading}
                        >
                            Send
                        </button>
                    </form>
                </div>
            </section>
        </div>
    );
}

export default HomePage;