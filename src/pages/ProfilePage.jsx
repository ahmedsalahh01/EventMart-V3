import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { authRequest } from "../lib/api";
import "./../styles/profile.css";

function formatDateTime(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Invalid date";
  return date.toLocaleString();
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(amount);
}

function getFirstName(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)[0] || "User";
}

function getStatusProgress(status) {
  const map = {
    pending: 15,
    confirmed: 30,
    processing: 50,
    shipped: 75,
    delivered: 100,
    completed: 100,
    cancelled: 100
  };
  return map[String(status || "").toLowerCase()] ?? 20;
}

function ProfilePage() {
  const navigate = useNavigate();
  const { token, user, logout, updateSession } = useAuth();
  const [form, setForm] = useState({ fullName: "", email: "", currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!token || !user) {
      navigate("/auth?returnTo=Profile.html", { replace: true });
      return;
    }

    let cancelled = false;

    async function init() {
      try {
        const profilePayload = await authRequest("/api/me", token);
        if (cancelled) return;
        updateSession({ token, user: profilePayload.user });
        setForm((current) => ({
          ...current,
          fullName: profilePayload.user.name || "",
          email: profilePayload.user.email || ""
        }));

        const ordersPayload = await authRequest("/api/me/orders", token);
        if (!cancelled) setOrders(Array.isArray(ordersPayload) ? ordersPayload : []);
      } catch (error) {
        if (!cancelled) setStatus(error.message || "Failed to load profile.");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [navigate, token, updateSession, user]);

  const filteredOrders = useMemo(
    () => (statusFilter === "all" ? orders : orders.filter((order) => String(order.status || "").toLowerCase() === statusFilter)),
    [orders, statusFilter]
  );

  const summary = useMemo(() => {
    const total = orders.length;
    const active = orders.filter((order) => !["delivered", "completed", "cancelled"].includes(String(order.status || "").toLowerCase())).length;
    const spent = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    return { total, active, spent };
  }, [orders]);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("Updating profile...");

    try {
      if (form.newPassword || form.confirmNewPassword) {
        if (form.newPassword !== form.confirmNewPassword) {
          throw new Error("New password and confirmation do not match.");
        }
        if (!form.currentPassword) {
          throw new Error("Current password is required to set a new password.");
        }
      }

      const body = {
        name: form.fullName.trim(),
        email: form.email.trim().toLowerCase()
      };

      if (form.newPassword) {
        body.currentPassword = form.currentPassword;
        body.newPassword = form.newPassword;
      }

      const payload = await authRequest("/api/me", token, { method: "PUT", body });
      updateSession({ token: payload.token || token, user: payload.user });
      setForm((current) => ({ ...current, currentPassword: "", newPassword: "", confirmNewPassword: "" }));
      setStatus("Profile updated successfully.");
    } catch (error) {
      setStatus(error.message || "Failed to update profile.");
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <main className="profile-main" data-theme-scope="profile">
        <section className="profile-hero panel">
        <div>
          <p className="profile-kicker">My Account</p>
          <h1>Welcome {getFirstName(user?.name)}</h1>
          <p className="profile-note">Manage your details, monitor orders, and keep your account up to date.</p>
        </div>
        <div className="profile-stats">
          <article>
            <p>Total Orders</p>
            <strong>{summary.total}</strong>
          </article>
          <article>
            <p>Active Orders</p>
            <strong>{summary.active}</strong>
          </article>
          <article>
            <p>Total Spent</p>
            <strong>{formatMoney(summary.spent)}</strong>
          </article>
        </div>
      </section>

      <section className="profile-layout">
        <article className="panel">
          <h2>Personal Details</h2>
          <p className="muted-text">Update your profile information and password.</p>

          <form className="profile-form" onSubmit={handleSubmit}>
            <label htmlFor="fullName">Full Name</label>
            <input id="fullName" name="fullName" type="text" required value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />

            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />

            <div className="form-grid">
              <div>
                <label htmlFor="currentPassword">Current Password</label>
                <input id="currentPassword" name="currentPassword" type="password" placeholder="Only if changing password" value={form.currentPassword} onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))} />
              </div>
              <div>
                <label htmlFor="newPassword">New Password</label>
                <input id="newPassword" name="newPassword" type="password" placeholder="Min 6 characters" value={form.newPassword} onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))} />
              </div>
            </div>

            <label htmlFor="confirmNewPassword">Confirm New Password</label>
            <input id="confirmNewPassword" name="confirmNewPassword" type="password" value={form.confirmNewPassword} onChange={(event) => setForm((current) => ({ ...current, confirmNewPassword: event.target.value }))} />

            <button className="btn-primary-submit" type="submit">
              Save Changes
            </button>
            <p className={`status-text ${status.includes("successfully") ? "success" : status && !status.includes("...") ? "error" : ""}`} aria-live="polite">
              {status}
            </p>
          </form>
        </article>

        <article className="panel">
          <h2>Account Snapshot</h2>
          <div className="snapshot-list">
            <div>
              <span>Role</span>
              <strong>{user?.role || "customer"}</strong>
            </div>
            <div>
              <span>Joined</span>
              <strong>{formatDateTime(user?.created_at)}</strong>
            </div>
            <div>
              <span>Last Login</span>
              <strong>{formatDateTime(user?.last_login_at)}</strong>
            </div>
          </div>

          <div className="tools-box">
            <h3>Quick Actions</h3>
            <button className="btn-ghost" type="button" onClick={async () => setOrders(await authRequest("/api/me/orders", token))}>
              Refresh Orders
            </button>
            <button
              className="btn-danger"
              type="button"
              onClick={() => {
                logout();
                navigate("/auth?tab=signin");
              }}
            >
              Sign Out
            </button>
          </div>
        </article>
      </section>

        <section className="panel">
        <div className="orders-head">
          <div>
            <h2>Order Tracking</h2>
            <p className="muted-text">Track current status of your past and active orders.</p>
          </div>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="orders-list">
          {filteredOrders.length ? (
            filteredOrders.map((order) => {
              const normalizedStatus = String(order.status || "pending").toLowerCase();
              return (
                <article key={order.id} className="order-card">
                  <div className="order-head">
                    <span className="order-id">Order #{order.id}</span>
                    <span className={`status-pill status-${normalizedStatus}`}>{normalizedStatus}</span>
                  </div>
                  <div className="order-meta">
                    <span>Created: {formatDateTime(order.created_at)}</span>
                    <span>Items: {Number(order.total_items || 0)}</span>
                    <span>Total: {formatMoney(order.total)}</span>
                  </div>
                  <div className="order-progress">
                    <span style={{ width: `${getStatusProgress(normalizedStatus)}%` }}></span>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="orders-empty">No orders found for the selected filter.</div>
          )}
        </div>
        </section>
      </main>
    </motion.div>
  );
}

export default ProfilePage;
