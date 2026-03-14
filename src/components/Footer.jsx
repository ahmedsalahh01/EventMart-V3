import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <section className="footer-brand-wrap" aria-label="EventMart company details">
          <Link to="/" className="footer-brand" aria-label="EventMart Home">
            <img className="footer-brand-image" src="/assets/eventmart-footer-logo.png" alt="" />
            <span className="footer-brand-wordmark" aria-hidden="true">
              Event<span className="footer-brand-accent">Mart</span>
            </span>
          </Link>
          <p className="footer-copy">
            Your one-stop marketplace for buying and renting premium event equipment. Create unforgettable experiences.
          </p>
          <ul className="footer-contact">
            <li>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 6.75A2.75 2.75 0 0 1 5.75 4h12.5A2.75 2.75 0 0 1 21 6.75v10.5A2.75 2.75 0 0 1 18.25 20H5.75A2.75 2.75 0 0 1 3 17.25V6.75Z" stroke="currentColor" strokeWidth="1.8" />
                <path d="m4.5 7.5 6.58 5.27a1.5 1.5 0 0 0 1.84 0L19.5 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <a href="mailto:hello@eventmart.com">hello@eventmart.com</a>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6.4 3.6a1.6 1.6 0 0 1 1.7-.37l2.3.9c.64.25 1 .94.86 1.61l-.5 2.3a1.6 1.6 0 0 1-.89 1.09l-1.1.49a12.6 12.6 0 0 0 5.63 5.63l.49-1.1a1.6 1.6 0 0 1 1.09-.89l2.3-.5c.67-.14 1.36.22 1.61.86l.9 2.3a1.6 1.6 0 0 1-.37 1.7l-1.17 1.17a2.4 2.4 0 0 1-2.31.63C10.94 18.95 5.05 13.06 3.82 7.08a2.4 2.4 0 0 1 .63-2.31L5.62 3.6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
              <a href="tel:+15551234567">+1 (555) 123-4567</a>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 21s7-5.86 7-11a7 7 0 1 0-14 0c0 5.14 7 11 7 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              <span>San Francisco, CA</span>
            </li>
          </ul>
        </section>

        <section aria-label="Shop links">
          <h3 className="footer-heading">Shop</h3>
          <ul className="footer-links">
            <li><Link to="/shop">All Products</Link></li>
            <li><Link to="/shop?category=Merchandise">Merchandise</Link></li>
            <li><Link to="/shop?category=Sound%20Systems">Sound Systems</Link></li>
            <li><Link to="/shop?category=Stages">Stages</Link></li>
            <li><Link to="/shop?category=Woodworks">Woodworks</Link></li>
          </ul>
        </section>

        <section aria-label="Company links">
          <h3 className="footer-heading">Company</h3>
          <ul className="footer-links">
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/ai-planner">AI Planner</Link></li>
          </ul>
        </section>

        <section aria-label="Support links">
          <h3 className="footer-heading">Support</h3>
          <ul className="footer-links">
            <li><Link to="/contact">FAQ</Link></li>
            <li><Link to="/contact">Rental Policy</Link></li>
            <li><Link to="/contact">Shipping Info</Link></li>
          </ul>
        </section>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2026 EventMart. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
