import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

export default function Register() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const register = () => {
        if (password !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }

        axios.post("https://localhost:5001/api/auth/register", {
            email, password, role: "user"
        }).then(() => {
            alert("Registration successful! Please login.");
            // Redirect to login after successful registration
            window.location.href = "/auth/login";
        }).catch(err => {
            alert("Registration failed: " + (err.response?.data?.message || "Unknown error"));
        });
    };

    return (
        <div className="min-h-screen w-full" style={{ background: "#181818" }}>

            {/* Top bar */}
            <div className="flex items-center justify-between px-10 py-4">
                <div className="flex items-center gap-2">
                    <img src="/logoUTC.png" alt="UTC Logo" className="w-8 h-8" />
                    <span className="text-3xl font-black text-yellow-400">U-Ticket</span>
                </div>
                <Link to="/" className="text-sm font-bold text-black bg-yellow-400/80 px-3 py-1 rounded-lg hover:bg-yellow-400 hover:text-black transition">
                    Home
                </Link>
            </div>

            {/* Register component */}
            <div className="flex justify-center items-center pt-8 pb-16">
                <div className="shadow-lg rounded-xl overflow-hidden" style={{ width: "48rem", minHeight: "32rem", background: "#ffffff", outline: "3px solid #8B5CF6" }}>
                    <div className="flex">
                        {/* Register form */}
                        <div className="flex flex-wrap content-center justify-center rounded-l-md bg-white" style={{ width: "24rem", height: "32rem" }}>
                            <div className="w-72">
                                <h1 className="text-xl font-semibold">Create account</h1>
                                <small className="text-gray-400">Join us today! Please enter your details</small>

                                <form className="mt-4" onSubmit={(e) => { e.preventDefault(); register(); }}>
                                    <div className="mb-3">
                                        <label className="mb-2 block text-xs font-semibold">Email</label>
                                        <input
                                            type="email"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="block w-full rounded-md border border-gray-300 focus:border-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-700 py-1 px-1.5 text-gray-500"
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="mb-2 block text-xs font-semibold">Password</label>
                                        <input
                                            type="password"
                                            placeholder="*****"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className="block w-full rounded-md border border-gray-300 focus:border-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-700 py-1 px-1.5 text-gray-500"
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="mb-2 block text-xs font-semibold">Confirm Password</label>
                                        <input
                                            type="password"
                                            placeholder="*****"
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            className="block w-full rounded-md border border-gray-300 focus:border-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-700 py-1 px-1.5 text-gray-500"
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <button
                                            type="submit"
                                            className="mb-1.5 block w-full text-center text-white bg-purple-700 hover:bg-purple-900 px-2 py-1.5 rounded-md"
                                        >
                                            Sign up
                                        </button>
                                        <button
                                            type="button"
                                            className="flex flex-wrap justify-center w-full border border-gray-300 hover:border-gray-500 px-2 py-1.5 rounded-md"
                                        >
                                            <img className="w-5 mr-2" src="https://lh3.googleusercontent.com/COxitqgJr1sJnIDe8-jiKhxDx1FrYbtRHKJ9z_hELisAlapwE9LUPh6fcXIfb5vwpbMl4xl9H9TRFPc5NOO8Sb3VSgIBrfRYvW6cUA" alt="Google" />
                                            Sign up with Google
                                        </button>
                                    </div>
                                </form>

                                <div className="text-center">
                                    <span className="text-xs text-gray-400 font-semibold">Already have account?</span>
                                    <Link to="/auth/login" className="text-xs font-semibold text-purple-700 ml-1">Sign in</Link>
                                </div>
                            </div>
                        </div>

                        {/* Register banner */}
                        <div className="flex flex-wrap content-center justify-center rounded-r-md overflow-hidden" style={{ width: "24rem", height: "32rem" }}>
                            <img
                                className="w-full h-full object-cover"
                                src="https://i.imgur.com/CKRSzBQ.jpg"
                                alt="Register banner"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}