import { Link } from "react-router-dom";

const Footer = () => {
  const navLinks = [
    { to: "/explore", label: "Explore" },
    { to: "/library", label: "Library" },
    { to: "/publish", label: "Publish" },
  ];

  const legalLinks = [
    { to: "/terms", label: "Terms of Service" },
    { to: "/privacy", label: "Privacy Policy" },
    { to: "/copyright", label: "Copyright & DMCA" },
  ];

  return (
    <footer className="border-t border-border pt-12 pb-8">
      <div className="container-main">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
          <Link to="/" className="text-xl font-serif">
            Wistaar
          </Link>

          <nav className="flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Wistaar
          </p>
        </div>

        {/* Legal links row */}
        <div className="border-t border-border pt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {legalLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <span className="text-xs text-muted-foreground/40">·</span>
          <a
            href="mailto:support@wistaar.com"
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            support@wistaar.com
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;