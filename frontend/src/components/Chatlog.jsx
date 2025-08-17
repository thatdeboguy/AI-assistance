
const Message = ({ message }) => {
    return (
        <div className={`chat-message ${message.role === 'user' ? 'You' : 'AI'}`}>
            <div className="chat-message-center" >
                
                <div className={`avatar ${message.role === 'user' ? 'You': 'AI'}`}>

                </div>
                <div className="message"> 
                    {message.content}              
                </div>
            </div>

        </div>
);
    }
export default Message;