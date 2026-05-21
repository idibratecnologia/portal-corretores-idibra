-- Portal de Corretores IDIBRA - Schema Supabase
-- Execute este SQL no painel do Supabase (SQL Editor)

-- 1. Tabela de imobiliárias
CREATE TABLE imobiliarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  telefone TEXT,
  email TEXT,
  cidade TEXT,
  uf TEXT,
  status TEXT DEFAULT 'ativa' CHECK (status IN ('ativa', 'inativa')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de corretores
CREATE TABLE corretores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE,
  creci TEXT,
  email TEXT UNIQUE NOT NULL,
  telefone TEXT,
  whatsapp TEXT,
  foto_url TEXT,
  imobiliaria_id UUID REFERENCES imobiliarias(id),
  cidade TEXT,
  uf TEXT,
  instagram TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('ativo', 'pendente', 'bloqueado', 'inativo')),
  observacoes_admin TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de administradores
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT,
  email TEXT UNIQUE NOT NULL,
  perfil TEXT DEFAULT 'admin' CHECK (perfil IN ('admin', 'superadmin')),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de eventos
CREATE TABLE eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT CHECK (tipo IN ('lançamento', 'treinamento', 'reunião', 'feira', 'workshop', 'outro')),
  empreendimento TEXT,
  local TEXT,
  endereco TEXT,
  link_maps TEXT,
  data_evento DATE,
  hora_inicio TIME,
  hora_fim TIME,
  capacidade INTEGER,
  banner_url TEXT,
  status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicado', 'encerrado', 'cancelado')),
  inscricoes_abertas BOOLEAN DEFAULT TRUE,
  criado_por UUID REFERENCES admin_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela de inscrições
CREATE TABLE evento_inscricoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  corretor_id UUID NOT NULL REFERENCES corretores(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'inscrito' CHECK (status IN ('inscrito', 'presente', 'ausente', 'cancelado')),
  qr_code_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  checkin_at TIMESTAMP WITH TIME ZONE,
  checkin_por UUID REFERENCES admin_users(id),
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (evento_id, corretor_id)
);

-- Índices
CREATE INDEX idx_corretores_status ON corretores(status);
CREATE INDEX idx_corretores_imobiliaria ON corretores(imobiliaria_id);
CREATE INDEX idx_eventos_status ON eventos(status);
CREATE INDEX idx_eventos_data ON eventos(data_evento);
CREATE INDEX idx_inscricoes_evento ON evento_inscricoes(evento_id);
CREATE INDEX idx_inscricoes_corretor ON evento_inscricoes(corretor_id);
CREATE INDEX idx_inscricoes_status ON evento_inscricoes(status);

-- RLS (Row Level Security)
ALTER TABLE imobiliarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE corretores ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_inscricoes ENABLE ROW LEVEL SECURITY;

-- Políticas: Admin pode tudo
CREATE POLICY "admin_all_imobiliarias" ON imobiliarias FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users WHERE ativo = TRUE));
CREATE POLICY "admin_all_corretores" ON corretores FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users WHERE ativo = TRUE));
CREATE POLICY "admin_all_eventos" ON eventos FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users WHERE ativo = TRUE));
CREATE POLICY "admin_all_inscricoes" ON evento_inscricoes FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users WHERE ativo = TRUE));

-- Políticas: Corretor pode ler eventos publicados
CREATE POLICY "corretor_read_eventos" ON eventos FOR SELECT USING (status = 'publicado' AND auth.uid() IN (SELECT id FROM corretores WHERE status = 'ativo'));

-- Políticas: Corretor pode gerenciar suas próprias inscrições
CREATE POLICY "corretor_read_inscricoes" ON evento_inscricoes FOR SELECT USING (corretor_id = auth.uid());
CREATE POLICY "corretor_insert_inscricoes" ON evento_inscricoes FOR INSERT WITH CHECK (
  corretor_id = auth.uid()
  AND EXISTS (SELECT 1 FROM corretores WHERE id = auth.uid() AND status = 'ativo')
  AND EXISTS (SELECT 1 FROM eventos WHERE id = evento_id AND status = 'publicado' AND inscricoes_abertas = TRUE)
);
CREATE POLICY "corretor_update_inscricoes" ON evento_inscricoes FOR UPDATE USING (corretor_id = auth.uid());

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_corretores_updated_at BEFORE UPDATE ON corretores FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_eventos_updated_at BEFORE UPDATE ON eventos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
