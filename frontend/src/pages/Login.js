import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { login: authLogin } = useAuth();
    const googleBtnRef = useRef(null);

    const handleGoogleResponse = useCallback(async (response) => {
        try {
            setIsLoading(true);
            const res = await api.post("/auth/google", {
                credential: response.credential,
            });

            if (res.data.ok && res.data.token && res.data.user) {
                authLogin(res.data.token, res.data.user, remember);
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
    }, [authLogin, navigate, remember]);

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
            const res = await api.post("/auth/login", {
                email, password
            });
            
            if (res.data.ok && res.data.token && res.data.user) {
                authLogin(res.data.token, res.data.user, remember);
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
        <div className="min-h-screen w-full bg-[#111111] text-white">
            <div className="flex items-center justify-between px-10 py-4">
                <Link to="/" className="flex items-center gap-2 group">
                    <img src="/logoUTC.png" alt="UTC Logo" className="w-8 h-8 group-hover:scale-110 transition" />
                    <span className="text-3xl font-black text-yellow-400">U-Ticket</span>
                </Link>
            </div>

            <div className="flex items-center justify-center px-4 pb-16 pt-8">
                <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl shadow-black/40 md:grid-cols-2">
                    <div className="flex flex-col justify-center bg-[#151515] p-8 md:p-12">
                        <div className="mb-8 space-y-3">
                            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-yellow-400">Welcome back</p>
                            <h1 className="text-3xl font-black text-white md:text-4xl">Sign in to your account</h1>
                            <p className="max-w-md text-sm leading-6 text-white/70">
                                Use your email and password, or continue with Google. After sign-in we’ll ask you to connect MetaMask.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Email</label>
                                <input
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    className="block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
                                    autoComplete="email"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Password</label>
                                <input
                                    type="password"
                                    placeholder="Your password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    className="block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
                                    autoComplete="current-password"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <label className="flex items-center gap-2 text-sm text-white/75">
                                    <input
                                        type="checkbox"
                                        checked={remember}
                                        onChange={(event) => setRemember(event.target.checked)}
                                        className="h-4 w-4 rounded border-white/30 bg-transparent text-yellow-400 focus:ring-yellow-400"
                                    />
                                    Remember me for 30 days
                                </label>
                            </div>

                            <div className="mb-3">
                                <button
                                    type="submit"
                                    onClick={login}
                                    disabled={isLoading}
                                    className="mb-1.5 block w-full text-center text-white bg-purple-700 hover:bg-purple-900 disabled:bg-gray-400 px-2 py-1.5 rounded-md"
                                >
                                    {isLoading ? 'Đang đăng nhập...' : 'Sign in'}
                                </button>

                                {/* Google Sign-In Button */}
                                <div ref={googleBtnRef} className="flex justify-center w-full"></div>
                            </div>
                        </div>

                        <div className="mt-8 text-sm text-white/70">
                            Don’t have an account?{" "}
                            <Link to="/auth/register" className="font-semibold text-yellow-400 hover:text-yellow-300">
                                Sign up
                            </Link>
                        </div>
                    </div>

                    <div className="relative min-h-[22rem] overflow-hidden bg-[#0f0f0f] md:min-h-full">
                        <img
                            className="h-full w-full object-cover opacity-90"
                            src="https://i.imgur.com/y00srqP.jpg"
                            alt="Login banner"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-8">
                            <p className="text-sm uppercase tracking-[0.3em] text-yellow-300/80">Secure entry</p>
                            <p className="mt-2 max-w-sm text-2xl font-black text-white">
                                Start with a normal login, then link your wallet once you are inside.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}