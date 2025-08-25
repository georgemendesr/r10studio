import { Button } from "@/components/ui/button";
import { VideoIcon, HomeIcon, PlusIcon } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { LogOut } from "lucide-react";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo oficial (apenas páginas internas - não aparece na página inicial) */}
        {location.pathname !== "/video-slide" && (
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <img
              src="/logor10studiob.png"
              alt="R10 STUDIO"
              className="h-10 md:h-12 w-auto object-contain"
              loading="eager"
              decoding="sync"
            />
          </Link>
        )}

        {/* Navegação - ajusta posição se não há logo */}
  <nav className={`flex items-center gap-2 ${location.pathname === "/video-slide" ? "ml-auto" : ""}`}>
          <Button
            variant={location.pathname === "/" ? "default" : "ghost"}
            size="sm"
            asChild
          >
            <Link to="/">
              <HomeIcon className="w-4 h-4" />
              Início
            </Link>
          </Button>
          
          <Button
            variant={location.pathname === "/videos" ? "default" : "ghost"}
            size="sm"
            asChild
          >
            <Link to="/videos">
              <VideoIcon className="w-4 h-4" />
              Meus Vídeos
            </Link>
          </Button>
          
          <Button variant={location.pathname === "/video-slide" ? "accent" : "default"} size="sm" asChild>
            <Link to="/video-slide">
              <PlusIcon className="w-4 h-4" />
              Novo Vídeo
            </Link>
          </Button>

          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { logout(); navigate('/'); }}
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;