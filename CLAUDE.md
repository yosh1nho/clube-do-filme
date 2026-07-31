{
  "project": "Quinzena",
  "description": "Quinzena - sistema web para 3 usuarios registrarem filmes assistidos a cada quinzena, avaliarem e ranquearem",
  "stack": {
    "frontend": "HTML5 + CSS3 puro + Vanilla JavaScript",
    "backend": "Node.js + Express",
    "database": "Supabase (PostgreSQL)",
    "api": "TMDB API (busca de filmes)"
  },
  "structure": {
    "backend/": "API Express com rotas para quinzenas, avaliacoes, ranking, historico",
    "frontend/": "SPA vanilla com HTML/CSS/JS, design system Lovable no style.css",
    "backend/src/": "Codigo fonte do servidor Node.js"
  },
  "features": [
    "Busca de filmes via TMDB",
    "Quinzenas: registro de filme indicado por usuario, periodo inicio/fim",
    "Avaliacoes: nota (0-5) e resenha por usuario na quinzena ativa, reacoes com emoji",
    "Ranking: media das notas por quinzena, ranking dos membros",
    "Historico: filmes assistidos com notas e resenhas em blocos com posters"
  ],
  "users": 3,
  "design": "Lovable-inspired warm cream theme (#f7f4ed), Camera Plain Variable font, opacity-driven grays from #1c1c1c, #eceae4 borders"
}
