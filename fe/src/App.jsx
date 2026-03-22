import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CustomerHome from "./pages/CustomerHome";
import AdminDashboard from "./pages/Admin";
import "@mdi/font/css/materialdesignicons.min.css";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />

        <Route path="/customer-home" element={<CustomerHome />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
