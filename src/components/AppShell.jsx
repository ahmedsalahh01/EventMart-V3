import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

function AppShell({ children }) {
  const location = useLocation();
  const isCartRoute = location.pathname === "/cart";

  if (isCartRoute) {
    return <div className="app-shell">{children}</div>;
  }

  return (
    <div className="app-shell">
      <Navbar />
      <div className="app-body">{children}</div>
      <Footer />
    </div>
  );
}

export default AppShell;
