import HeroSection from './sections/HeroSection';
import HeroMobileSection from './sections/HeroMobileSection';

export default function Home() {
  return (
    <div>
      {/* Desktop Hero - ukryty na mobile */}
      <div className="hidden lg:block">
        <HeroSection />
      </div>

      {/* Mobile Hero - ukryty na desktop */}
      <div className="block lg:hidden">
        <HeroMobileSection />
      </div>
    </div>
  );
}