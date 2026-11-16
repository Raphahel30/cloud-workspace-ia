from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import cairosvg,io
ROOT=Path('/mnt/data/cloud-workspace-ia');OUT=Path('/mnt/data')
BG='#0b1522'; PANEL='#142337'; BORDER='#2b4153'; MUTED='#96aebb'; WHITE='#e9f0f3';GOLD='#e9b86d'; MINT='#75d6b8'
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

def F(n,bold=False):return ImageFont.truetype(BOLD if bold else FONT,n)
def RR(draw,coords,fill,r=12,outline=None,width=1):draw.rounded_rectangle(coords,radius=r,fill=fill,outline=outline,width=width)
def T(draw,xy,s,size=15,color=WHITE,bold=False):draw.text(xy,s,font=F(size,bold),fill=color)

def scene(m,width=1080):
    data=(ROOT/'public'/f'office-{m}.svg').read_bytes(); b=cairosvg.svg2png(bytestring=data,output_width=width)
    return Image.open(io.BytesIO(b)).convert('RGB')

def compose(m):
    W=1600;H=1452
    img=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(img)
    d.rectangle((0,0,230,H),fill='#101d2b');d.line((229,0,229,H),fill='#304758',width=2)
    RR(d,(21,26,67,72),'#e7b775',12)
    T(d,(28,39),'CW',16,'#182e3e',True);T(d,(80,27),'Cloud Workspace',17,WHITE,True);T(d,(80,51),'IA · CONTROL CENTER',10,'#8fa5b7',True)
    T(d,(25,114),'ÁREA DE TRABALHO',12,'#8c9fad',True)
    items=[('◈','Escritório'),('▤','Projetos'),('▷','Laboratório'),('▦','Conexões'),('◉','Cofre seguro')]
    for i,(ico,name) in enumerate(items):
        yy=152+i*55
        if i==0:RR(d,(13,yy,216,yy+47),'#223f4d',8,'#356466',1)
        T(d,(30,yy+12),ico,22,'#81d4c5' if i==0 else '#829ba9',True)
        T(d,(72,yy+14),name,15,WHITE if i==0 else '#a4b6c6',i==0)
    d.line((23,466,206,466),fill='#294050',width=2)
    RR(d,(17,485,212,564),'#172a3c',10,'#2d4656',1)
    T(d,(29,501),'◈',24,GOLD,True);T(d,(66,500),'Projetos Code',14,WHITE,True)
    T(d,(66,528),'Google Drive · destino',11,'#839eae')
    RR(d,(17,1280,213,1325),'#392f2b',8,'#69513d',1)
    d.ellipse((30,1296,39,1305),fill='#e7b76b');T(d,(47,1293),'Modo demonstração',12,'#f1cc89',True)
    T(d,(20,1337),'Ainda sem conexão ao Windows,',10,'#839aaf');T(d,(20,1354),'MCP ou serviços externos.',10,'#839aaf')
    T(d,(20,1415),'v0.2.0 · PRÉVIA VISUAL',10,'#607c8b',True)
    # topbar
    d.rectangle((230,0,1600,68),fill='#0e1b2b');d.line((230,68,1600,68),fill='#213447')
    T(d,(272,26),'CENTRAL / ESCRITÓRIO',12,'#b9ced9',True)
    d.ellipse((1302,30,1311,39),fill=GOLD);T(d,(1317,25),'Telemetria indisponível',12,'#9eafbd')
    RR(d,(1524,15,1566,54),'#304b57',9,'#4b7582');T(d,(1533,27),'CW',12,'#bce6e4',True)
    T(d,(274,109),'VISÃO GERAL · CONTROLE OPERACIONAL',11,'#839bac',True)
    T(d,(273,135),'Seu escritório está',29,WHITE,True);T(d,(620,135),'sob controle.',29,GOLD,True)
    T(d,(275,179),'Acompanhe seus agentes, projetos e serviços em um único lugar.',13,'#91aabc')
    RR(d,(1323,115,1565,149),'#263d40',8,'#6a6c55');T(d,(1337,124),'✦ DESIGN EM APROVAÇÃO',12,'#e8bf80',True)
    # metrics
    RR(d,(273,218,1564,300),PANEL,12,BORDER)
    metrics=[('◷','Estado do escritório',{'idle':'Em repouso','active':'Simulando trabalho','alert':'Simulando alerta'}[m],'#184243',MINT),('▦','Agentes monitorados','4 cadastrados','#43382d',GOLD),('▥','Conexões reais','Não verificadas','#263c59','#9cbdee'),('▱','Projetos no app','0 importados','#383452','#bba4d9')]
    for i,(ico,l,v,bg,fg) in enumerate(metrics):
        x=273+i*323
        if i:d.line((x,231,x,287),fill='#293e50',width=2)
        RR(d,(x+17,236,x+63,282),bg,10);T(d,(x+28,245),ico,25,fg,True)
        T(d,(x+78,238),l,11,'#84a2b3');T(d,(x+78,258),v,14,WHITE,True)
    # scene panel
    RR(d,(273,324,1564,1115),'#111f31',14,'#314d5d',2)
    T(d,(296,348),'O ESCRITÓRIO DIGITAL',11,'#8da5b7',True)
    T(d,(296,371),'Visão isométrica',21,WHITE,True);T(d,(505,374),'/ pixel art',15,'#8299a9')
    T(d,(1311,363),'Simular estado',11,'#839cad')
    RR(d,(1410,347,1545,387),'#203b49',7,'#406274')
    T(d,(1422,359),{'idle':'Em repouso','active':'Em atividade','alert':'Com alerta'}[m],12,WHITE)
    art=scene(m,1266);img.paste(art,(286,401))
    d.line((286,1081,1552,1081),fill='#314959',width=2)
    d.ellipse((305,1090,314,1099),fill=MINT);T(d,(320,1086),'ativo verificado',11,'#a8b9c5')
    d.ellipse((484,1090,493,1099),fill=GOLD);T(d,(498,1086),'aguardando / incerto',11,'#a8b9c5')
    d.ellipse((711,1090,720,1099),fill='#f18787');T(d,(725,1086),'alerta',11,'#a8b9c5')
    # bottom two cards
    RR(d,(273,1133,909,1386),PANEL,12,BORDER)
    RR(d,(927,1133,1564,1386),PANEL,12,BORDER)
    T(d,(298,1154),'EXPLORAR O ESCRITÓRIO',11,'#7f98ab',True);T(d,(298,1182),'Funcionários IA',20,WHITE,True)
    T(d,(298,1219),'ChatGPT, Antigravity, Codex e Claude Code',13,'#9db4c3')
    for i,(label,xw) in enumerate([('Sala do chefe',126),('Funcionários IA',146),('Sala de servidores',165)]):
        x=299+sum([126,146,165][:i])+i*10;RR(d,(x,1258,x+xw-x if False else xw+x,1291),'#2b514e' if i==1 else '#1c3042',7,'#4f9f89' if i==1 else '#354c5c');T(d,(x+10,1268),label,11,'#bce5d3' if i==1 else '#a8bfcc')
    T(d,(299,1321),'Clique em uma sala para visualizar detalhes e eventos.',12,'#708b9e')
    T(d,(952,1154),'CENTRAL DE EVENTOS',11,'#7f98ab',True);T(d,(952,1182),'Atividade recente',20,WHITE,True)
    erows=[('Prévia em modo demonstração','Nenhum evento real registrado','AGORA',GOLD),('MCP local pendente de instalação','Será validado no Windows','PLANEJADO','#6d8395'),('Google Drive é o destino oficial','Projetos Code · pasta já criada','DEFINIDO','#6d8395')]
    for i,(title,sub,time,c) in enumerate(erows):
        y=1228+i*48;d.ellipse((956,y+5,965,y+14),fill=c);T(d,(976,y),title,12,WHITE,True);T(d,(976,y+19),sub,10,'#8ca3b2');T(d,(1453,y+9),time,9,'#66879a')
    T(d,(273,1412),'CLOUD WORKSPACE IA · PROTÓTIPO INTERATIVO',10,'#657d91',True)
    T(d,(1135,1412),'SEM OPERAÇÕES REAIS · DADOS SIMULADOS',10,'#657d91',True)
    return img

