import { useState } from "react";
import axios from "axios";

export default function Admin() {
    const [title, setTitle] = useState("");
    const [price, setPrice] = useState("");

    const create = () => {
        axios.post("https://localhost:5001/api/events", {
            title,
            price,
            image: "https://via.placeholder.com/300"
        }).then(() => alert("Created"));
    };

    return (
        <div className="p-6">
            <input placeholder="Title" onChange={e => setTitle(e.target.value)} />
            <input placeholder="Price" onChange={e => setPrice(e.target.value)} />

            <button onClick={create} className="bg-red-500 text-white px-4 py-2">
                Add Event
            </button>
        </div>
    );
}