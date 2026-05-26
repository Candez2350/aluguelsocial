const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const routes = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar motor de templates EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares globais para parse de requisições
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser('segredo_sessao_auxilio_aluguel'));

// Configuração de Sessões baseadas em Cookies assinados
app.use(
  session({
    secret: 'segredo_sessao_auxilio_aluguel',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Em localhost pode ser false (sem HTTPS)
      maxAge: 1000 * 60 * 60 * 2 // Sessão dura 2 horas
    }
  })
);

// Servir arquivos estáticos (CSS, JS, uploads fictícios)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para disponibilizar variáveis globais nas views EJS
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// Integrar Rotas
app.use('/', routes);

// Rota de erro padrão para páginas não encontradas
app.use((req, res) => {
  res.status(404).render('error', {
    message: 'Página Não Encontrada',
    description: 'A URL solicitada não pôde ser encontrada neste servidor.',
    session: req.session
  });
});

// Exportar o app para a Vercel
module.exports = app;

// Inicializar Servidor localmente (se não estiver na Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Sistema Auxílio Aluguel (MVP) iniciado com sucesso!`);
    console.log(`📡 Servidor rodando em: http://localhost:${PORT}`);
    console.log(`====================================================`);
  });
}
