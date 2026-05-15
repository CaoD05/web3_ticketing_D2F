import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

export default function Register() {
    const navigate = useNavigate();
    const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const [fullName, setFullName] = useState("");
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

    const register = async () => {
        if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
            setError("Vui lòng nhập đầy đủ thông tin.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp.");
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
        <div className="min-h-screen w-full bg-[#111111] text-white">
            <div className="flex items-center justify-between px-10 py-4">
                <div className="flex items-center gap-2">
                    <img src="/logoUTC.png" alt="UTC Logo" className="w-8 h-8" />
                    <span className="text-3xl font-black text-yellow-400">U-Ticket</span>
                </div>
                <Link to="/" className="rounded-lg bg-yellow-400/90 px-3 py-1 text-sm font-bold text-black transition hover:bg-yellow-300">
                    Home
                </Link>
            </div>

            <div className="flex items-center justify-center px-4 pb-16 pt-8">
                <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl shadow-black/40 md:grid-cols-2">
                    <div className="flex flex-col justify-center bg-[#151515] p-8 md:p-12">
                        <div className="mb-8 space-y-3">
                            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-yellow-400">Create account</p>
                            <h1 className="text-3xl font-black text-white md:text-4xl">Join the ticketing network</h1>
                            <p className="max-w-md text-sm leading-6 text-white/70">
                                Register with a normal email and password, or continue with Google. We’ll ask for MetaMask after you sign in.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Full Name</label>
                                <input
                                    type="text"
                                    placeholder="Your full name"
                                    value={fullName}
                                    onChange={(event) => setFullName(event.target.value)}
                                    className="block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
                                    autoComplete="name"
                                />
                            </div>

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
                                    placeholder="Create a password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    className="block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
                                    autoComplete="new-password"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Confirm Password</label>
                                <input
                                    type="password"
                                    placeholder="Repeat the password"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    className="block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
                                    autoComplete="new-password"
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
                            ) : null}

                            <button
                                type="button"
                                onClick={register}
                                disabled={loading}
                                className="w-full rounded-2xl bg-yellow-400 px-4 py-3 font-bold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {loading ? "Creating account..." : "Sign up"}
                            </button>

                            <div className="pt-2">
                                <GoogleAuthButton
                                    onCredential={handleGoogleCredential}
                                    label="Sign up with Google"
                                    clientId={googleClientId}
                                />
                            </div>
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
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-8">
                            <p className="text-sm uppercase tracking-[0.3em] text-yellow-300/80">Trusted onboarding</p>
                            <p className="mt-2 max-w-sm text-2xl font-black text-white">
                                Normal account first, wallet connection after sign-in.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}