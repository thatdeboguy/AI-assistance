import {Navigate} from "react-router-dom"
import {jwtDecode} from 'jwt-decode'
import api from '../api'
import { REFRESH_TOKEN, ACCESS_TOKEN } from "../constsnts"
import { useState, useEffect } from "react"


function ProtectedRoute({children}){
    const [IsAuthorized, setIsAuthorized] = useState(null);

    useEffect (()=>{
        auth().catch(()=> setIsAuthorized(false)) }, [])

    const refresh_token = async () => { //This method is called by the auth function, in order to refresh the access token
        const refreshtoken = localStorage.getItem(REFRESH_TOKEN) //gets the refresh token

        try{
            //sends the refresh token to the backend in order to get a new access token
            
            const res = await api.post("/api/token/refresh/", {refresh: refreshtoken, });
            if (res.status === 200){ //checks if the return was successfull
                localStorage.setItem(ACCESS_TOKEN, res.data.access)//Replace the access token
                setIsAuthorized(true)
            }else{
                setIsAuthorized(false)
            }        
        }catch(error){
            console.log(error)
            setIsAuthorized(false)
        }

    }
    const auth = async() =>{//The idea is to check inside our access token to see if we have one, 
    // if we do we check if it's expired or not, if it is we just automatically refreshes it.
    //  If it is expired then we just tell the user that they are not authorized.

    const token = localStorage.getItem(ACCESS_TOKEN)
    

    if(!token){
        setIsAuthorized(false);
        return
    }
    const decode = jwtDecode(token)
    const tokenExpiration = decode.exp
    const now = Date.now() /1000

    if (tokenExpiration < now){
        await refresh_token()
    }else{
        setIsAuthorized(true)
    }

    }

    if (IsAuthorized === null){
        return <div>Loading...</div>
    }

    return IsAuthorized ? children : <Navigate to="/login" />

}
export default ProtectedRoute;
