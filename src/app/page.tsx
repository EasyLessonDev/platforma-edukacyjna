"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="text-center px-8 pt-24 pb-16 max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-semibold leading-tight text-gray-900 mb-6">
          Ucz się efektywnie
          <br />z naszą platformą
        </h1>

        <p className="text-xl text-gray-600 leading-relaxed mb-12">
          Nowoczesne narzędzia do nauki i współpracy. Tablica interaktywna,
          materiały edukacyjne i wiele więcej w jednym miejscu.
        </p>

        <button
          onClick={() => router.push("/tablica")}
          className="px-12 py-4 text-lg font-medium text-white bg-gray-700 hover:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
        >
          Zacznij jako gość
        </button>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-8 md:px-12 pb-16 max-w-7xl mx-auto">
        {/* Feature 1 */}
        <div className="bg-white p-10 rounded-xl text-center border border-gray-200 hover:border-gray-300 hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            Tablica Interaktywna
          </h3>
          <p className="text-base text-gray-600 leading-relaxed">
            Rysuj, pisz i współpracuj w czasie rzeczywistym na wirtualnej
            tablicy
          </p>
        </div>

        {/* Feature 2 */}
        <div className="bg-white p-10 rounded-xl text-center border border-gray-200 hover:border-gray-300 hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
          <div className="text-5xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            Materiały Edukacyjne
          </h3>
          <p className="text-base text-gray-600 leading-relaxed">
            Dostęp do szerokiej biblioteki materiałów i zasobów edukacyjnych
          </p>
        </div>

        {/* Feature 3 */}
        <div className="bg-white p-10 rounded-xl text-center border border-gray-200 hover:border-gray-300 hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
          <div className="text-5xl mb-4">🚀</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            Szybki Start
          </h3>
          <p className="text-base text-gray-600 leading-relaxed">
            Intuicyjny interfejs pozwala rozpocząć naukę w kilka sekund
          </p>
        </div>
      </div>
    </div>
  );
}