// import tailwindcss from 'tailwindcss';
import "../styles/Chatlog.css"
import "../styles/Normalize.css"
import ReactMarkdown from "react-markdown";
function Message({ message }) {
    return (
        <div className={`chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}> 
            

            <div className="message" style={{ whiteSpace: "pre-wrap" }}>
                {/* Render markdown for assistant, plain text for user */}
                {message.role === "assistant" ? 
                    (<ReactMarkdown>{message.content}</ReactMarkdown> )
                     : (
                        message.content
                        )}
                {message.isStreaming && (
                    <span className="streaming-cursor">|</span>
                )}
            </div>
        </div>
    );
}

export default Message;