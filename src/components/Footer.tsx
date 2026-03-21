import { Link } from "react-router-dom";

const Footer = () => {
  const links = [
    { to: "/explore", label: "Explore" },
    { to: "/library", label: "Library" },
    { to: "/publish", label: "Publish" },
  ];

  return (
    <footer className="border-t border-border py-12">
      <div className="container-main">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <Link to="/" className="text-xl font-serif">
            Wistaar
          </Link>

          <nav className="flex items-center gap-6">
            {links.map((link) => (
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
      </div>
    </footer>
  );
};

export default Footer;