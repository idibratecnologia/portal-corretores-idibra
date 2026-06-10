/**
 * Seed inicial do banco.
 *
 * Cria:
 *   - 1 admin padrão (credenciais via .env ou defaults de desenvolvimento)
 *   - Imobiliárias de exemplo (apenas em NODE_ENV !== production)
 *
 * Rode com: npm run db:seed
 */
import 'dotenv/config'        // carrega o .env (ts-node não faz isso automaticamente)
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const SALT_ROUNDS = 12

async function main() {
  console.log('🌱 Iniciando seed...')

  // ── Admin padrão ───────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@idibra.com.br'
  const adminSenha = process.env.SEED_ADMIN_SENHA ?? 'idibra123'

  const senhaHash = await bcrypt.hash(adminSenha, SALT_ROUNDS)

  const admin = await prisma.admin.upsert({
    where:  { email: adminEmail },
    update: { nivel: 'super' },   // garante que o admin padrão é super
    create: {
      nome:  'Administrador IDIBRA',
      email: adminEmail,
      senha: senhaHash,
      nivel: 'super',
    },
  })

  console.log(`✅ Admin criado/atualizado: ${admin.email}`)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`   Senha de desenvolvimento: ${adminSenha}`)
  }

  // ── Dados de exemplo (somente fora de produção) ────────────────
  if (process.env.NODE_ENV !== 'production') {
    const imob = await prisma.imobiliaria.upsert({
      where:  { cnpj: '12.345.678/0001-90' },
      update: {},
      create: {
        nome:     'Imobiliária Alpha',
        cnpj:     '12.345.678/0001-90',
        telefone: '(11) 98765-4321',
        email:    'contato@alpha.com.br',
        cidade:   'São Paulo',
        uf:       'SP',
        status:   'ativa',
      },
    })
    console.log(`✅ Imobiliária de exemplo criada: ${imob.nome}`)

    const corretorSenha = await bcrypt.hash('corretor123', SALT_ROUNDS)
    const corretor = await prisma.corretor.upsert({
      where:  { cpf: '123.456.789-00' },
      update: {},
      create: {
        nome:            'Maria Silva',
        cpf:             '123.456.789-00',
        creci:           'SP-123456',
        email:           'maria.silva@email.com',
        senha:           corretorSenha,
        telefone:        '(11) 91234-5678',
        whatsapp:        '(11) 91234-5678',
        whatsapp_opt_in: true,
        cidade:          'São Paulo',
        uf:              'SP',
        status:          'ativo',
        imobiliaria_id:  imob.id,
      },
    })
    console.log(`✅ Corretor de exemplo criado: ${corretor.nome} (senha: corretor123)`)

    // Segundo corretor (pendente, para testar aprovação)
    const corretor2 = await prisma.corretor.upsert({
      where:  { cpf: '987.654.321-00' },
      update: {},
      create: {
        nome:            'João Pereira',
        cpf:             '987.654.321-00',
        creci:           'SP-654321',
        email:           'joao.pereira@email.com',
        senha:           corretorSenha,
        telefone:        '(11) 99876-5432',
        whatsapp:        '(11) 99876-5432',
        whatsapp_opt_in: true,
        cidade:          'Campinas',
        uf:              'SP',
        status:          'pendente',
        imobiliaria_id:  imob.id,
      },
    })
    console.log(`✅ Corretor pendente criado: ${corretor2.nome}`)

    // ── Eventos de exemplo (só se ainda não houver nenhum) ─────────
    const eventCount = await prisma.evento.count()
    if (eventCount === 0) {
      const now = new Date()
      const addDays = (d: number) => new Date(now.getTime() + d * 86400000)

      const parqueVerde = await prisma.evento.create({
        data: {
          titulo:      'Lançamento Residencial Parque Verde',
          descricao:   'Conheça o mais novo empreendimento da região com condições exclusivas para corretores parceiros.',
          tipo:        'lancamento',
          empreendimento: 'Residencial Parque Verde',
          local:       'Sede IDIBRA - Salão Principal',
          endereco:    'Av. Paulista, 1000 - São Paulo/SP',
          data_evento: addDays(11),
          hora_inicio: '19:00',
          hora_fim:    '22:00',
          capacidade:  100,
          status:      'publicado',
          inscricoes_abertas: true,
        },
      })

      await prisma.evento.create({
        data: {
          titulo:      'Feira Imobiliária IDIBRA 2026',
          descricao:   'A maior feira de imóveis do ano, com dezenas de empreendimentos e oportunidades.',
          tipo:        'feira',
          local:       'Expo Center Norte',
          endereco:    'R. José Bernardo Pinto, 333 - São Paulo/SP',
          data_evento: addDays(36),
          hora_inicio: '09:00',
          hora_fim:    '18:00',
          capacidade:  500,
          status:      'publicado',
          inscricoes_abertas: true,
        },
      })

      await prisma.evento.create({
        data: {
          titulo:      'Capacitação: Financiamento Imobiliário na Prática',
          descricao:   'Treinamento completo sobre linhas de financiamento e simulações.',
          tipo:        'treinamento',
          local:       'Centro de Treinamento IDIBRA',
          endereco:    'R. Augusta, 500 - São Paulo/SP',
          data_evento: addDays(62),
          hora_inicio: '14:00',
          hora_fim:    '18:00',
          capacidade:  60,
          status:      'rascunho',
          inscricoes_abertas: true,
        },
      })

      await prisma.evento.create({
        data: {
          titulo:      'Workshop: Marketing Digital para Corretores',
          descricao:   'Como vender mais usando redes sociais e tráfego pago.',
          tipo:        'workshop',
          local:       'Centro de Treinamento IDIBRA',
          endereco:    'R. Augusta, 500 - São Paulo/SP',
          data_evento: addDays(-76),
          hora_inicio: '09:00',
          hora_fim:    '12:00',
          capacidade:  40,
          status:      'encerrado',
          inscricoes_abertas: false,
        },
      })

      console.log('✅ 4 eventos de exemplo criados')

      // Inscrição da Maria no Parque Verde, com QR fixo para teste do quiosque
      await prisma.inscricao.create({
        data: {
          corretor_id:   corretor.id,
          evento_id:     parqueVerde.id,
          status:        'inscrito',
          qr_code_token: 'QR-TESTE-MARIA',
        },
      })
      console.log('✅ Inscrição de teste criada (token QR: QR-TESTE-MARIA)')
    }
  }

  console.log('🌱 Seed concluído.')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
