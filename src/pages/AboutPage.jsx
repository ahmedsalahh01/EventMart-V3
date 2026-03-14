import { motion } from "framer-motion";
import { useEffect } from "react";
import "./../styles/about.css";

function AboutPage() {
  useEffect(() => {
    document.documentElement.classList.add("about-snap-page");
    document.body.classList.add("about-snap-page");

    return () => {
      document.documentElement.classList.remove("about-snap-page");
      document.body.classList.remove("about-snap-page");
    };
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <main className="about-page" data-theme-scope="about">
        <h1 className="sr-only">About EventMart</h1>

      <section className="about-band about-what flow-right no-visual" aria-labelledby="what-title">
        <div className="band-inner">
          <div className="band-copy">
            <p className="band-label">WHAT</p>
            <h2 id="what-title">What</h2>
            <p>
              EventMart is an online destination for discovering, buying, and renting event equipment in one place. It
              helps customers explore essentials for different event needs, from sound and lighting to staging and
              accessories.
            </p>
          </div>
        </div>
      </section>

      <section className="about-band about-why flow-left band-right no-visual" aria-labelledby="why-title">
        <div className="band-inner">
          <div className="band-copy">
            <p className="band-label">WHY</p>
            <h2 id="why-title">Why</h2>
            <p>
              Planning an event can be overwhelming when equipment is scattered across different places. EventMart
              exists to simplify the process by making event essentials easier to find, compare, and choose.
            </p>
          </div>
        </div>
      </section>

      <section className="about-band about-how flow-right no-visual" aria-labelledby="how-title">
        <div className="band-inner">
          <div className="band-copy">
            <p className="band-label">HOW</p>
            <h2 id="how-title">How</h2>
            <p>
              EventMart helps users by combining organized product categories, recommendations, and guided shopping
              experiences. Customers can browse equipment, discover deals, and build packages based on their needs.
            </p>
          </div>
        </div>
      </section>

      <section className="about-band about-who band-right no-visual" aria-labelledby="who-title">
        <div className="band-inner">
          <div className="band-copy">
            <p className="band-label">WHO</p>
            <h2 id="who-title">Who</h2>
            <p>
              EventMart is built for people planning events of all sizes, including private parties, weddings, business
              gatherings, and celebrations. It is for anyone who wants event planning to feel simpler and more
              accessible.
            </p>
            <div className="who-roles" aria-label="Core team roles">
              <article className="who-role">
                <h3>Ahmed Salah</h3>
                <p>CEO &amp; Founder</p>
              </article>
              <article className="who-role">
                <h3>Adham Hegab</h3>
                <p>COO &amp; Co-Founder</p>
              </article>
              <article className="who-role">
                <h3>Ahmed Abdo</h3>
                <p>Operations Manager</p>
              </article>
            </div>
          </div>
        </div>
        </section>
      </main>
    </motion.div>
  );
}

export default AboutPage;
