import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./../styles/auth.css";

function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register } = useAuth();
  const [status, setStatus] = useState("");
  const [signInForm, setSignInForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "" });

  async function handleSignIn(event) {
    event.preventDefault();
    setStatus("Signing in...");

    try {
      const payload = await login(signInForm);
      setStatus(`Welcome back, ${payload.user.name}! Redirecting...`);
      const returnTo = searchParams.get("returnTo");
      const nextRoute = returnTo === "Profile.html" ? "/profile" : "/";
      window.setTimeout(() => navigate(nextRoute), 800);
    } catch (error) {
      setStatus(error.message || "Sign in failed.");
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setStatus("Creating your account...");

    try {
      const payload = await register(registerForm);
      setStatus("Account created successfully. You can now log in from the left section.");
      setRegisterForm({ name: "", email: "", password: "" });
      setSignInForm((current) => ({ ...current, email: payload.user.email || "", password: "" }));
    } catch (error) {
      setStatus(error.message || "Registration failed.");
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <main className="auth-shell" data-theme-scope="auth">
        <section className="dashboard-banner">
          <h1>Access Your Dashboard</h1>
          <p>Sign in to continue shopping, track orders, and manage your profile in one place.</p>
        </section>

        <section className="login-header">
          <h1>Account Access</h1>
          <p>Log in or create your EventMart account</p>
        </section>

        <section className="auth-card auth-dual">
        <section className="login-box">
          <h2>Log In</h2>
          <form className="login-form sign-in-form" onSubmit={handleSignIn}>
            <label className="field" htmlFor="signInEmail">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2.6" stroke="currentColor" strokeWidth="1.8" />
                <path d="m4.5 7 6.5 5a1.7 1.7 0 0 0 2 0l6.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input id="signInEmail" name="email" type="email" placeholder="Email" required value={signInForm.email} onChange={(event) => setSignInForm((current) => ({ ...current, email: event.target.value }))} />
            </label>

            <label className="field" htmlFor="signInPassword">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="4.5" y="10.5" width="15" height="9" rx="2.4" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8 10.5V8a4 4 0 1 1 8 0v2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input id="signInPassword" name="password" type="password" placeholder="Password" required value={signInForm.password} onChange={(event) => setSignInForm((current) => ({ ...current, password: event.target.value }))} />
            </label>

            <button type="submit" className="sign-btn">
              Sign In
              <span aria-hidden="true">&rarr;</span>
            </button>
          </form>
        </section>

        <section className="register-box">
          <h2>Create Account</h2>
          <form className="login-form register-form" onSubmit={handleRegister}>
            <label className="field" htmlFor="registerName">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M5 20c.9-3.2 3.72-5 7-5s6.1 1.8 7 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input id="registerName" name="name" type="text" placeholder="Full Name" required value={registerForm.name} onChange={(event) => setRegisterForm((current) => ({ ...current, name: event.target.value }))} />
            </label>

            <label className="field" htmlFor="registerEmail">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2.6" stroke="currentColor" strokeWidth="1.8" />
                <path d="m4.5 7 6.5 5a1.7 1.7 0 0 0 2 0l6.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input id="registerEmail" name="email" type="email" placeholder="Email" required value={registerForm.email} onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))} />
            </label>

            <label className="field" htmlFor="registerPassword">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="4.5" y="10.5" width="15" height="9" rx="2.4" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8 10.5V8a4 4 0 1 1 8 0v2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input id="registerPassword" name="password" type="password" placeholder="Password" required value={registerForm.password} onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))} />
            </label>

            <button type="submit" className="sign-btn">
              Create Account
              <span aria-hidden="true">&rarr;</span>
            </button>
          </form>
        </section>
        </section>

        <p className={`auth-status ${status.includes("successfully") || status.includes("Welcome back") ? "status-success" : status && !status.includes("...") ? "status-error" : ""}`} aria-live="polite">
          {status}
        </p>
      </main>
    </motion.div>
  );
}

export default AuthPage;
