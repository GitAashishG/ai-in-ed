export default function Header() {
  return (
    <header className="bg-usu-blue text-white shadow-lg">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4">
          <div className="text-3xl font-bold">🎓</div>
          <div>
            <h1 className="text-2xl font-bold">USU AI Tutor</h1>
            <p className="text-sm text-gray-300">AI Usage Research Tool</p>
          </div>
        </div>
      </div>
    </header>
  );
}
