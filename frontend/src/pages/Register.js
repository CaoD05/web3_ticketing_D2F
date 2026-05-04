import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

export default function Register() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { login: authLogin } = useAuth();
    const navigate = useNavigate();
    const googleBtnRef = useRef(null);

    const handleGoogleResponse = useCallback(async (response) => {
        try {
            setIsLoading(true);
            const res = await axios.post("http://localhost:5000/api/auth/google", {
                idToken: response.credential,
            });

            if (res.data.ok && res.data.token && res.data.user) {
                authLogin(res.data.token, res.data.user);
                alert(res.data.isNewUser
                    ? "Đăng ký bằng Google thành công! Chào mừng bạn."
                    : "Tài khoản đã tồn tại. Đăng nhập thành công!"
                );
                navigate("/");
            } else {
                alert("Đăng ký Google không thành công");
            }
        } catch (err) {
            alert("Đăng ký Google thất bại: " + (err.response?.data?.message || err.message));
        } finally {
            setIsLoading(false);
        }
    }, [authLogin, navigate]);

    useEffect(() => {
        const initGoogle = () => {
            if (window.google && window.google.accounts && GOOGLE_CLIENT_ID) {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleResponse,
                });

                if (googleBtnRef.current) {
                    window.google.accounts.id.renderButton(
                        googleBtnRef.current,
                        {
                            theme: "outline",
                            size: "large",
                            width: "288",
                            text: "signup_with",
                            shape: "rectangular",
                        }
                    );
                }
            }
        };

        if (window.google && window.google.accounts) {
            initGoogle();
        } else {
            const interval = setInterval(() => {
                if (window.google && window.google.accounts) {
                    clearInterval(interval);
                    initGoogle();
                }
            }, 200);
            return () => clearInterval(interval);
        }
    }, [handleGoogleResponse]);

    const register = () => {
        if (password !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }

        setIsLoading(true);
        axios.post("http://localhost:5000/api/auth/register", {
            Email: email, Password: password
        }).then(() => {
            alert("Registration successful! Please login.");
            window.location.href = "/auth/login";
        }).catch(err => {
            alert("Registration failed: " + (err.response?.data?.message || "Unknown error"));
        }).finally(() => {
            setIsLoading(false);
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
                                            disabled={isLoading}
                                            className="mb-1.5 block w-full text-center text-white bg-purple-700 hover:bg-purple-900 disabled:bg-gray-400 px-2 py-1.5 rounded-md"
                                        >
                                            {isLoading ? 'Đang xử lý...' : 'Sign up'}
                                        </button>

                                        {/* Google Sign-Up Button */}
                                        <div ref={googleBtnRef} className="flex justify-center w-full"></div>
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