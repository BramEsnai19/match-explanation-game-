export const BackgroundSVG = () => {
  return (
    <svg
      className="fixed inset-0 w-full h-full -z-10"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#667eea", stopOpacity: 0.1 }} />
          <stop offset="50%" style={{ stopColor: "#764ba2", stopOpacity: 0.08 }} />
          <stop offset="100%" style={{ stopColor: "#f093fb", stopOpacity: 0.1 }} />
        </linearGradient>

        <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#4facfe", stopOpacity: 0.08 }} />
          <stop offset="50%" style={{ stopColor: "#00f2fe", stopOpacity: 0.06 }} />
          <stop offset="100%" style={{ stopColor: "#a8edea", stopOpacity: 0.1 }} />
        </linearGradient>

        <filter id="blur">
          <feGaussianBlur in="SourceGraphic" stdDeviation="40" />
        </filter>
      </defs>

      {/* Base background */}
      <rect width="1200" height="800" fill="#f8f9ff" />

      {/* Gradient overlay 1 */}
      <rect width="1200" height="800" fill="url(#grad1)" />

      {/* Gradient overlay 2 */}
      <rect width="1200" height="800" fill="url(#grad2)" />

      {/* Decorative blurred circles */}
      <circle cx="200" cy="150" r="300" fill="#667eea" opacity="0.08" filter="url(#blur)" />
      <circle cx="1000" cy="600" r="350" fill="#4facfe" opacity="0.08" filter="url(#blur)" />
      <circle cx="600" cy="750" r="280" fill="#f093fb" opacity="0.07" filter="url(#blur)" />
      <circle cx="150" cy="600" r="250" fill="#a8edea" opacity="0.07" filter="url(#blur)" />
      <circle cx="1100" cy="200" r="200" fill="#764ba2" opacity="0.06" filter="url(#blur)" />

      {/* Soft accent lines */}
      <path
        d="M 0,200 Q 300,150 600,200 T 1200,200"
        stroke="#667eea"
        strokeWidth="2"
        fill="none"
        opacity="0.05"
      />
      <path
        d="M 0,600 Q 300,550 600,600 T 1200,600"
        stroke="#4facfe"
        strokeWidth="2"
        fill="none"
        opacity="0.05"
      />
    </svg>
  );
};
