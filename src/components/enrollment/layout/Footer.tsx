const CURRENT_YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="border-t border-border-strong mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="text-center text-xs sm:text-sm text-white/50">
          <p>&copy; {CURRENT_YEAR} SuperfastSAT. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
