import { useState } from "react";
import axios from "axios";

export default function Register() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const register = () => {
        axios.post("https://localhost:5001/api/auth/register", {
            email, password, role: "user"
        }).then(() => alert("Register success"));
    };

    return (
        <div className="p-6">
            <input onChange={e => setEmail(e.target.value)} placeholder="Email" />
            <input onChange={e => setPassword(e.target.value)} placeholder="Password" />
            <button onClick={register}>Register</button>
        </div>
    );
}