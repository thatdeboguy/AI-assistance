import react from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import HomePage from "./pages/HomePage"
import Login from "./pages/Login"
import Register from "./pages/Register"
import NotFound from "./pages/NotFound"
import ProtectedRoute from "./components/ProtectedRoute"
import Upload from "./pages/Upload"

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
      <Route path="/upload" element = {
        <ProtectedRoute>
         <HomePage />
        </ProtectedRoute>
      }/>
      <Route path="/login" element={<Login />}/>
      <Route path="/logout" element={<Logout />}/>
      <Route path="/register" element={<Register />}/>
      <Route path="/test" element={<Upload />}/>
      <Route path="/" element={
        <ProtectedRoute>
          <NotFound />
        </ProtectedRoute>} />
      
    </Routes>
    </BrowserRouter>
     </>
  )
}

export default App
