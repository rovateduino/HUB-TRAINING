import os, sqlite3, json, secrets, hashlib, hmac, html, csv, io, traceback
from datetime import datetime
from urllib.parse import parse_qs, urlparse
from wsgiref.simple_server import make_server

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'training.db')
STATIC_DIR = os.path.join(BASE_DIR, 'static')
SESSIONS = {}

def load_dotenv(path=None):
    env_path = path or os.path.join(BASE_DIR, '.env')
    if not os.path.isfile(env_path):
        return
    with open(env_path, encoding='utf-8') as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith('#'):
                continue
            if '=' not in line:
                continue
            key, val = line.split('=', 1)
            key = key.strip()
            val = val.strip()
            if len(val) >= 2 and val[0] == val[-1] and val[0] in ('"', "'"):
                val = val[1:-1]
            if key not in os.environ:
                os.environ[key] = val

load_dotenv()

PORT = int(os.environ.get('PORT', '5000'))
PASS_SCORE = 23
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'ADM-MUDAR-2026')
DEFAULT_PASS = ADMIN_PASSWORD == 'ADM-MUDAR-2026'

QUESTIONS = [
('Arquitetura','Qual é a lógica geral correta do caminho da energia no HUB/Site?',['Concessionária → Padrão/Cabine → QTA/ATM → QDGE → sistemas/cargas','UPS → QDGE → Concessionária → cargas','FCC → Padrão → Gerador → QDGE','QFAC → QTA → UPS → Concessionária'],0),
('Arquitetura','Qual é a função do QDGE dentro da arquitetura apresentada?',['É somente o quadro das baterias do UPS','É um ponto importante de distribuição para diversos sistemas, incluindo UPS, FCC e QFAC','É exclusivamente o quadro das cargas DC','É exclusivamente o quadro de climatização'],1),
('Emergência','Quando ocorre perda da alimentação normal, qual sistema de emergência participa da continuidade de alimentação conforme o fluxograma?',['Somente o QFAC','Somente o QDF','O gerador, através da lógica de transferência/gerenciamento','Somente os racks'],2),
('Redundância','No fluxograma estudado, UPS 1 e UPS 2 são apresentados como:',['Equipamentos sem relação entre si','Redundância um do outro','Dois geradores','Dois QDF'],1),
('Redundância','FCC 1 e FCC 2 são apresentados no material como:',['Redundância um do outro','Dois QTA','Dois QFAC','Dois bancos de UPS'],0),
('Climatização','Qual é o caminho simplificado da climatização mostrado no fluxograma?',['QDGE → QFAC → evaporadoras/condensadoras → climatização do Data Center','UPS → QDF → evaporadoras → QTA','FCC → QDNB → climatização','QDT → QDCC → climatização'],0),
('Operação','Qual é a janela de manutenção informada para as atividades?',['06:00 às 12:00','12:00 às 18:00','18:00 às 00:00','21:00 às 06:45'],3),
('Ticket','Antes de iniciar uma atividade que depende de autorização, o profissional deve:',['Começar pelas medições e abrir o ticket depois','Entender o ticket e aguardar a liberação/autorização do Centro de Gerenciamento do Site','Desligar o QDGE imediatamente','Iniciar somente se estiver sozinho'],1),
('Ticket','Qual informação é importante conferir no ticket?',['Somente o nome do técnico','Somente o horário','Site, janela, atividade, equipamento/andar afetado, responsáveis e observações/restrições','Somente a empresa'],2),
('Equipe','Como normalmente é dividida a atividade entre duas pessoas?',['Uma mede e a outra registra/confere os dados','Uma trabalha e a outra fica sem função','As duas fazem somente relatório','As duas ficam somente aguardando o ticket'],0),
('Infratel','Qual é a finalidade do registro no Infratel?',['Apenas substituir o ticket','Registrar os resultados, evidências e condições encontradas, formando histórico da manutenção','Somente registrar presença','Somente registrar horário de saída'],1),
('Medições AC','Quais são exemplos de pontos em que a equipe mede tensão AC?',['Padrão de Entrada, QTA, QDGE, QDNB, PDT e QFAC','Somente QDF e QDCC','Somente bancos de baterias','Somente FCC'],0),
('Medições DC','Quais são exemplos de pontos em que a equipe mede tensão DC?',['Padrão de Entrada e QFAC','QDF, QDCC e bancos de baterias de UPS/FCC','Somente QTA','Somente QDGE'],1),
('Medições AC','Quais relações de tensão AC podem fazer parte das medições, conforme o ponto e procedimento aplicável?',['Somente fase-fase','Somente fase-neutro','Fase-fase, fase-neutro e fase-terra, conforme aplicável','Somente neutro-terra em todos os casos'],2),
('Corrente','Além da tensão, o que a equipe mede nos circuitos/disjuntores?',['Somente temperatura ambiente','Corrente de cada circuito/disjuntor','Somente resistência de isolamento em todos os circuitos','Somente potência mecânica'],1),
('Corrente','Ao encontrar uma corrente elevada em um circuito, qual é uma sequência adequada de investigação?',['Trocar o disjuntor imediatamente sem investigar','Identificar circuito/rack, verificar a carga e a redundância das fontes e avaliar o balanceamento conforme procedimento','Desligar todas as UPS','Ignorar se a tensão estiver normal'],1),
('Balanceamento','Por que verificar a distribuição das cargas entre as fases?',['Para eliminar a necessidade de disjuntores','Para avaliar desequilíbrios e melhorar a distribuição da carga conforme projeto/procedimento','Para aumentar a tensão','Para substituir o gerador'],1),
('Redundância','Antes de alterar a alimentação de um rack, por que verificar se o equipamento possui fonte redundante?',['Para saber a marca do rack','Para preservar a continuidade da carga e entender se existe outro caminho de alimentação','Para aumentar a frequência','Para desligar o QFAC'],1),
('UPS','No material fornecido, qual configuração de baterias foi informada como típica para o UPS?',['40 elementos de bateria','4 elementos de 2 V','12 elementos de 1000 Ah','48 elementos exclusivamente no UPS'],0),
('UPS','Qual é a referência de campo informada para uma bateria de UPS de 12 V / 150 Ah em flutuação?',['Aproximadamente 9 V','Aproximadamente 12,0 V','Aproximadamente 13,7 V','Aproximadamente 24 V'],2),
('Baterias','Como as baterias são avaliadas na preventiva?',['Somente pela tensão total do banco','Uma a uma, com medições em flutuação e descarga e testes complementares quando necessário','Somente visualmente','Somente pelo ano de fabricação'],1),
('FCC','Qual outra tecnologia de bateria foi informada como existente em alguns FCC?',['Bateria selada 2 V / 1000 Ah','Bateria automotiva 1,5 V','Bateria alcalina AA','Bateria de lítio de celular'],0),
('Baterias','Quando uma bateria apresenta comportamento abaixo do esperado em flutuação ou descarga, o que pode ocorrer na rotina de diagnóstico?',['É automaticamente descartada sem teste','É submetida a teste complementar e avaliação de resistência interna','O rack é desligado sem análise','Somente o QFAC é medido'],1),
('Descarga FCC','No procedimento fornecido para descarga dos retificadores, qual é a sequência inicial?',['Ajustes de Parâmetros > ACU → Manual → Bat. em Descarga 47,0','Desligar o QDGE → QFAC → Automático','Manutenção > Grupo Ret → desligar todas as baterias','Infratel → exportar CSV → Manual'],0),
('Descarga FCC','Durante o procedimento informado, o Grupo Ret é ajustado para qual tensão para a etapa de descarga?',['12,00 V','24,00 V','48,00 V','54,00 V'],2),
('Descarga FCC','Após a descarga, qual é a condição final que deve ser confirmada no procedimento informado?',['Sistema permanecer em Manual e 48 V','Retornar a Automático e confirmar recuperação para aproximadamente 54,00 V','Desligar o retificador','Manter Bat. em Descarga em 47,0'],1),
('HIOKI','Antes das medições com o HIOKI BT3554-01, qual ajuste é realizado para conferir o zero do instrumento?',['0ADJ','File Acquisition','Search','Export'],0),
('HIOKI','Qual é a vantagem de manter o A.MEM (Auto Memory) ativo durante uma sequência de medições?',['Ele aumenta a tensão da bateria','Ele registra automaticamente as leituras quando estabilizam','Ele desliga o banco','Ele altera a resistência da bateria'],1),
('Diagnóstico','Qual é a melhor forma de interpretar uma anomalia de bateria?',['Olhar apenas um número isolado','Considerar tensão, comportamento em descarga, resistência interna, comparação com outros elementos e condição física/histórico','Considerar somente a idade','Considerar somente a tensão total do banco'],1),
('Segurança','Qual princípio deve prevalecer durante uma preventiva em ambiente crítico?',['Executar o mais rápido possível, mesmo fora do procedimento','Preservar segurança, autorização, continuidade operacional e seguir os procedimentos aplicáveis','Fazer alterações sem registrar','Ignorar alarmes sempre que possível'],1),
]


