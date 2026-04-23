import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { setAuthSession } from "../lib/api";
import GoogleAuthButton from "../components/GoogleAuthButton";

export default function Register() {
    const navigate = useNavigate();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [remember, setRemember] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const register = async () => {
        if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
            setError("Vui lòng nhập đầy đủ thông tin.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await api.post("/auth/register", {
                FullName: fullName.trim(),
                Email: email.trim(),
                Password: password,
            });

            setAuthSession(response.data.token, response.data.user, remember);
            navigate("/");
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Đăng ký thất bại");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleCredential = async (credential) => {
        setLoading(true);
        setError("");

        try {
            const response = await api.post("/auth/google", { credential });
            setAuthSession(response.data.token, response.data.user, true);
            navigate("/");
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Đăng ký Google thất bại");
        } finally {
            setLoading(false);
        }
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

                            {error ? (
                                <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                                    {error}
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
                                <GoogleAuthButton onCredential={handleGoogleCredential} label="Sign up with Google" />
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