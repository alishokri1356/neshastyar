import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 px-6 safe-top pb-safe">
      <div className="text-center">
        <h1 className="mb-2 text-6xl font-extrabold text-primary">۴۰۴</h1>
        <p className="mb-6 text-lg text-muted-foreground">اوه! صفحه پیدا نشد</p>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
        >
          بازگشت به خانه
        </a>
      </div>
    </div>
  );
};

export default NotFound;
