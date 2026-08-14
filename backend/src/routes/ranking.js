const { Router } = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = Router();

function authed(token) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

router.get('/', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token nao fornecido' });

    const sb = authed(token);
    const { data: { user } } = await sb.auth.getUser(token);

    // Busca todas as quinzenas não-aguardando com filmes e avaliações completas
    const { data: quinzenas, error: errQ } = await sb
      .from('quinzenas')
      .select('id, usuario_id, data_inicio, data_fim, status, filmes(*), avaliacoes(*, usuarios(id, nome, avatar_url, badge_ativa))')
      .neq('status', 'AGUARDANDO')
      .order('data_inicio', { ascending: true });

    if (errQ) return res.status(500).json({ error: errQ.message });

    const { data: usuarios, error: errU } = await sb
      .from('usuarios')
      .select('id, nome, email, avatar_url, badge_ativa')
      .order('nome');

    if (errU) return res.status(500).json({ error: errU.message });

    // Busca generos associados aos filmes para estatísticas de gênero
    const { data: filmeGeneros } = await sb
      .from('filme_generos')
      .select('filme_id, generos(id, nome)');

    const generosMap = {};
    (filmeGeneros || []).forEach(fg => {
      if (!generosMap[fg.filme_id]) generosMap[fg.filme_id] = [];
      if (fg.generos && fg.generos.nome) generosMap[fg.filme_id].push(fg.generos.nome);
    });

    // 1. Ranking dos Membros (Média recebida pelas indicações)
    const ranking = usuarios.map(usuario => {
      const minhasQuinzenas = (quinzenas || []).filter(q => q.usuario_id === usuario.id);

      const todasNotasRecebidas = [];
      const filmesComMedia = minhasQuinzenas.map(q => {
        const notas = (q.avaliacoes || []).map(a => a.nota);
        todasNotasRecebidas.push(...notas);
        const media = notas.length ? (notas.reduce((s, n) => s + n, 0) / notas.length) : null;
        return {
          quinzena_id: q.id,
          data_inicio: q.data_inicio,
          data_fim: q.data_fim,
          status: q.status,
          filme: q.filmes,
          media,
          total_votos: notas.length
        };
      });

      const totalFilmes = minhasQuinzenas.length;
      const totalAvaliacoes = todasNotasRecebidas.length;
      const media = todasNotasRecebidas.length
        ? (todasNotasRecebidas.reduce((s, n) => s + n, 0) / todasNotasRecebidas.length)
        : null;

      const comMedia = filmesComMedia.filter(f => f.media !== null);
      const melhorEscolha = comMedia.length
        ? comMedia.reduce((best, f) => f.media > best.media ? f : best, comMedia[0])
        : null;
      const piorEscolha = comMedia.length
        ? comMedia.reduce((worst, f) => f.media < worst.media ? f : worst, comMedia[0])
        : null;

      let trend = null;
      if (comMedia.length >= 2) {
        const sorted = [...comMedia].sort((a, b) => a.data_inicio.localeCompare(b.data_inicio));
        const last = sorted[sorted.length - 1].media;
        const prev = sorted[sorted.length - 2].media;
        if (last > prev) trend = 'up';
        else if (last < prev) trend = 'down';
        else trend = 'same';
      }

      return {
        usuario: { id: usuario.id, nome: usuario.nome, avatar_url: usuario.avatar_url },
        media,
        totalFilmes,
        totalAvaliacoes,
        melhorEscolha,
        piorEscolha,
        trend,
        filmes: filmesComMedia
      };
    });

    ranking.sort((a, b) => {
      if (a.media === null && b.media === null) return 0;
      if (a.media === null) return 1;
      if (b.media === null) return -1;
      if (b.media !== a.media) return b.media - a.media;
      return b.totalAvaliacoes - a.totalAvaliacoes;
    });

    ranking.forEach((r, i) => { r.posicao = i + 1; });

    // 2. Análise de Avaliações Concedidas por cada Usuário (para Badges e Afinidade)
    const todasAvaliacoes = [];
    (quinzenas || []).forEach(q => {
      (q.avaliacoes || []).forEach(av => {
        todasAvaliacoes.push({
          ...av,
          quinzena_id: q.id,
          filme_id: q.filme_id,
          filme: q.filmes,
          escolhedor_id: q.usuario_id
        });
      });
    });

    const statsUsuarios = {};
    usuarios.forEach(u => {
      statsUsuarios[u.id] = {
        usuario: u,
        notasDadas: [],
        totalPalavras: 0,
        primeiroVotoCount: 0,
        distanciasMedia: [] // quão distante suas notas ficaram da média da quinzena
      };
    });

    // Calcula a média de cada quinzena e primeiro votante
    (quinzenas || []).forEach(q => {
      const avs = q.avaliacoes || [];
      if (!avs.length) return;

      const mediaQ = avs.reduce((acc, a) => acc + a.nota, 0) / avs.length;

      // Ordena por criado_em para descobrir quem avaliou primeiro
      const avsOrdenadas = [...avs].sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));
      if (avsOrdenadas[0] && statsUsuarios[avsOrdenadas[0].usuario_id]) {
        statsUsuarios[avsOrdenadas[0].usuario_id].primeiroVotoCount++;
      }

      avs.forEach(a => {
        if (statsUsuarios[a.usuario_id]) {
          statsUsuarios[a.usuario_id].notasDadas.push(a.nota);
          statsUsuarios[a.usuario_id].distanciasMedia.push(Math.abs(a.nota - mediaQ));
          if (a.comentario) {
            statsUsuarios[a.usuario_id].totalPalavras += a.comentario.trim().split(/\s+/).length;
          }
        }
      });
    });

    // 3. Conquistas & Badges do Clube (sem emojis, identificadores limpos)
    const conquistas = [];

    // Badge 1: Midas do Cinema (1º colocado no ranking de indicações)
    if (ranking.length && ranking[0].media !== null) {
      conquistas.push({
        id: 'melhor_curador',
        titulo: 'Midas do Cinema',
        tipoIcone: 'crown',
        descricao: 'Maior média de notas recebidas pelas suas indicações de filmes',
        usuario: ranking[0].usuario,
        destaque: `Média de ${ranking[0].media.toFixed(1)}★`,
        categoria: 'curadoria'
      });
    }

    // Badge 2: O Crítico Implacável (Menor média de notas dadas)
    let menorMediaDada = null;
    let usuarioMenorMedia = null;
    // Badge 3: Coração Generoso (Maior média de notas dadas)
    let maiorMediaDada = null;
    let usuarioMaiorMedia = null;

    Object.values(statsUsuarios).forEach(st => {
      if (st.notasDadas.length >= 2) {
        const media = st.notasDadas.reduce((s, n) => s + n, 0) / st.notasDadas.length;
        if (menorMediaDada === null || media < menorMediaDada) {
          menorMediaDada = media;
          usuarioMenorMedia = st;
        }
        if (maiorMediaDada === null || media > maiorMediaDada) {
          maiorMediaDada = media;
          usuarioMaiorMedia = st;
        }
      }
    });

    if (usuarioMenorMedia && menorMediaDada !== null) {
      conquistas.push({
        id: 'critico_implacavel',
        titulo: 'O Crítico Implacável',
        tipoIcone: 'target',
        descricao: 'O membro mais exigente do clube (menor média de notas distribuídas)',
        usuario: usuarioMenorMedia.usuario,
        destaque: `Média dada: ${menorMediaDada.toFixed(1)}★ (${usuarioMenorMedia.notasDadas.length} reviews)`,
        categoria: 'avaliacao'
      });
    }

    if (usuarioMaiorMedia && maiorMediaDada !== null && (usuarioMaiorMedia.usuario.id !== usuarioMenorMedia?.usuario.id)) {
      conquistas.push({
        id: 'otimista',
        titulo: 'Coração Generoso',
        tipoIcone: 'star',
        descricao: 'O membro mais generoso e otimista com as notas',
        usuario: usuarioMaiorMedia.usuario,
        destaque: `Média dada: ${maiorMediaDada.toFixed(1)}★ (${usuarioMaiorMedia.notasDadas.length} reviews)`,
        categoria: 'avaliacao'
      });
    }

    // Badge 4: O Incompreendido (Maior divergência em relação ao grupo)
    let maiorDesvio = null;
    let usuarioDoContra = null;
    Object.values(statsUsuarios).forEach(st => {
      if (st.distanciasMedia.length >= 2) {
        const desvioMedio = st.distanciasMedia.reduce((s, d) => s + d, 0) / st.distanciasMedia.length;
        if (maiorDesvio === null || desvioMedio > maiorDesvio) {
          maiorDesvio = desvioMedio;
          usuarioDoContra = st;
        }
      }
    });

    if (usuarioDoContra && maiorDesvio !== null && maiorDesvio > 0.4) {
      conquistas.push({
        id: 'do_contra',
        titulo: 'O Incompreendido',
        tipoIcone: 'zap',
        descricao: 'Suas notas são as que mais se distanciam do consenso do grupo',
        usuario: usuarioDoContra.usuario,
        destaque: `Divergência média: ±${maiorDesvio.toFixed(1)}★`,
        categoria: 'avaliacao'
      });
    }

    // Badge 5: Primeiro da Fila
    let maisRapido = null;
    Object.values(statsUsuarios).forEach(st => {
      if (st.primeiroVotoCount > 0 && (!maisRapido || st.primeiroVotoCount > maisRapido.primeiroVotoCount)) {
        maisRapido = st;
      }
    });

    if (maisRapido) {
      conquistas.push({
        id: 'maratonista',
        titulo: 'Primeiro da Fila',
        tipoIcone: 'clock',
        descricao: 'O membro que mais vezes foi o primeiro a avaliar uma nova quinzena',
        usuario: maisRapido.usuario,
        destaque: `${maisRapido.primeiroVotoCount}x primeiro a assistir`,
        categoria: 'engajamento'
      });
    }

    // Badge 6: Crítico Literário
    let maisEscreveu = null;
    Object.values(statsUsuarios).forEach(st => {
      if (st.totalPalavras >= 20 && (!maisEscreveu || st.totalPalavras > maisEscreveu.totalPalavras)) {
        maisEscreveu = st;
      }
    });

    if (maisEscreveu) {
      conquistas.push({
        id: 'resenhista',
        titulo: 'Crítico Literário',
        tipoIcone: 'edit',
        descricao: 'Escreveu os comentários mais completos e detalhados do clube',
        usuario: maisEscreveu.usuario,
        destaque: `${maisEscreveu.totalPalavras} palavras redigidas`,
        categoria: 'engajamento'
      });
    }

    // Badge 7: Arqueólogo do Cinema (Filme mais antigo)
    let filmeMaisAntigo = null;
    (quinzenas || []).forEach(q => {
      if (q.filmes && q.filmes.ano_lancamento) {
        const ano = parseInt(q.filmes.ano_lancamento);
        if (!isNaN(ano)) {
          if (!filmeMaisAntigo || ano < filmeMaisAntigo.ano) {
            const escolhedor = usuarios.find(u => u.id === q.usuario_id);
            filmeMaisAntigo = { ano, filme: q.filmes, escolhedor };
          }
        }
      }
    });

    if (filmeMaisAntigo && filmeMaisAntigo.escolhedor) {
      conquistas.push({
        id: 'arqueologo',
        titulo: 'Arqueólogo do Cinema',
        tipoIcone: 'film',
        descricao: 'Indicou o filme mais antigo já assistido pelo clube',
        usuario: filmeMaisAntigo.escolhedor,
        destaque: `${filmeMaisAntigo.filme.titulo} (${filmeMaisAntigo.ano})`,
        categoria: 'curadoria'
      });
    }

    // Badge 8: A Escolha Mais Polêmica
    let filmeMaisPolemico = null;
    let maiorVariancia = -1;
    (quinzenas || []).forEach(q => {
      const notas = (q.avaliacoes || []).map(a => a.nota);
      if (notas.length >= 2) {
        const media = notas.reduce((s, n) => s + n, 0) / notas.length;
        const variancia = notas.reduce((s, n) => s + Math.pow(n - media, 2), 0) / notas.length;
        const desvio = Math.sqrt(variancia);
        if (desvio > maiorVariancia) {
          maiorVariancia = desvio;
          const escolhedor = usuarios.find(u => u.id === q.usuario_id);
          filmeMaisPolemico = {
            filme: q.filmes,
            escolhedor,
            desvio,
            minNota: Math.min(...notas),
            maxNota: Math.max(...notas)
          };
        }
      }
    });

    if (filmeMaisPolemico && maiorVariancia >= 0.8) {
      conquistas.push({
        id: 'filme_polemico',
        titulo: 'A Escolha Mais Polêmica',
        tipoIcone: 'flame',
        descricao: 'Filme que gerou o maior debate e divisão de opiniões no clube',
        usuario: filmeMaisPolemico.escolhedor,
        destaque: `${filmeMaisPolemico.filme.titulo} (Notas de ${filmeMaisPolemico.minNota}★ a ${filmeMaisPolemico.maxNota}★)`,
        categoria: 'filme'
      });
    }

    // Sincronização persistente na tabela usuario_badges
    try {
      if (conquistas.length > 0) {
        // Marca todas as badges existentes no banco como ativa: false antes de atualizar os atuais líderes
        await sb.from('usuario_badges').update({ ativa: false }).neq('id', '00000000-0000-0000-0000-000000000000');

        // Sincronização das conquistas ativas
        for (const c of conquistas) {
          if (c.usuario?.id) {
            const { data: existente } = await sb
              .from('usuario_badges')
              .select('id')
              .eq('usuario_id', c.usuario.id)
              .eq('badge_id', c.id)
              .maybeSingle();

            if (existente) {
              await sb.from('usuario_badges').update({
                titulo: c.titulo,
                descricao: c.descricao,
                tipo_icone: c.tipoIcone,
                categoria: c.categoria,
                destaque: c.destaque,
                ativa: true
              }).eq('id', existente.id);
            } else {
              await sb.from('usuario_badges').insert({
                usuario_id: c.usuario.id,
                badge_id: c.id,
                titulo: c.titulo,
                descricao: c.descricao,
                tipo_icone: c.tipoIcone,
                categoria: c.categoria,
                destaque: c.destaque,
                ativa: true
              });
            }
          }
        }
      }
    } catch (errSync) {
      // Se a tabela ainda não tiver sido criada pelo usuário no SQL Editor, não quebra a requisição
      console.warn('Aviso: Sincronização de usuario_badges pendente de migração SQL:', errSync.message);
    }

    // Busca o inventário completo de badges do usuário logado diretamente do banco
    let inventarioUsuario = [];
    if (user?.id) {
      try {
        const { data: bData } = await sb
          .from('usuario_badges')
          .select('*')
          .eq('usuario_id', user.id);
        if (bData) inventarioUsuario = bData;
      } catch (errInv) {
        inventarioUsuario = [];
      }
    }

    // 4. Matriz de Afinidade Cinematográfica
    const afinidade = [];
    for (let i = 0; i < usuarios.length; i++) {
      for (let j = i + 1; j < usuarios.length; j++) {
        const u1 = usuarios[i];
        const u2 = usuarios[j];

        const filmesEmComum = [];
        let somaDiferencas = 0;
        let filmeMaiorConcordancia = null;
        let menorDiff = 999;
        let filmeMaiorDiscordancia = null;
        let maiorDiff = -1;

        (quinzenas || []).forEach(q => {
          const av1 = (q.avaliacoes || []).find(a => a.usuario_id === u1.id);
          const av2 = (q.avaliacoes || []).find(a => a.usuario_id === u2.id);

          if (av1 && av2) {
            const diff = Math.abs(av1.nota - av2.nota);
            somaDiferencas += diff;
            filmesEmComum.push({
              filme: q.filmes,
              nota1: av1.nota,
              nota2: av2.nota,
              diff
            });

            if (diff < menorDiff) {
              menorDiff = diff;
              filmeMaiorConcordancia = { filme: q.filmes, nota1: av1.nota, nota2: av2.nota, diff };
            }
            if (diff > maiorDiff) {
              maiorDiff = diff;
              filmeMaiorDiscordancia = { filme: q.filmes, nota1: av1.nota, nota2: av2.nota, diff };
            }
          }
        });

        if (filmesEmComum.length > 0) {
          const diffMedia = somaDiferencas / filmesEmComum.length;
          const porcentagem = Math.round(Math.max(0, 100 - (diffMedia / 5) * 100));

          let nivel = 'Divergências Saudáveis';
          if (porcentagem >= 88) {
            nivel = 'Gêmeos Cinematográficos';
          } else if (porcentagem >= 75) {
            nivel = 'Alta Sintonia';
          } else if (porcentagem < 60) {
            nivel = 'Inimigos do Bom Gosto';
          }

          afinidade.push({
            usuario1: u1,
            usuario2: u2,
            porcentagem,
            diferencaMedia: Number(diffMedia.toFixed(2)),
            filmesEmComumCount: filmesEmComum.length,
            nivel,
            maiorConcordancia: filmeMaiorConcordancia,
            maiorDiscordancia: filmeMaiorDiscordancia
          });
        }
      }
    }

    // 5. Estatísticas Gerais do Clube
    const distribuicaoNotas = {
      '5': 0,
      '4': 0,
      '3': 0,
      '2': 0,
      '1': 0
    };

    let totalNotasClube = 0;
    let somaNotasClube = 0;

    todasAvaliacoes.forEach(a => {
      totalNotasClube++;
      somaNotasClube += a.nota;
      const floor = Math.min(5, Math.max(1, Math.round(a.nota)));
      distribuicaoNotas[String(floor)]++;
    });

    const mediaGeralClube = totalNotasClube > 0 ? (somaNotasClube / totalNotasClube) : null;

    // Estatísticas por Gênero
    const generoStats = {};
    (quinzenas || []).forEach(q => {
      const genres = generosMap[q.filme_id] || [];
      const notas = (q.avaliacoes || []).map(a => a.nota);
      if (notas.length) {
        const mediaQ = notas.reduce((s, n) => s + n, 0) / notas.length;
        genres.forEach(g => {
          if (!generoStats[g]) generoStats[g] = { totalFilmes: 0, totalNotas: 0, somaMedias: 0 };
          generoStats[g].totalFilmes++;
          generoStats[g].totalNotas += notas.length;
          generoStats[g].somaMedias += mediaQ;
        });
      }
    });

    const generosRanking = Object.entries(generoStats).map(([nome, st]) => ({
      genero: nome,
      filmesCount: st.totalFilmes,
      media: Number((st.somaMedias / st.totalFilmes).toFixed(2))
    })).sort((a, b) => b.media - a.media);

    res.json({
      ranking,
      conquistas,
      afinidade,
      inventarioUsuario,
      estatisticas: {
        totalAvaliacoes: totalNotasClube,
        mediaGeral: mediaGeralClube !== null ? Number(mediaGeralClube.toFixed(2)) : null,
        distribuicaoNotas,
        generosRanking: generosRanking.slice(0, 8)
      },
      usuarioLogadoId: user?.id || null
    });
  } catch (err) {
    console.error('GET /ranking error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
