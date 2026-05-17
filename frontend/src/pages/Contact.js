import { useState } from "react";

export default function Contact() {
    const [message, setMessage] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        alert("Cảm ơn! Tin nhắn đã được gửi. (UI-only demo)");
        setName("");
        setEmail("");
        setMessage("");
    };

    return (
        <div className="bg-gray-100 min-h-screen p-10">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-4xl font-black text-gray-900 mb-8 text-center">Contact Us</h1>
                <div className="bg-white rounded-2xl p-8 shadow-md">
                    <p className="text-gray-600 mb-6">If you need assistance, please send us a message or email at <a className="text-blue-600" href="mailto:neverwintop@gmail.com">neverwintop@gmail.com</a>.</p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input required value={name} onChange={(e)=>setName(e.target.value)} placeholder="Your name" className="w-full p-3 rounded-lg border" />
                        <input required type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Your email" className="w-full p-3 rounded-lg border" />
                        <textarea required value={message} onChange={(e)=>setMessage(e.target.value)} placeholder="Message" rows={6} className="w-full p-3 rounded-lg border" />
                        <button className="bg-yellow-400 text-black px-6 py-3 rounded-lg font-bold">Send message</button>
                    </form>
                </div>
            </div>
        </div>
    );
}
