// Logo EFFE - f con pallino arancione
export function EffeLogo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 120" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Letter F stylized */}
      <path 
        d="M25 10 
           Q25 0, 45 0 
           Q70 0, 75 8
           L75 25
           Q65 15, 45 15
           Q35 15, 35 25
           L35 45
           L65 45
           L65 60
           L35 60
           L35 110
           L20 110
           L20 25
           Q20 10, 25 10
           Z" 
        fill="currentColor"
      />
      {/* Orange dot */}
      <circle cx="80" cy="100" r="15" fill="#E86A10" />
    </svg>
  );
}

export function EffeLogoLarge({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 120" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Letter F stylized */}
      <path 
        d="M25 10 
           Q25 0, 45 0 
           Q70 0, 75 8
           L75 25
           Q65 15, 45 15
           Q35 15, 35 25
           L35 45
           L65 45
           L65 60
           L35 60
           L35 110
           L20 110
           L20 25
           Q20 10, 25 10
           Z" 
        fill="currentColor"
      />
      {/* Orange dot */}
      <circle cx="80" cy="100" r="15" fill="#E86A10" />
    </svg>
  );
}
