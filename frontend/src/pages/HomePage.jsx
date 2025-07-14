import { useState, useEffect } from "react";
import api from '../api'
import "../styles/HomePage.css"
import "../styles/Normalize.css"

function HomePage(){

    return (
        <div className="HomePage">
            <aside className="sidemenu">
                <h1>Chats</h1>

            </aside>
            <section className="chatbox">
                <div className="chat-log"> 
                    <div className="chatMessage">
                       
                        <div className="message">
                            </div>
                    </div>
                </div>
                <div className="chat-input-holder">
                    <form className="inputform">

                    
                        <textarea className="chat-input-textarea" placeholder="Ask anything">
                            <button>+</button>
                            <input type="file" name="Add a file" />
                        </textarea>
                        
                    </form>

                </div>
            </section>

        </div>


    )
}
export default HomePage







// import { useState, useEffect } from "react"
// import api from '../api'
// import Note from "../components/Note";
// import "../styles/HomePage.css"


// function HomePage(){

//     const [notes, setNotes] = useState([]);
//     const [content, setContent] = useState("");
//     const [title, setTitle] = useState("")


//     useEffect (()=> {
//         getNotes();
//     }, [])
//     //We want to be able to return all the notes of the user 
//     const getNotes = ()=>{
//         api.get("/api/notes/").then((res)=> res.data).then((data)=> setNotes(data)).catch((error)=> alert(error));
        
//     }
//     const deleteNotes = (id)=>{
//         api.delete(`/api/notes/delete/${id}/`).then((res)=>{
//             console.log(res)
//             if (res.status === 204){
//                 alert("Note deleted")
//             }
//             else{
//                 alert("Failed to delete a node")
//             }
//             getNotes();}).catch((error)=> alert(error));
        
//     };
//     const createNote = (e) =>{
//         e.preventDefault()
//         api.post("/api/notes/", {content, title}).then((res)=>{
//             console.log(res)
//             if (res.status === 201) {
//                 alert("note Created!")
//             }else{
//                 alert("Failed to create a note.");
//             } 
//             getNotes();
//         }).catch((error)=> alert(error))
        
//         console.log(getNotes())
//     } 

//     return (
//         <div>
//             <div>
//                 <h2>Notes</h2>
//                 {notes.map((note)=> (<Note note={note} onDelete={deleteNotes} key={note.id} />
//             ))}
//             </div>
//             <h2>Create a Note</h2>
//             <form onSubmit = {createNote}>
//                 <label htmlFor="title">Title:</label>
//                 <br />
//                 <input 
//                     type="text"
//                     id="title"
//                     name="title"
//                     required
//                     onChange = {(e)=> setTitle(e.target.value)}
//                     value={title} 
//                 />
//                 <br />
//                 <label htmlFor="content">Content:</label>
//                 <br />
//                 <textarea 
//                     id="content"
//                     name="content"
//                     required
//                     value={content}
//                     onChange={(e)=> setContent(e.target.value)}>

//                 </textarea>
//                 <br />
//                 <input type="submit" value="Submit"></input>


//             </form>
//         </div>);
// }
// export default HomePage