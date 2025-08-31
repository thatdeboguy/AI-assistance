// import tailwindcss from 'tailwindcss';
import "../styles/Chatlog.css"
import "../styles/Normalize.css"
function Message({ message }) {
    return (
        <div className={`chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}>
            {/* <div className="avatar">
                {message.role === 'user' ? 'You' : 'AI'}
            </div> */}
            <div className="message">
                {message.content}
                {message.isStreaming && (
                    <span className="streaming-cursor">|</span>
                )}
            </div>
        </div>
    );
}

export default Message;