for m,name in [('idle','REPOUSO'),('active','TRABALHANDO'),('alert','ALERTA')]:
    target=OUT/f'CLOUD_WORKSPACE_TELA_PRINCIPAL_{name}.png';compose(m).save(target,optimize=True);print(target,target.stat().st_size)
# GIF for actual mode changes, combined with pulsing LED overlays to demonstrate motion design states
frames=[];durations=[]
for m,loops in [('idle',2),('active',7),('alert',3),('active',3)]:
    for i in range(loops):
        art=scene(m,900)
        if m=='active':
            draw=ImageDraw.Draw(art)
            if i%2:
                # pulse LED in the actual server rack location
                for x,y in [(770,256),(833,268),(885,232)]:
                    draw.rectangle((int(x*900/1080),int(y*900/1080),int(x*900/1080)+4,int(y*900/1080)+4),fill='#f5d68e')
        frames.append(art.convert('P',palette=Image.Palette.ADAPTIVE,colors=144))
        durations.append(620 if m!='active' else 160)
frames[0].save(OUT/'CLOUD_WORKSPACE_ANIMACAO_ESCRITORIO.gif',save_all=True,append_images=frames[1:],duration=durations,loop=0,optimize=True,disposal=2)
print('gif size', (OUT/'CLOUD_WORKSPACE_ANIMACAO_ESCRITORIO.gif').stat().st_size)