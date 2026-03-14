import { motion } from "framer-motion";
import { useState } from "react";
import "./../styles/contact.css";

function ContactPage() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    subject: "",
    message: ""
  });
  const [status, setStatus] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setStatus("Message captured in the frontend. Contact backend wiring is still pending.");
    setForm({
      fullName: "",
      email: "",
      subject: "",
      message: ""
    });
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <main className="contact-page" data-theme-scope="contact">
        <section className="contact-intro">
          <h1>Tell us what you need for your event.</h1>
          <p>
            Whether you want to rent equipment, request a custom package, or ask about product availability, our team
            will get back to you as soon as possible.
          </p>
        </section>

      <section className="contact-grid" aria-label="Contact details and form">
        <article className="contact-card details-card">
          <h2>Reach us directly</h2>
          <ul className="details-list">
            <li>
              <p className="label">Email</p>
              <a href="mailto:srmido2@hotmail.com">support@eventmart.com</a>
            </li>
            <li>
              <p className="label">Phone</p>
              <a href="tel:+201286999939">+20 128 699 9939</a>
            </li>
            <li>
              <p className="label">Office Hours</p>
              <p>Sunday to Thursday, 9:00 AM - 6:00 PM</p>
            </li>
            <li>
              <p className="label">Address</p>
              <p>New Cairo, Cairo, Egypt</p>
            </li>
          </ul>
        </article>

        <article className="contact-card form-card">
          <h2>Send us a message</h2>
          <form id="contactForm" className="contact-form" onSubmit={handleSubmit}>
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Your name"
              required
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
            />

            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />

            <label htmlFor="subject">Subject</label>
            <input
              id="subject"
              name="subject"
              type="text"
              placeholder="How can we help?"
              required
              value={form.subject}
              onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
            />

            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              name="message"
              rows="6"
              placeholder="Tell us what you need..."
              required
              value={form.message}
              onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
            />

            <button className="submit-btn" type="submit">
              Send Message
            </button>
            <p id="formStatus" className="form-status" aria-live="polite">
              {status}
            </p>
          </form>
        </article>
        </section>
      </main>
    </motion.div>
  );
}

export default ContactPage;
