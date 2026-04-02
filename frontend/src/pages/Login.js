import { useState } from "react";
import axios from "axios";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const login = () => {
        axios.post("https://localhost:5001/api/auth/login", {
            email, password
        }).then(res => {
            localStorage.setItem("token", res.data.token);
            alert("Login success");
        });
    };

    return (
        <div className="p-6">
            <input placeholder="Email" onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
            <button onClick={login}>Login</button>
        </div>
    );
}