def init_db():
    c=sqlite3.connect(DB_PATH); c.execute('''CREATE TABLE IF NOT EXISTS attempts(id INTEGER PRIMARY KEY AUTOINCREMENT,candidate TEXT NOT NULL,identifier TEXT,score INTEGER NOT NULL,total INTEGER NOT NULL,passed INTEGER NOT NULL,answers TEXT NOT NULL,created_at TEXT NOT NULL)'''); c.commit(); c.close()

def save_attempt(candidate, identifier, score, answers):
    c=sqlite3.connect(DB_PATH); c.execute('INSERT INTO attempts(candidate,identifier,score,total,passed,answers,created_at) VALUES(?,?,?,?,?,?,?)',(candidate,identifier,score,len(QUESTIONS),int(score>=PASS_SCORE),json.dumps(answers),datetime.now().strftime('%d/%m/%Y %H:%M:%S'))); c.commit(); c.close()

def rows():
    c=sqlite3.connect(DB_PATH); c.row_factory=sqlite3.Row; r=c.execute('SELECT * FROM attempts ORDER BY id DESC').fetchall(); c.close(); return r

def esc(x): return html.escape(str(x), quote=True)

def page(title, body):
    return f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)}</title><link rel="stylesheet" href="/static/style.css"><link rel="stylesheet" href="/static/lightbox.css"></head><body><header class="topbar"><div class="brand"><span class="brand-mark">⚡</span><div><strong>Treinamento Elétrico</strong><small>Hubs • Sites • Data Center</small></div></div><nav><a href="/">Início</a><a href="/dashboard">Dashboard</a><a href="/admin/login">ADM</a></nav></header><main>{body}</main><footer>Material didático baseado nas informações operacionais fornecidas pela equipe. Não substitui NR-10, procedimentos corporativos, documentação de projeto, fabricante ou autorização operacional.</footer><script src="/static/lightbox.js" defer></script></body></html>'''

def home():
    # Static landing page is stored separately and can be edited visually.
    with open(os.path.join(BASE_DIR,'home.html'),encoding='utf-8') as f: return f.read()

def quiz_page(error=''):
    qs=''
    for i,(topic,q,opts,a) in enumerate(QUESTIONS,1):
        opts_html=''.join(f'<label class="option"><input type="radio" name="q{i}" value="{j}" required><span>{esc(o)}</span></label>' for j,o in enumerate(opts))
        qs+=f'<fieldset class="question"><legend><span>{i:02d}</span>{esc(q)}</legend>{opts_html}</fieldset>'
    err=f'<div class="error">{esc(error)}</div>' if error else ''
    body=f'''<section class="quiz-head"><span class="eyebrow">AVALIAÇÃO INTERNA</span><h1>Simulado — Manutenção Preventiva</h1><p>30 questões. Aprovação a partir de 23 acertos. O profissional verá apenas o resultado final; a análise detalhada fica disponível somente ao ADM.</p></section><form method="post" action="/simulado" class="quiz-form">{err}<div class="candidate-box"><label>Nome do profissional<input name="candidate" required placeholder="Nome completo"></label><label>Identificador / matrícula<input name="identifier" placeholder="Opcional"></label></div>{qs}<label class="confirm-box"><input type="checkbox" name="confirm" required> <span>Confirmo o envio. Após enviar, a avaliação será registrada e não poderá ser alterada.</span></label><button class="btn primary submit" type="submit">Finalizar avaliação</button></form>'''
    return page('Simulado | Avaliação Técnica',body)

def admin_login(error=''):
    err=f'<div class="error">{esc(error)}</div>' if error else ''
    warn='<div class="notice" style="margin-top:18px"><strong>⚠ Atenção:</strong> você está usando a senha ADM padrão. Defina <code>ADMIN_PASSWORD</code> no arquivo <code>.env</code> ou na variável de ambiente do SO antes do uso real.</div>' if DEFAULT_PASS else ''
    body=f'<section class="login"><span class="eyebrow">ÁREA RESTRITA</span><h1>Acesso ADM</h1><p>Somente o administrador deve acessar a análise detalhada das avaliações.</p>{err}<form method="post"><label>Senha administrativa<input type="password" name="password" required autofocus></label><button class="btn primary">Entrar</button></form>{warn}</section>'
    return page('ADM | Login',body)

def admin_page():
    r=rows(); tr=''
    for x in r:
        pct=x['score']/x['total']*100
        tr+=f'<tr><td>{esc(x["created_at"])}</td><td>{esc(x["candidate"])}</td><td>{esc(x["identifier"] or "—")}</td><td>{x["score"]}/{x["total"]}</td><td>{pct:.1f}%</td><td><span class="badge {"ok" if x["passed"] else "no"}">{"APROVADO" if x["passed"] else "NÃO APROVADO"}</span></td><td><a href="/admin/attempt/{x["id"]}">Ver análise</a></td></tr>'
    body=f'<section class="admin-head"><div><span class="eyebrow">PAINEL ADMINISTRATIVO</span><h1>Resultados dos profissionais</h1><p>O ADM vê acertos, erros, pontuação e respostas. O profissional vê apenas aprovado/não aprovado.</p></div><div class="hero-actions"><a class="btn ghost" href="/admin/export">Exportar CSV</a><a class="btn ghost" href="/admin/logout">Sair</a></div></section><div class="stats"><div><b>{len(r)}</b><span>Avaliações</span></div><div><b>{sum(1 for x in r if x["passed"])}</b><span>Aprovados</span></div><div><b>{sum(1 for x in r if not x["passed"])}</b><span>Não aprovados</span></div></div><div class="table-wrap"><table><thead><tr><th>Data</th><th>Profissional</th><th>ID</th><th>Acertos</th><th>%</th><th>Resultado</th><th></th></tr></thead><tbody>{tr or "<tr><td colspan=7>Nenhuma avaliação realizada ainda.</td></tr>"}</tbody></table></div>'
    return page('ADM | Painel',body)

def admin_attempt(aid):
    c=sqlite3.connect(DB_PATH); c.row_factory=sqlite3.Row; row=c.execute('SELECT * FROM attempts WHERE id=?',(aid,)).fetchone(); c.close()
    if not row: return page('Não encontrado','<section class="login"><h1>Avaliação não encontrada</h1><a class="btn ghost" href="/admin">Voltar ao painel</a></section>'),404
    answers=json.loads(row['answers']); details=''
    for i,(topic,q,opts,a) in enumerate(QUESTIONS,1):
        sel=answers.get(str(i),-1); correct=sel==a
        chosen='Não respondida' if sel<0 or sel>=len(opts) else opts[sel]
        details+=f'<article class="detail {"correct" if correct else "wrong"}"><div class="detail-num">{i:02d}</div><div><strong>{esc(topic)}</strong><h3>{esc(q)}</h3><p><b>Resposta do profissional:</b> {esc(chosen)}</p><p><b>Resposta correta:</b> {esc(opts[a])}</p></div><span class="mark">{"✓" if correct else "×"}</span></article>'
    pct=row['score']/row['total']*100
    body=f'<section class="admin-head"><div><span class="eyebrow">ANÁLISE DETALHADA</span><h1>{esc(row["candidate"])}</h1><p>ID: {esc(row["identifier"] or "—")} • {esc(row["created_at"])}</p></div><div class="result-pill {"ok" if row["passed"] else "no"}">{"APROVADO" if row["passed"] else "NÃO APROVADO"} · {row["score"]}/{row["total"]} ({pct:.1f}%)</div></section><div class="detail-list">{details}</div><div class="section"><a class="btn ghost" href="/admin">Voltar ao painel</a></div>'
    return page('ADM | Análise',body),200

def parse_body(environ):
    try: length=int(environ.get('CONTENT_LENGTH','0'))
    except: length=0
    data=environ['wsgi.input'].read(length).decode('utf-8')
    return {k:v[-1] for k,v in parse_qs(data,keep_blank_values=True).items()}

def admin_auth(environ):
    cookie=environ.get('HTTP_COOKIE','')
    for part in cookie.split(';'):
        if part.strip().startswith('adm_session='):
            token=part.strip().split('=',1)[1]
            return SESSIONS.get(token,False)
    return False

def application(environ,start_response):
    try:
        path=urlparse(environ.get('PATH_INFO','/')).path
        method=environ.get('REQUEST_METHOD','GET')
        if path=='/@vite/client' and method=='GET':
            start_response('204 No Content',[]); return [b'']
        if path.startswith('/static/') and method=='GET':
            fp=os.path.join(STATIC_DIR,path[len('/static/'):])
            if os.path.isfile(fp):
                import mimetypes
                data=open(fp,'rb').read(); start_response('200 OK',[('Content-Type',mimetypes.guess_type(fp)[0] or 'application/octet-stream'),('Content-Length',str(len(data)))]); return [data]
        if path=='/' and method=='GET':
            body=home(); start_response('200 OK',[('Content-Type','text/html; charset=utf-8')]); return [body.encode()]
        if path=='/simulado' and method=='GET':
            body=quiz_page(); start_response('200 OK',[('Content-Type','text/html; charset=utf-8')]); return [body.encode()]
        if path=='/simulado' and method=='POST':
            d=parse_body(environ); candidate=d.get('candidate','').strip(); identifier=d.get('identifier','').strip(); confirm=d.get('confirm','')
            if not confirm:
                body=quiz_page('Marque a confirmação de envio para finalizar a avaliação.'); start_response('400 Bad Request',[('Content-Type','text/html; charset=utf-8')]); return [body.encode()]
            if not candidate:
                body=quiz_page('Informe o nome do profissional.'); start_response('400 Bad Request',[('Content-Type','text/html; charset=utf-8')]); return [body.encode()]
            answers={}; score=0
            for i,(topic,q,opts,a) in enumerate(QUESTIONS,1):
                try: sel=int(d.get(f'q{i}','-1'))
                except: sel=-1
                answers[str(i)]=sel
                if sel==a: score+=1
            save_attempt(candidate,identifier,score,answers)
            passed=score>=PASS_SCORE
            body=page('Resultado | Avaliação',f'<section class="result {"pass" if passed else "fail"}"><div class="result-icon">{"✓" if passed else "×"}</div><span class="eyebrow">RESULTADO FINAL</span><h1>{"APROVADO" if passed else "NÃO APROVADO"}</h1><p>{"O profissional atingiu o aproveitamento mínimo definido para esta avaliação." if passed else "O profissional não atingiu o aproveitamento mínimo definido para esta avaliação."}</p><div class="result-rule">Critério: mínimo de 23 acertos em 30 (75%+).</div><a class="btn ghost" href="/">Voltar ao treinamento</a></section>')
            start_response('200 OK',[('Content-Type','text/html; charset=utf-8')]); return [body.encode()]
        if path=='/admin/login' and method=='GET':
            body=admin_login(); start_response('200 OK',[('Content-Type','text/html; charset=utf-8')]); return [body.encode()]
        if path=='/admin/login' and method=='POST':
            d=parse_body(environ); pw=d.get('password','')
            if hmac.compare_digest(pw,ADMIN_PASSWORD):
                token=secrets.token_urlsafe(32); SESSIONS[token]=True
                start_response('302 Found',[('Location','/admin'),('Set-Cookie',f'adm_session={token}; HttpOnly; SameSite=Lax; Path=/')]); return [b'']
            body=admin_login('Senha inválida.'); start_response('401 Unauthorized',[('Content-Type','text/html; charset=utf-8')]); return [body.encode()]
        if path=='/admin/logout':
            start_response('302 Found',[('Location','/'),('Set-Cookie','adm_session=deleted; Max-Age=0; Path=/')]); return [b'']
        if path=='/admin' and method=='GET':
            if not admin_auth(environ): start_response('302 Found',[('Location','/admin/login')]); return [b'']
            body=admin_page(); start_response('200 OK',[('Content-Type','text/html; charset=utf-8')]); return [body.encode()]
        if path.startswith('/admin/attempt/') and method=='GET':
            if not admin_auth(environ): start_response('302 Found',[('Location','/admin/login')]); return [b'']
            try: aid=int(path.rsplit('/',1)[1])
            except: aid=0
            body,status=admin_attempt(aid); start_response('200 OK' if status==200 else '404 Not Found',[('Content-Type','text/html; charset=utf-8')]); return [body.encode()]
        if path=='/admin/export' and method=='GET':
            if not admin_auth(environ): start_response('302 Found',[('Location','/admin/login')]); return [b'']
            out=io.StringIO(); w=csv.writer(out,delimiter=';'); w.writerow(['ID','Profissional','Identificador','Acertos','Total','Percentual','Resultado','Data/Hora'])
            for x in rows(): w.writerow([x['id'],x['candidate'],x['identifier'],x['score'],x['total'],round(x['score']/x['total']*100,1),'APROVADO' if x['passed'] else 'NÃO APROVADO',x['created_at']])
            data=('\ufeff'+out.getvalue()).encode('utf-8'); start_response('200 OK',[('Content-Type','text/csv; charset=utf-8'),('Content-Disposition','attachment; filename=avaliacoes_preventiva.csv')]); return [data]
        start_response('404 Not Found',[('Content-Type','text/plain; charset=utf-8')]); return [b'Not Found']
    except Exception:
        import sys
        tb = traceback.format_exc()
        sys.stderr.write(f'\n[ERRO INTERNO] {datetime.now().strftime("%d/%m/%Y %H:%M:%S")}\n{tb}\n')
        try:
            body=page('Erro interno',f'<section class="login" style="text-align:center"><div class="result-icon" style="font-size:54px;color:var(--danger)">⚠</div><h1 style="font-size:32px;margin:10px 0 14px">Ocorreu um erro no servidor</h1><p style="color:var(--muted)">A operação não pôde ser concluída. Se o problema persistir, contate o responsável técnico.<br><br><em>Caminho: <code style="font-size:13px">{esc(environ.get("PATH_INFO","/"))}</code></em></p><div class="hero-actions" style="justify-content:center"><a class="btn ghost" href="/admin">Voltar ao painel</a><a class="btn primary" href="/">Ir para o início</a></div></section>')
            start_response('500 Internal Server Error',[('Content-Type','text/html; charset=utf-8')])
            return [body.encode()]
        except Exception:
            start_response('500 Internal Server Error',[('Content-Type','text/plain; charset=utf-8')])
            return [b'Ocorreu um erro no servidor. Contate o administrador.']

if __name__=='__main__':
    init_db()
    env_path = os.path.join(BASE_DIR,'.env')
    env_exists = os.path.isfile(env_path)
    env_has_key = False
    if env_exists:
        try:
            with open(env_path,encoding='utf-8') as fe:
                content = {}
                for line in fe:
                    s=line.strip()
                    if s and not s.startswith('#') and '=' in s:
                        k,v = s.split('=',1)
                        k=k.strip(); v=v.strip()
                        if len(v)>=2 and v[0]==v[-1] and v[0] in ('"',"'"): v=v[1:-1]
                        content[k]=v
                env_has_key = 'ADMIN_PASSWORD' in content and os.environ.get('ADMIN_PASSWORD') == content['ADMIN_PASSWORD']
        except Exception:
            env_has_key = False
    if DEFAULT_PASS:
        origin = 'PADRÃO (INSEGURA)'
    elif env_exists and env_has_key:
        origin = 'ARQUIVO .env'
    else:
        origin = 'VAR. AMBIENTE DO SO'
    print('='*66, flush=True)
    print(f'  Servidor HTTP ativo em   : http://127.0.0.1:{PORT}', flush=True)
    print(f'  Painel ADM             : http://127.0.0.1:{PORT}/admin/login', flush=True)
    print(f'  Origem senha ADM      : {origin}', flush=True)
    if DEFAULT_PASS:
        print(f'  ⚠  AVISO              : senha padrão em uso. Configure ADMIN_PASSWORD no .env', flush=True)
    print(f'  Para encerrar        : Ctrl+C', flush=True)
    print('='*66, flush=True)
    import signal
    httpd = make_server('0.0.0.0', PORT, application)
    # SIGTERM (kill / taskkill / parar container) -> sai pelo mesmo caminho
    # limpo do Ctrl+C. SIGINT fica no comportamento padrão (levanta
    # KeyboardInterrupt e interrompe o select interno), por isso NÃO
    # instalamos handler próprio para SIGINT: era ele que "engolia" o
    # Ctrl+C no Windows (handle_request bloqueado + flag nunca atualizada).
    try:
        def _on_term(signum, frame):
            raise KeyboardInterrupt
        signal.signal(signal.SIGTERM, _on_term)
    except (ValueError, OSError, AttributeError):
        pass
    try:
        httpd.serve_forever()
    except (KeyboardInterrupt, SystemExit):
        pass
    finally:
        try:
            httpd.server_close()
        except Exception:
            pass
        print('\nServidor encerrado com sucesso.', flush=True)
