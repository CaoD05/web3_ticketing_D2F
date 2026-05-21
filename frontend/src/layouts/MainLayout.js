import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import WalletConnectPrompt from "../components/WalletConnectPrompt";

export default function MainLayout() {
    return (
        <>
            <Navbar />
            <WalletConnectPrompt />
            <main className="min-h-screen">
                <Outlet />
            </main>
            <Footer />
        </>
    );
}