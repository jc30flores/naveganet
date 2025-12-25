import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <h2 className="text-2xl font-semibold text-foreground">Página no encontrada</h2>
        <p className="text-muted-foreground mb-6">
          La página que buscas no existe o ha sido movida.
        </p>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <a href="/" className="flex items-center gap-2">
            Volver al Dashboard
          </a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
