import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Home from "./pages/Home";
import Events from "./pages/Events";
import Login from "./pages/Login";
import Register from "./pages/Register";
import EventDetail from "./pages/EventDetail";
import MyTickets from "./pages/MyTickets";
import Profile from "./pages/Profile";
import Contact from "./pages/Contact";
import Organizer from "./pages/Organizer";
import AdminDashboard from "./pages/AdminDashboard";
import AboutUs from "./pages/AboutUs";
import PaymentMethod from "./pages/PaymentMethod";
import TermsOfUse from "./pages/TermsOfUse";
import AdminLayout from "./layouts/AdminLayout";
import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth pages - no navbar/footer */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Admin Portal - Independent Layout */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="events" element={<AdminDashboard />} /> {/* For now, use the same component with tab logic or separate later */}
            <Route path="users" element={<AdminDashboard />} />
          </Route>

          {/* Main app pages - with navbar/footer */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="event/:id" element={<EventDetail />} />
            <Route path="events" element={<Events />} />
            <Route path="contact" element={<Contact />} />
            <Route path="my-tickets" element={<MyTickets />} />
            <Route path="profile" element={<Profile />} />
            <Route path="organizer" element={<Organizer />} />
            <Route path="about" element={<AboutUs />} />
            <Route path="payment-method" element={<PaymentMethod />} />
            <Route path="terms" element={<TermsOfUse />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;