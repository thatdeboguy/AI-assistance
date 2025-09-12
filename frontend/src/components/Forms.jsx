import { useState } from "react";
import api from '../api'
import { useNavigate, Link } from 'react-router-dom'
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constsnts";
import "../styles/Form.css"
import LoadingIndicator from "./LoadingIndicator" 

function Form({ route, method }) {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const name = method === "login" ? "Login" : "Register"

    const handleSubmit = async (e) => {
        e.preventDefault() // prevent page reload
        setLoading(true)

        try {
            const res = await api.post(route, { username, password })
            if (method === "login") {
                localStorage.setItem(ACCESS_TOKEN, res.data.access);
                localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
                navigate("/")
            } else {
                navigate("/login")
            }
        } catch (error) {
            alert(error)
            console.log(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="form-container">
            <h1>{name}</h1>

            <input
                className="form-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
            />

            <input
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
            />

            {loading && <LoadingIndicator />}

            <button type="submit" className="form-button">
                {name}
            </button>

            <div className="form-footer">
                {method === "login" ? (
                    <>Don’t have an account? <Link to="/register">Register</Link></>
                ) : (
                    <>Already have an account? <Link to="/login">Login</Link></>
                )}
            </div>
        </form>
    )
}

export default Form
