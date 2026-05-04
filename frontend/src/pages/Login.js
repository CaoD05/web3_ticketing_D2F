import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(false);
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
                    : "Đăng nhập bằng Google thành công!"
                );
                navigate("/");
            } else {
                alert("Đăng nhập Google không thành công");
            }
        } catch (err) {
            alert("Đăng nhập Google thất bại: " + (err.response?.data?.message || err.message));
        } finally {
            setIsLoading(false);
        }
    }, [authLogin, navigate]);

    useEffect(() => {
        // Đợi Google Identity Services SDK load xong
        const initGoogle = () => {
            if (window.google && window.google.accounts && GOOGLE_CLIENT_ID) {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleResponse,
                });

                // Render nút Google chính thức vào div
                if (googleBtnRef.current) {
                    window.google.accounts.id.renderButton(
                        googleBtnRef.current,
                        {
                            theme: "outline",
                            size: "large",
                            width: "288",
                            text: "signin_with",
                            shape: "rectangular",
                        }
                    );
                }
            }
        };

        // Nếu SDK đã load → init ngay, nếu chưa → đợi
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

    const login = async () => {
        try {
            setIsLoading(true);
            const res = await axios.post("http://localhost:5000/api/auth/login", {
                email, password
            });
            
            if (res.data.ok && res.data.token && res.data.user) {
                authLogin(res.data.token, res.data.user);
                alert("Đăng nhập thành công!");
                navigate("/");
            } else {
                alert("Đăng nhập không thành công");
            }
        } catch (err) {
            alert("Đăng nhập thất bại: " + (err.response?.data?.message || err.message));
        } finally {
            setIsLoading(false);
        }
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
                                    disabled={isLoading}
                                    className="mb-1.5 block w-full text-center text-white bg-purple-700 hover:bg-purple-900 disabled:bg-gray-400 px-2 py-1.5 rounded-md"
                                >
                                    {isLoading ? 'Đang đăng nhập...' : 'Sign in'}
                                </button>

                                {/* Google Sign-In Button */}
                                <div ref={googleBtnRef} className="flex justify-center w-full"></div>
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