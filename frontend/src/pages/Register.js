import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

export default function Register() {
    const navigate = useNavigate();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
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
                authLogin(res.data.token, res.data.user);
                alert(res.data.isNewUser
                    ? "Dang ky bang Google thanh cong! Chao mung ban."
                    : "Tai khoan da ton tai. Dang nhap thanh cong!"
                );
                navigate("/");
            } else {
                alert("Dang ky Google khong thanh cong");
            }
        } catch (err) {
            alert("Dang ky Google that bai: " + (err.response?.data?.message || err.message));
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

    const register = async () => {
        if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
            alert("Vui long nhap day du thong tin.");
            return;
        }

        if (password !== confirmPassword) {
            alert("Mat khau xac nhan khong khop.");
            return;
        }

        try {
            setIsLoading(true);
            const res = await api.post("/auth/register", {
                FullName: fullName,
                Email: email,
                Password: password,
            });

            if (res.data.ok && res.data.token && res.data.user) {
                authLogin(res.data.token, res.data.user);
                alert("Dang ky thanh cong!");
                navigate("/");
            } else {
                alert("Dang ky khong thanh cong");
            }
        } catch (err) {
            alert("Dang ky that bai: " + (err.response?.data?.message || err.message));
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
                            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-yellow-400">Create account</p>
                            <h1 className="text-3xl font-black text-white md:text-4xl">Join the ticketing network</h1>
                        </div>

                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Your full name"
                                value={fullName}
                                onChange={(event) => setFullName(event.target.value)}
                                className="block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
                            />
                            <input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                className="block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
                            />
                            <input
                                type="password"
                                placeholder="Create a password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
                            />
                            <input
                                type="password"
                                placeholder="Repeat the password"
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                className="block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
                            />

                            <button
                                type="button"
                                onClick={register}
                                disabled={isLoading}
                                className="mb-1.5 block w-full rounded-md bg-yellow-400 px-2 py-2 text-center font-bold text-black hover:bg-yellow-300 disabled:bg-gray-400"
                            >
                                {isLoading ? "Dang xu ly..." : "Sign up"}
                            </button>

                            <div ref={googleBtnRef} className="flex justify-center w-full"></div>
                        </div>

                        <div className="mt-8 text-sm text-white/70">
                            Already have an account?{" "}
                            <Link to="/auth/login" className="font-semibold text-yellow-400 hover:text-yellow-300">
                                Sign in
                            </Link>
                        </div>
                    </div>

                    <div className="relative min-h-[22rem] overflow-hidden bg-[#0f0f0f] md:min-h-full">
                        <img
                            className="h-full w-full object-cover opacity-90"
                            src="https://i.imgur.com/CKRSzBQ.jpg"
                            alt="Register banner"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}