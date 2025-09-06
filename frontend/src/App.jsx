import react from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import HomePage from "./pages/HomePage"
import Login from "./pages/Login"
import Register from "./pages/Register"
import NotFound from "./pages/NotFound"
import ProtectedRoute from "./components/ProtectedRoute"


function Logout(){
  localStorage.clear() //This clears both our access_token and refresh_token
  return <Navigate to="/login" />
}

function RegisterAndLogout(){
  localStorage.clear()
  return <Register />
}

function App() {

  return (
    <>
    <BrowserRouter>
    <Routes>
      <Route path="/" element = {
        <ProtectedRoute>
         <HomePage />
        </ProtectedRoute>
      }/>
      <Route path="/login" element={<Login />}/>
      <Route path="/logout" element={<Logout />}/>
      <Route path="/register" element={<Register />}/>
      

      
    </Routes>
    </BrowserRouter>
     </>
  )
}

export default App
