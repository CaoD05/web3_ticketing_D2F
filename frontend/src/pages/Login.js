import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(false);

    const login = () => {
        axios.post("https://localhost:5001/api/auth/login", {
            email, password
        }).then(res => {
            localStorage.setItem("token", res.data.token);
            alert("Login success");
            // Redirect to home after successful login
            window.location.href = "/";
        }).catch(err => {
            alert("Login failed: " + (err.response?.data?.message || "Unknown error"));
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

            {/* Login component */}
            <div className="flex justify-center items-center pt-8 pb-16">
                <div className="shadow-lg rounded-xl overflow-hidden" style={{ width: "48rem", minHeight: "32rem", background: "#ffffff", outline: "3px solid #8B5CF6" }}>
                    <div className="flex">
                {/* Login form */}
                <div className="flex flex-wrap content-center justify-center rounded-l-md bg-white" style={{width: "24rem", height: "32rem"}}>
                    <div className="w-72">

                        {/* Heading */}
                        <h1 className="text-xl font-semibold">Welcome back</h1>
                        <small className="text-gray-400">Welcome back! Please enter your details</small>

                        {/* Form */}
                        <form className="mt-4" onSubmit={(e) => { e.preventDefault(); login(); }}>
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

                            <div className="mb-3 flex flex-wrap content-center">
                                <input
                                    id="remember"
                                    type="checkbox"
                                    checked={remember}
                                    onChange={e => setRemember(e.target.checked)}
                                    className="mr-1 checked:bg-purple-700"
                                />
                                <label htmlFor="remember" className="mr-auto text-xs font-semibold">Remember for 30 days</label>
                                <button
                                    type="button"
                                    onClick={() => alert('Water your reset password action here')}
                                    className="text-xs font-semibold text-purple-700 hover:text-purple-900"
                                >
                                    Forgot password?
                                </button>
                            </div>

                            <div className="mb-3">
                                <button
                                    type="submit"
                                    className="mb-1.5 block w-full text-center text-white bg-purple-700 hover:bg-purple-900 px-2 py-1.5 rounded-md"
                                >
                                    Sign in
                                </button>
                                <button
                                    type="button"
                                    className="flex flex-wrap justify-center w-full border border-gray-300 hover:border-gray-500 px-2 py-1.5 rounded-md"
                                >
                                    <img className="w-5 mr-2" src="https://lh3.googleusercontent.com/COxitqgJr1sJnIDe8-jiKhxDx1FrYbtRHKJ9z_hELisAlapwE9LUPh6fcXIfb5vwpbMl4xl9H9TRFPc5NOO8Sb3VSgIBrfRYvW6cUA" alt="Google" />
                                    Sign in with Google
                                </button>
                            </div>
                        </form>

                        {/* Footer */}
                        <div className="text-center">
                            <span className="text-xs text-gray-400 font-semibold">Don't have account?</span>
                            <Link to="/auth/register" className="text-xs font-semibold text-purple-700 ml-1">Sign up</Link>
                        </div>
                    </div>
                </div>

                {/* Login banner */}
                <div className="flex flex-wrap content-center justify-center rounded-r-md" style={{width: "24rem", height: "32rem"}}>
                    <img
                        className="w-full h-full object-fill"
                        src="https://i.imgur.com/y00srqP.jpg"
                        alt="Login banner"
                    />
                </div>

            </div>
        </div>
        </div>
        </div>
    );
}