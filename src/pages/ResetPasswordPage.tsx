import { Navigate } from "react-router-dom";

// Reset password sekarang menggunakan OTP 6 digit di halaman /auth (Lupa Password).
// Halaman ini hanya redirect untuk kompatibilitas link lama.
const ResetPasswordPage = () => {
  return <Navigate to="/auth" replace />;
};

export default ResetPasswordPage;
