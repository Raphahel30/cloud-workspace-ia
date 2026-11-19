import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  coreApi,
  type AgentMcpValidationDto,
  type AgentStatusDto,
  type AuditEventDto,
  type BootstrapResponse,
  type CoreOverviewResponse,
  type DriveProjectDto,
  type DriveProjectsResponse,
  type IntegrationItemDto,
  type SecurityResponse,
  type TaskDto,
  type WorkspacesResponse,
} from '../../lib/coreApiClient';
import {
  CwButton,
  CwEmptyState,
  CwModal,
  CwNotice,
  CwPanel,
  CwProgressBar,
  CwStatCard,
  CwStatusBadge,
  type BadgeTone,
} from '../ui/StandardUi';

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatIsoShort(iso: string | null): string {
  if (!iso) return 'Desconhecido';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function agentBadge(state: string): { tone: BadgeTone; label: string } {
  switch (state) {
    case 'working':
      return { tone: 'teal', label: 'TRABALHANDO (VERIFICADO)' };
    case 'idle':
      return { tone: 'cyan', label: 'OCIOSO / PRONTO' };
    case 'waiting':
      return { tone: 'amber', label: 'AGUARDANDO APROVAÇÃO' };
    case 'error':
      return { tone: 'red', label: 'ERRO CONFIRMADO' };
    case 'absent':
      return { tone: 'muted', label: 'AUSENTE' };
    default:
      return { tone: 'amber', label: 'DESCONHECIDO' };
  }
}

export function ProjectsScreen({ overview }: { overview: CoreOverviewResponse | null }) {
  const [data, setData] = useState<DriveProjectsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inspectProject, setInspectProject] = useState<DriveProjectDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await coreApi.getProjects());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ssdPct = data?.storage.ssdLocal.totalBytes
    ? ((data.storage.ssdLocal.usedBytes / data.storage.ssdLocal.totalBytes) * 100)
    : 0;
  const gPct = data?.storage.googleDrive.totalBytes
    ? ((data.storage.googleDrive.usedBytes / data.storage.googleDrive.totalBytes) * 100)
    : 0;

  return (
    <div className="cw-screen" data-testid="screen-projects">
      <div className="cw-screen-head">
        <div>
          <p className="overline">ETAPA 4 · GOOGLE DRIVE STREAMING (SOMENTE LEITURA)</p>
          <h1>Gerenciador de Projetos · Projetos Code</h1>
          <p className="subtitle">
            Consulta segura e não destrutiva de <code>{data?.driveRoot ?? 'G:\\Meu Drive\\Projetos Code'}</code> combinada ao estado Git local verificado.
          </p>
        </div>
        <div className="cw-head-actions">
          <CwStatusBadge tone={data?.driveConnected ? 'teal' : 'amber'} label={data?.driveConnected ? 'DRIVE G:\\ CONECTADO' : 'VERIFICANDO DRIVE'} />
          <CwButton variant="primary" size="sm" onClick={() => void load()} disabled={loading} testId="refresh-drive-projects">
            {loading ? 'Atualizando...' : '↻ Reconsultar Drive (Somente leitura)'}
          </CwButton>
        </div>
      </div>

      <CwNotice
        tone="info"
        title="Proteção ativa contra escrita acidental"
        message="Esta tela lê metadados, estrutura de pastas, pacotes ZIP e estado Git apenas para inspeção. Nenhum arquivo real em G:\ ou em repositórios locais é movido, editado ou excluído."
      />

      {error ? <CwNotice tone="error" title="Falha na leitura do catálogo" message={error} /> : null}

      <div className="cw-kpi-grid">
        <CwStatCard
          icon="▤"
          tone="cyan"
          label="Projetos em 01 - Projetos"
          value={data?.projects.length ?? overview?.counts.projects ?? 0}
          hint="Catalogados com segurança"
        />
        <CwStatCard
          icon="▱"
          tone="blue"
          label="Pastas complementares na raiz"
          value={data?.companionFolders.length ?? overview?.counts.companionFolders ?? 0}
          hint="Documentação e espelhos"
        />
        <CwStatCard
          icon="◈"
          tone="amber"
          label="Arquivos sensíveis (somente nome)"
          value={data ? data.projects.reduce((s, p) => s + p.sensitiveCount, 0) : 0}
          hint="Conteúdo nunca lido em claro"
        />
        <CwStatCard
          icon="✦"
          tone="teal"
          label="Conflitos detectados"
          value={data ? data.projects.reduce((s, p) => s + p.conflictsDetected.length, 0) : 0}
          hint="Preservados sem sobrescrever"
        />
      </div>

      <div className="cw-two-col">
        <CwPanel
          overline="ARMAZENAMENTO WINDOWS E STREAMING"
          title="Situação de disco e cota"
          subtitle="Medição real em C:\ (SSD NVMe) e unidade virtual G:\"
        >
          <div className="cw-stack">
            <CwProgressBar
              label={`SSD Local (${data?.storage.ssdLocal.path ?? 'C:\\'})`}
              valuePercent={ssdPct}
              detail={data?.storage.ssdLocal.available ? `${formatBytes(data.storage.ssdLocal.freeBytes)} livres de ${formatBytes(data.storage.ssdLocal.totalBytes)}` : 'Indisponível'}
              tone={ssdPct > 85 ? 'amber' : 'cyan'}
            />
            <CwProgressBar
              label={`Google Drive Streaming (${data?.storage.googleDrive.path ?? 'G:\\'})`}
              valuePercent={gPct}
              detail={data?.storage.googleDrive.available ? `${formatBytes(data.storage.googleDrive.freeBytes)} livres de ${formatBytes(data.storage.googleDrive.totalBytes)}` : 'Drive G:\\ desconectado'}
              tone="teal"
            />
          </div>
        </CwPanel>

        <CwPanel
          overline="ESTRUTURA DE APOIO NO DRIVE"
          title="Pastas irmãs em Projetos Code"
          subtitle="Documentação contínua e registros preservados fora de 01 - Projetos"
        >
          {data?.companionFolders.length ? (
            <div className="cw-list">
              {data.companionFolders.map((cf) => (
                <div className="cw-list-row" key={cf.fullPath}>
                  <div>
                    <strong>{cf.name}</strong>
                    <small>{cf.fullPath}</small>
                  </div>
                  <div className="cw-list-meta">
                    <span>{cf.fileCount} arquivos · {formatBytes(cf.totalBytes)}</span>
                    <small>Sync: {formatIsoShort(cf.lastModifiedAt)}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <CwEmptyState title="Nenhuma pasta complementar encontrada" description="Conecte a unidade G:\\ em streaming para listar a árvore completa." />
          )}
        </CwPanel>
      </div>

      <CwPanel
        overline="CATÁLOGO DETALHADO"
        title="Projetos identificados em 01 - Projetos"
        subtitle="Clique em Inspecionar árvore para ver arquivos, worktrees, diffs Git e pacotes de backup."
      >
        {data?.projects.length ? (
          <div className="cw-project-grid">
            {data.projects.map((p) => (
              <article className="cw-project-card" key={p.id} data-testid={`project-card-${p.slug}`}>
                <div className="cw-project-top">
                  <div>
                    <h3>{p.name}</h3>
                    <small>{p.drivePath}</small>
                  </div>
                  <CwStatusBadge
                    tone={p.conflictsDetected.length > 0 ? 'red' : p.githubRepo ? 'teal' : 'cyan'}
                    label={
                      p.projectState === 'ativo-desenvolvimento'
                        ? 'ATIVO · GIT + DRIVE'
                        : p.projectState === 'requer-revisao'
                          ? 'CONFLITO DETECTADO'
                          : 'CATALOGADO'
                    }
                  />
                </div>

                <div className="cw-tag-row">
                  {p.technologies.map((tech) => (
                    <span key={tech} className="cw-chip">
                      {tech}
                    </span>
                  ))}
                </div>

                <dl className="cw-meta-grid">
                  <div>
                    <dt>GitHub</dt>
                    <dd>{p.githubRepo ?? 'Não vinculado localmente'}</dd>
                  </div>
                  <div>
                    <dt>Branch atual / HEAD</dt>
                    <dd>{p.currentBranch ? `${p.currentBranch} (${p.headSha ?? '—'})` : 'Sem checkout local'}</dd>
                  </div>
                  <div>
                    <dt>Diferenças locais</dt>
                    <dd>{p.dirtyFilesCount === null ? 'Desconhecido' : `${p.dirtyFilesCount} alteração(ões) no repo`}</dd>
                  </div>
                  <div>
                    <dt>Espaço e arquivos</dt>
                    <dd>{p.fileCount} itens · {formatBytes(p.totalBytes)}</dd>
                  </div>
                  <div>
                    <dt>Backups / Pacotes</dt>
                    <dd>{p.backupsCount} ({p.packages.length} ZIPs no Drive)</dd>
                  </div>
                  <div>
                    <dt>Última modificação</dt>
                    <dd>{formatIsoShort(p.lastConfirmedSyncAt)}</dd>
                  </div>
                </dl>

                <div className="cw-project-foot">
                  <span>{p.subfolders.length} subpastas · {p.worktrees.length} worktree(s) ativa(s)</span>
                  <CwButton size="sm" variant="primary" onClick={() => setInspectProject(p)} testId={`inspect-project-${p.slug}`}>
                    Inspecionar estrutura e Git
                  </CwButton>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <CwEmptyState
            title="Nenhum projeto retornado"
            description="Verifique se o Google Drive para computador está em streaming na unidade G:\\."
          />
        )}
      </CwPanel>

      <CwModal
        open={Boolean(inspectProject)}
        onClose={() => setInspectProject(null)}
        overline="INSPEÇÃO SOMENTE LEITURA"
        title={inspectProject ? `Detalhes de ${inspectProject.name}` : 'Detalhes'}
        footer={
          <CwButton variant="primary" onClick={() => setInspectProject(null)}>
            Fechar inspeção
          </CwButton>
        }
      >
        {inspectProject ? (
          <div className="cw-stack">
            <p className="cw-modal-note">
              Drive: <code>{inspectProject.drivePath}</code>
              {inspectProject.localRepoPath ? (
                <>
                  <br />
                  Clone local verificado: <code>{inspectProject.localRepoPath}</code>
                </>
              ) : null}
            </p>
            <div>
              <strong>Subpastas no Drive ({inspectProject.subfolders.length}):</strong>
              <div className="cw-tag-row">
                {inspectProject.subfolders.map((sf) => (
                  <span key={sf} className="cw-chip">
                    📁 {sf}
                  </span>
                ))}
              </div>
            </div>
            {inspectProject.worktrees.length > 0 ? (
              <div>
                <strong>Worktrees Git ativas ({inspectProject.worktrees.length}):</strong>
                <ul className="cw-plain-list">
                  {inspectProject.worktrees.map((wt) => (
                    <li key={wt.path}>
                      <code>{wt.branch ?? 'detached'}</code> · {wt.head ?? '—'} → <code>{wt.path}</code>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {inspectProject.packages.length > 0 ? (
              <div>
                <strong>Pacotes e backups em Pacotes\ ({inspectProject.packages.length}):</strong>
                <ul className="cw-plain-list">
                  {inspectProject.packages.map((pkg) => (
                    <li key={pkg.name}>
                      <code>{pkg.name}</code> ({formatBytes(pkg.sizeBytes)} · {formatIsoShort(pkg.modifiedAt)})
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </CwModal>
    </div>
  );
}

export function AgentsScreen({ onUpdated }: { onUpdated: () => void }) {
  const [agents, setAgents] = useState<AgentStatusDto[]>([]);
  const [chiefVisible, setChiefVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [lastReport, setLastReport] = useState<AgentMcpValidationDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newAgentId, setNewAgentId] = useState('');
  const [newAgentRole, setNewAgentRole] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await coreApi.getAgents();
      setAgents(res.agents);
      setChiefVisible(res.chiefVisible);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const validateAgent = async (agentId: string) => {
    setValidatingId(agentId);
    setError(null);
    try {
      const res = await coreApi.validateAgentMcp(agentId, 'cloud-workspace-ia');
      setAgents(res.agents);
      setChiefVisible(res.chiefVisible);
      setLastReport(res.report);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setValidatingId(null);
    }
  };

  const registerClient = async () => {
    if (!newAgentId.trim()) return;
    setError(null);
    try {
      const res = await coreApi.registerAgent({
        id: newAgentId,
        roleTitle: newAgentRole || 'Cliente MCP Externo',
        transport: 'MCP HTTP loopback',
      });
      setAgents(res.agents);
      setNewAgentId('');
      setNewAgentRole('');
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="cw-screen" data-testid="screen-agents">
      <div className="cw-screen-head">
        <div>
          <p className="overline">ETAPA 5 · GATEWAY MCP LOCAL (CORE-03) E CONTRATO SEM MENTIRAS</p>
          <h1>Agentes de IA & Permissões MCP</h1>
          <p className="subtitle">
            Sem evidência verificada, todo agente exibe explicitamente <strong>DESCONHECIDO</strong>. Valide cada cliente individualmente sem liberar terminal irrestrito.
          </p>
        </div>
        <div className="cw-head-actions">
          <CwStatusBadge tone={chiefVisible ? 'teal' : 'muted'} label={chiefVisible ? 'CHEFE ATIVO EM TAREFA' : 'CHEFE AUSENTE (SEM TAREFA)'} />
          <CwButton size="sm" onClick={() => void load()} disabled={loading}>
            ↻ Atualizar estados
          </CwButton>
        </div>
      </div>

      {error ? <CwNotice tone="error" title="Falha na validação MCP" message={error} /> : null}

      {lastReport ? (
        <CwNotice
          tone={lastReport.ok ? 'success' : 'warning'}
          title={`Validação MCP · ${lastReport.agentId} (${lastReport.ok ? 'APROVADA' : 'FALHOU'})`}
          message={`Escopo: ${lastReport.projectId} · Branch: ${lastReport.branch} · Token curto: ${lastReport.tokenPreview} · Estado resultante: ${agentBadge(lastReport.resultingState).label}.`}
        />
      ) : null}

      <div className="cw-agent-grid">
        {agents.map((ag) => {
          const badge = agentBadge(ag.visualState);
          return (
            <article className="cw-agent-card" key={ag.id} data-testid={`agent-card-${ag.id}`}>
              <div className="cw-project-top">
                <div>
                  <h3>{ag.displayName}</h3>
                  <small>{ag.roleTitle}</small>
                </div>
                <CwStatusBadge tone={badge.tone} label={badge.label} pulse={ag.visualState === 'working'} />
              </div>

              <p className="cw-agent-desc">{ag.capabilitySummary}</p>

              <dl className="cw-meta-grid">
                <div>
                  <dt>Transporte</dt>
                  <dd>{ag.transport}</dd>
                </div>
                <div>
                  <dt>CLI no Windows</dt>
                  <dd>{ag.cliDetected ? `Detectado (${ag.executablePath})` : 'Não detectado no PATH'}</dd>
                </div>
                <div>
                  <dt>Confiança da evidência</dt>
                  <dd>{ag.evidenceTrust ?? 'DESCONHECIDO'}</dd>
                </div>
                <div>
                  <dt>Conector MCP</dt>
                  <dd>{ag.mcpValidated ? 'Handshake JSON-RPC validado' : 'Aguardando validação'}</dd>
                </div>
              </dl>

              <div className="cw-project-foot">
                <span>Sem terminal irrestrito</span>
                <CwButton
                  variant="primary"
                  size="sm"
                  disabled={validatingId === ag.id}
                  onClick={() => void validateAgent(ag.id)}
                  testId={`validate-mcp-${ag.id}`}
                >
                  {validatingId === ag.id ? 'Validando MCP...' : 'Validar conector MCP'}
                </CwButton>
              </div>
            </article>
          );
        })}
      </div>

      {lastReport ? (
        <CwPanel
          overline="DETALHES DA ÚLTIMA VALIDAÇÃO JSON-RPC 2.0"
          title={`Sequência verificada para ${lastReport.agentId}`}
        >
          <div className="cw-list">
            {lastReport.steps.map((st) => (
              <div className="cw-list-row" key={st.step}>
                <div>
                  <strong>{st.step}</strong>
                  <small>{st.detail}</small>
                </div>
                <CwStatusBadge tone={st.passed ? 'teal' : 'red'} label={st.passed ? 'PASS' : 'FAIL'} />
              </div>
            ))}
          </div>
        </CwPanel>
      ) : null}

      <CwPanel
        overline="CADASTRO PROGRESSIVO"
        title="Registrar futuro cliente MCP"
        subtitle="Novos clientes entram no SQLite em estado DESCONHECIDO até passarem pelo handshake restrito."
      >
        <div className="cw-form-row">
          <input
            type="text"
            className="cw-input"
            placeholder="ID do agente (ex: gemini-cli)"
            value={newAgentId}
            onChange={(e) => setNewAgentId(e.target.value)}
            aria-label="ID do novo agente"
          />
          <input
            type="text"
            className="cw-input"
            placeholder="Função operacional"
            value={newAgentRole}
            onChange={(e) => setNewAgentRole(e.target.value)}
            aria-label="Função do novo agente"
          />
          <CwButton variant="amber" onClick={() => void registerClient()}>
            Cadastrar cliente
          </CwButton>
        </div>
      </CwPanel>
    </div>
  );
}

export function WorkspacesScreen({ onUpdated }: { onUpdated: () => void }) {
  const [data, setData] = useState<WorkspacesResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ tone: 'info' | 'success' | 'warning' | 'error'; title: string; message: string } | null>(null);
  const [confirmCleanupOpen, setConfirmCleanupOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await coreApi.getWorkspaces();
    setData(res);
    if (!selectedId && res.workspaces.length > 0) {
      setSelectedId(res.workspaces[0].id);
    }
  }, [selectedId]);

  useEffect(() => {
    void load().catch((e) =>
      setBanner({ tone: 'error', title: 'Erro ao carregar workspaces', message: String(e) }),
    );
  }, [load]);

  const runAction = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusyAction(action);
    try {
      const res = await coreApi.runWorkspaceAction({
        action,
        workspaceId: selectedId || undefined,
        projectId: 'sandbox-demo-ia',
        agentId: 'antigravity',
        ...extra,
      });
      setData(res);
      if (action === 'prepare_sandbox' && res.result.workspaceId) {
        setSelectedId(String(res.result.workspaceId));
      } else if (!selectedId && res.workspaces.length > 0) {
        setSelectedId(res.workspaces[0].id);
      }
      setBanner({
        tone: res.result.ok === false ? 'warning' : 'success',
        title: `Operação ${action}`,
        message: String(res.result.message ?? 'Concluída com verificação.'),
      });
      onUpdated();
    } catch (e) {
      setBanner({
        tone: 'error',
        title: `Bloqueado em ${action}`,
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusyAction(null);
      setConfirmCleanupOpen(false);
    }
  };

  const activeWs = useMemo(
    () => data?.workspaces.find((w) => w.id === selectedId) ?? data?.workspaces[0] ?? null,
    [data, selectedId],
  );

  return (
    <div className="cw-screen" data-testid="screen-workspaces">
      <div className="cw-screen-head">
        <div>
          <p className="overline">ETAPA 6 · SANDBOX FORA DE G:\, SHA-256, CONFLITOS E BACKUPS AES-256-GCM</p>
          <h1>Workspaces, Versionamento e Sincronização</h1>
          <p className="subtitle">
            Raiz local: <code>{data?.workspacesRoot ?? '%LOCALAPPDATA%\\CloudWorkspaceIA\\Workspaces'}</code> · Espaço recuperável estimado: <strong>{formatBytes(data?.recoverableBytes ?? 0)}</strong>
          </p>
        </div>
        <div className="cw-head-actions">
          <CwButton
            variant="primary"
            onClick={() => void runAction('prepare_sandbox')}
            disabled={busyAction !== null}
            testId="prepare-sandbox-btn"
          >
            {busyAction === 'prepare_sandbox' ? 'Preparando...' : '+ Preparar Sandbox Fictício'}
          </CwButton>
        </div>
      </div>

      {banner ? <CwNotice tone={banner.tone} title={banner.title} message={banner.message} /> : null}

      <CwPanel
        overline="CONTROLES DO WORKSPACE SELECIONADO (AMBIENTE FICTÍCIO)"
        title={activeWs ? `${activeWs.id} · Estado: ${activeWs.state}` : 'Nenhum workspace preparado'}
        subtitle={activeWs ? `Branch isolada: ${activeWs.branch} · Caminho local: ${activeWs.localPath}` : 'Crie primeiro uma área temporária fictícia fora do Google Drive.'}
      >
        <div className="cw-action-bar">
          <CwButton size="sm" disabled={!activeWs || busyAction !== null} onClick={() => void runAction('patch_file')} testId="ws-patch-btn">
            Editar arquivo (SHA-256)
          </CwButton>
          <CwButton size="sm" disabled={!activeWs || busyAction !== null} onClick={() => void runAction('git_commit_branch')} testId="ws-commit-btn">
            Commit em branch agent/*
          </CwButton>
          <CwButton size="sm" variant="amber" disabled={!activeWs || busyAction !== null} onClick={() => void runAction('simulate_conflict')} testId="ws-conflict-btn">
            Testar conflito concorrente
          </CwButton>
          <CwButton size="sm" variant="primary" disabled={!activeWs || busyAction !== null} onClick={() => void runAction('sync_checkpoint')} testId="ws-sync-btn">
            Sincronizar checkpoint SHA-256
          </CwButton>
          <CwButton size="sm" variant="primary" disabled={!activeWs || busyAction !== null} onClick={() => void runAction('create_backup')} testId="ws-backup-btn">
            Gerar backup AES-256-GCM
          </CwButton>
          <CwButton size="sm" disabled={!activeWs || busyAction !== null} onClick={() => void runAction('restore_backup')} testId="ws-restore-btn">
            Restaurar snapshot verificado
          </CwButton>
          <CwButton size="sm" variant="amber" disabled={!activeWs || busyAction !== null} onClick={() => void runAction('simulate_interruption')} testId="ws-recover-btn">
            Simular queda e recuperar
          </CwButton>
          <CwButton size="sm" disabled={!activeWs || busyAction !== null} onClick={() => void runAction('cleanup_preview')} testId="ws-cleanup-preview-btn">
            Prévia de limpeza
          </CwButton>
          <CwButton size="sm" variant="danger" disabled={!activeWs || busyAction !== null} onClick={() => setConfirmCleanupOpen(true)} testId="ws-cleanup-exec-btn">
            Limpar temporário (c/ aprovação)
          </CwButton>
        </div>
      </CwPanel>

      <div className="cw-two-col">
        <CwPanel overline="ÁREAS TEMPORÁRIAS PERSISTIDAS" title={`Workspaces (${data?.workspaces.length ?? 0})`}>
          {data?.workspaces.length ? (
            <div className="cw-list">
              {data.workspaces.map((ws) => (
                <button
                  type="button"
                  key={ws.id}
                  onClick={() => setSelectedId(ws.id)}
                  className={`cw-select-row ${activeWs?.id === ws.id ? 'is-selected' : ''}`}
                >
                  <div>
                    <strong>{ws.id}</strong>
                    <small>{ws.branch} · {formatBytes(ws.diskBytes)}</small>
                  </div>
                  <CwStatusBadge
                    tone={ws.state === 'CONFLITO' || ws.state === 'HASH_DIVERGENTE' ? 'red' : ws.state === 'AGUARDANDO_APROVACAO_DE_LIMPEZA' || ws.state === 'LIBERADO' ? 'teal' : 'cyan'}
                    label={ws.state}
                  />
                </button>
              ))}
            </div>
          ) : (
            <CwEmptyState title="Sem workspaces registrados" description="Clique em '+ Preparar Sandbox Fictício' para criar uma cópia isolada de teste." />
          )}
        </CwPanel>

        <CwPanel overline="INTEGRIDADE E SNAPSHOTS CIFRADOS" title={`Backups AES-256-GCM (${data?.backups.length ?? 0})`}>
          {data?.backups.length ? (
            <div className="cw-list">
              {data.backups.map((bkp) => (
                <div className="cw-list-row" key={bkp.id}>
                  <div>
                    <strong>{bkp.id}</strong>
                    <small>SHA-256: {bkp.sha256?.slice(0, 16) ?? '—'} · {bkp.restoreState}</small>
                  </div>
                  <CwStatusBadge tone="teal" label={bkp.retentionGroup} />
                </div>
              ))}
            </div>
          ) : (
            <CwEmptyState title="Nenhum snapshot salvo" description="Snapshots criptografados ficam fora de G:\ até que você aprove sincronização externa." />
          )}
        </CwPanel>
      </div>

      <CwModal
        open={confirmCleanupOpen}
        onClose={() => setConfirmCleanupOpen(false)}
        overline="CONFIRMAÇÃO EXPLÍCITA (POLÍTICA canCleanup)"
        title="Confirmar limpeza da cópia temporária fictícia?"
        footer={
          <>
            <CwButton variant="ghost" onClick={() => setConfirmCleanupOpen(false)}>
              Cancelar
            </CwButton>
            <CwButton variant="danger" onClick={() => void runAction('cleanup_execute')} testId="confirm-cleanup-modal-btn">
              Autorizar e limpar cópia temporária
            </CwButton>
          </>
        }
      >
        <p className="cw-modal-note">
          Somente o diretório temporário de teste criado pelo Cloud Workspace em <code>{activeWs?.localPath}</code> será removido, e apenas se não houver pendências, arquivos abertos ou conflitos. Nenhum dado do Google Drive é tocado.
        </p>
      </CwModal>
    </div>
  );
}

export function IntegrationsScreen() {
  const [items, setItems] = useState<IntegrationItemDto[]>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await coreApi.getIntegrations();
      setItems(res.integrations);
      setCheckedAt(res.checkedAt);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="cw-screen" data-testid="screen-connections">
      <div className="cw-screen-head">
        <div>
          <p className="overline">CONEXÕES E SERVIÇOS AUTORIZADOS</p>
          <h1>Integrações do Ambiente Windows</h1>
          <p className="subtitle">
            Última verificação real: <strong>{formatIsoShort(checkedAt)}</strong> · Serviços ainda não configurados exibem estado explícito <strong>DESCONHECIDO</strong>.
          </p>
        </div>
        <CwButton variant="primary" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? 'Verificando...' : '↻ Revalidar conexões reais'}
        </CwButton>
      </div>

      <div className="cw-agent-grid">
        {items.map((it) => (
          <article className="cw-agent-card" key={it.id} data-testid={`integration-card-${it.id}`}>
            <div className="cw-project-top">
              <div>
                <h3>{it.name}</h3>
                <small>{it.verified ? 'Verificação local ativa' : 'Integração futura / pendente'}</small>
              </div>
              <CwStatusBadge
                tone={it.status === 'connected' ? 'teal' : it.status === 'disconnected' ? 'red' : 'amber'}
                label={it.status === 'connected' ? 'CONECTADO' : it.status === 'disconnected' ? 'DESCONECTADO' : 'DESCONHECIDO'}
              />
            </div>
            <p className="cw-agent-desc">{it.detail}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function TestsLogsScreen({ overview }: { overview: CoreOverviewResponse | null }) {
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEventDto[]>([]);
  const [allowlist, setAllowlist] = useState<Array<{ id: string; stack: string; executable: string; args: string[]; description: string }>>([]);
  const [runningProfile, setRunningProfile] = useState<string | null>(null);
  const [lastOutput, setLastOutput] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await coreApi.getTestsLogs();
    setTasks(res.tasks);
    setAuditEvents(res.auditEvents);
    setAllowlist(res.commandAllowlist);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runProfile = async (profileId: string) => {
    setRunningProfile(profileId);
    try {
      const res = await coreApi.runAllowlistedTest(profileId);
      setTasks(res.tasks);
      setAuditEvents(res.auditEvents);
      setLastOutput(res.run.sanitizedLog || `Perfil ${profileId} finalizado (exit ${res.run.exitCode}).`);
    } finally {
      setRunningProfile(null);
    }
  };

  return (
    <div className="cw-screen" data-testid="screen-tests">
      <div className="cw-screen-head">
        <div>
          <p className="overline">ETAPA 7 · EXECUÇÃO CONTROLADA E TELEMETRIA DO HOST</p>
          <h1>Testes, Diagnósticos e Logs Sanitizados</h1>
          <p className="subtitle">
            Hardware medido: <strong>{overview?.hardware.cpuModel ?? 'AMD Ryzen 5 5600G'}</strong> ({overview?.hardware.cpuCores ?? 12} threads) · Execução sequencial respeitando 16 GB RAM.
          </p>
        </div>
        <CwButton size="sm" onClick={() => void load()}>
          ↻ Atualizar registros SQLite
        </CwButton>
      </div>

      <div className="cw-kpi-grid">
        <CwStatCard icon="▷" tone="cyan" label="RAM livre no sistema" value={overview ? `${overview.hardware.freeRamGb} / ${overview.hardware.totalRamGb} GB` : '—'} hint="Leitura direta do SO" />
        <CwStatCard icon="▥" tone="teal" label="SSD C:\ disponível" value={overview ? `${overview.hardware.ssdFreeGb} GB` : '—'} hint="Margem segura preservada" />
        <CwStatCard icon="◈" tone="blue" label="Memória do Sidecar" value={overview ? `${overview.hardware.sidecarRssMb} MB` : '—'} hint={`PID ${overview?.hardware.sidecarPid ?? '—'}`} />
        <CwStatCard icon="★" tone="amber" label="Eventos auditados" value={auditEvents.length} hint="Com redação automática" />
      </div>

      <CwPanel
        overline="PERFIS APROVADOS (COMMAND_ALLOWLIST_BY_STACK)"
        title="Executar validação permitida no projeto"
        subtitle="Nenhum comando arbitrário é aceito pelo MCP ou interface; apenas perfis da allowlist executam sem shell aberto."
      >
        <div className="cw-action-bar">
          {allowlist.map((spec) => (
            <CwButton
              key={spec.id}
              variant="primary"
              size="sm"
              disabled={runningProfile !== null}
              onClick={() => void runProfile(spec.id)}
              testId={`run-profile-${spec.id}`}
            >
              {runningProfile === spec.id ? `Executando ${spec.id}...` : `▶ ${spec.id} (${spec.stack})`}
            </CwButton>
          ))}
        </div>
        {lastOutput ? <pre className="cw-log-pre">{lastOutput}</pre> : null}
      </CwPanel>

      <div className="cw-two-col">
        <CwPanel overline="HISTÓRICO DE EXECUÇÕES" title={`Tarefas SQLite (${tasks.length})`}>
          {tasks.length ? (
            <div className="cw-list">
              {tasks.slice(0, 14).map((t) => (
                <div className="cw-list-row" key={t.id}>
                  <div>
                    <strong>{t.commandProfile} · {t.executor}</strong>
                    <small>{t.projectId} · origem {t.origin}</small>
                  </div>
                  <CwStatusBadge
                    tone={t.status === 'completed' ? 'teal' : t.status === 'running' ? 'cyan' : 'red'}
                    label={t.status.toUpperCase()}
                  />
                </div>
              ))}
            </div>
          ) : (
            <CwEmptyState title="Nenhuma tarefa executada" description="Use os botões acima ou valide um conector MCP para registrar tarefas verificadas." />
          )}
        </CwPanel>

        <CwPanel overline="TRILHA COM MASCARAMENTO DE SEGREDOS" title={`Auditoria recente (${auditEvents.length})`}>
          <div className="cw-list">
            {auditEvents.slice(0, 14).map((ev, i) => (
              <div className="cw-list-row" key={`${ev.id ?? i}`}>
                <div>
                  <strong>{ev.action} · {ev.subject}</strong>
                  <small>{ev.safeDetails}</small>
                </div>
                <CwStatusBadge
                  tone={ev.status === 'ok' ? 'teal' : ev.status === 'denied' ? 'amber' : 'red'}
                  label={ev.status.toUpperCase()}
                />
              </div>
            ))}
          </div>
        </CwPanel>
      </div>
    </div>
  );
}

export function SecurityScreen({
  bootstrap,
  onRestartSidecar,
}: {
  bootstrap: BootstrapResponse | null;
  onRestartSidecar: () => Promise<void>;
}) {
  const [sec, setSec] = useState<SecurityResponse | null>(null);
  const [kpResult, setKpResult] = useState<string | null>(null);
  const [recoveryMsg, setRecoveryMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setSec(await coreApi.getSecurity());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const testKeePassFictitious = async () => {
    const res = await coreApi.runKeePassTest({
      credentialId: 'cred-staging-demo',
      projectId: 'sandbox-demo-ia',
      grantEphemeralApproval: true,
    });
    setKpResult(
      res.outcome.ok
        ? `Credencial fictícia injetada em memória com aprovação temporária e zerada ao fim (Buffer.fill(0)): ${JSON.stringify(res.outcome.result)}`
        : `Bloqueado: ${res.outcome.error}`,
    );
    await load();
  };

  const triggerRecoveryCheck = async () => {
    const res = await coreApi.triggerRecovery();
    setRecoveryMsg(
      `Recuperação executada às ${formatIsoShort(res.lastRecovery.recoveredAt)}: ${res.lastRecovery.recoveredTasks.length} tarefa(s) e ${res.lastRecovery.recoveredWorkspaces.length} workspace(s) verificados.`,
    );
  };

  return (
    <div className="cw-screen" data-testid="screen-security">
      <div className="cw-screen-head">
        <div>
          <p className="overline">COFRE KEEPASSXC, APROVAÇÕES E PRESERVAÇÃO VISUAL (ETAPA 8)</p>
          <h1>Configurações, Segurança e Contratos</h1>
          <p className="subtitle">
            O cofre real do usuário permanece intacto e fechado. Todas as verificações utilizam o provedor fictício isolado.
          </p>
        </div>
        <div className="cw-head-actions">
          <CwButton size="sm" onClick={() => void triggerRecoveryCheck()}>
            ↻ Verificar recuperação
          </CwButton>
          <CwButton size="sm" variant="amber" onClick={() => void onRestartSidecar()} testId="restart-sidecar-btn">
            Reiniciar núcleo / token
          </CwButton>
        </div>
      </div>

      {kpResult ? <CwNotice tone="success" title="Teste KeePassXC (Provedor Fictício)" message={kpResult} /> : null}
      {recoveryMsg ? <CwNotice tone="info" title="Estado de recuperação" message={recoveryMsg} /> : null}

      <div className="cw-two-col">
        <CwPanel
          overline="SERVIÇO AUXILIAR WINDOWS (TAURI 2 + NODE SEA + SQLITE)"
          title="Estado do núcleo autenticado"
        >
          <dl className="cw-meta-grid">
            <div>
              <dt>Modo de empacotamento</dt>
              <dd>{bootstrap?.sidecar.packagingMode ?? 'tauri-sidecar-node-sea'}</dd>
            </div>
            <div>
              <dt>Instalação manual de Node pelo usuário</dt>
              <dd>{bootstrap?.sidecar.requiresManualNodeInstall ? 'Sim' : 'Não exigida (embutido)'}</dd>
            </div>
            <div>
              <dt>Banco SQLite local (fora de G:\)</dt>
              <dd><code>{bootstrap?.sidecar.dbPath ?? '—'}</code></dd>
            </div>
            <div>
              <dt>KeePassXC CLI no Windows</dt>
              <dd>{sec?.keepassCli.installed ? `Disponível em ${sec.keepassCli.path}` : 'Não encontrado'}</dd>
            </div>
          </dl>
        </CwPanel>

        <CwPanel
          overline="ETAPA 8 · PRESERVAÇÃO DA PIXEL ART"
          title="Pendências artísticas congeladas para etapa final"
          subtitle="Nenhuma arte existente foi descartada; o acabamento final usará atividade real dos agentes."
        >
          <ul className="cw-plain-list">
            {(sec?.frozenPixelArtPending ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CwPanel>
      </div>

      <CwPanel
        overline="COFRE KEEPASSXC SOB DEMANDA (SEM EXPÔR SENHA MESTRA)"
        title="Catálogo somente metadados + Teste fictício escopado"
        actions={
          <CwButton variant="primary" size="sm" onClick={() => void testKeePassFictitious()} testId="run-keepass-fictitious-btn">
            Testar liberação escopada fictícia
          </CwButton>
        }
      >
        <div className="cw-list">
          {(sec?.credentialMetadata ?? []).map((cred) => (
            <div className="cw-list-row" key={cred.id}>
              <div>
                <strong>{cred.title}</strong>
                <small>Projeto: {cred.project} · Serviço: {cred.service} · Ambiente: {cred.environment}</small>
              </div>
              <CwStatusBadge tone="cyan" label="SOMENTE METADADOS" />
            </div>
          ))}
        </div>
      </CwPanel>

      <CwPanel
        overline="CONTRATOS PROTEGIDOS E APROVAÇÕES"
        title={`Registros de aprovação (${sec?.approvals.length ?? 0})`}
        subtitle={`Contratos bloqueados contra alteração silenciosa: ${(sec?.protectedContracts ?? []).join(', ')}`}
      >
        {sec?.approvals.length ? (
          <div className="cw-list">
            {sec.approvals.slice(0, 10).map((apr) => (
              <div className="cw-list-row" key={apr.id}>
                <div>
                  <strong>{apr.actionType} · {apr.scope}</strong>
                  <small>Alvo: {apr.target} · Autor: {apr.author} · Hash: {apr.planHash}</small>
                </div>
                <CwStatusBadge tone={apr.decision === 'approved' ? 'teal' : apr.decision === 'pending' ? 'amber' : 'red'} label={apr.decision.toUpperCase()} />
              </div>
            ))}
          </div>
        ) : (
          <CwEmptyState title="Nenhuma aprovação registrada" description="Operações sensíveis como unlock_vault ou limpeza aprovada ficam gravadas aqui." />
        )}
      </CwPanel>
    </div>
  );
}
