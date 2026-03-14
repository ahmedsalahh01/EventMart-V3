import { motion } from "framer-motion";

function NotFoundPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <main className="placeholder-page" data-theme-scope="not-found">
        <section className="placeholder-card">
          <p className="placeholder-kicker">404</p>
          <h1>Page not found</h1>
          <p className="placeholder-text">The route you requested is not available in the restored frontend.</p>
        </section>
      </main>
    </motion.div>
  );
}

export default NotFoundPage;
