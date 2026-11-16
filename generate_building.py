#!/usr/bin/env python3
"""Produce 5-floor, layer-based animated SVG scene. No GIFs or external image resources.
Scene art is a temporary custom sprite/shape implementation pending approved sprite sheets.
"""
from pathlib import Path
from html import escape
ROOT=Path(__file__).parent
OUT=ROOT/'public'
OUT.mkdir(exist_ok=True,parents=True)
C={'outline':'#091527','wall':'#193354','back':'#24466a','floor':'#355a7b','slab':'#163450','cyan':'#33d7e9','gold':'#ffc467','green':'#71ebbd','red':'#ff5f73','glass':'#102d4e'}

def rect(x,y,w,h,fill,stroke='none',sw=2,rx=0,extra=''):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>'
def path(d, fill, stroke='none',sw=2,extra=''):
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>'
def text(x,y,t,color='#d8eef7',size=14,weight=700,extra=''):
    return f'<text x="{x}" y="{y}" fill="{color}" font-family="DejaVu Sans Mono, monospace" font-size="{size}" font-weight="{weight}" {extra}>{escape(t)}</text>'
def ellipse(x,y,rx,ry,fill): return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}"/>'
def plant(x,y):
    s=f'<g class="scenery plant" transform="translate({x} {y})">'+rect(-9,-14,18,16,'#b77d52','#102d45',2)
    for a,b,c,d in [(-18,-22,-6,-42),(-5,-24,0,-44),(8,-24,22,-42),(-14,-22,12,-37)]:
        s+=path(f'M0 -17 Q{a} {b} {c} {d} Q{c+6} {d+5} 0 -17','#4fca85','#204f56',1)
    return s+'</g>'
def lamp(x,y):
    return f'<g class="scenery lamp" transform="translate({x} {y})">'+rect(-11,0,22,8,'#ffd07a','#725b42',1)+rect(-4,-7,8,8,'#b4ddeb')+'</g>'
def monitor(x,y,tag='',facing='left'):
    """Desk monitor is shown from its BACK to camera; screen is on character-facing LEFT side.
       No artificially outward-facing blue screen on workers' desk monitors."""
    back='#536b82'
    s=f'<g class="prop monitor" transform="translate({x} {y})">'
    # Cable/desk monitor: trapezoid represents rear panel; visible surface is BACK not user interface
    s+=path('M-1 -36 L26 -42 L27 -8 L0 -2 Z',back,'#07182a',3)
    s+=path('M2 -32 L23 -37 L23 -12 L3 -8 Z','#29465e','#899daf',1)
    s+=rect(10,-25,6,5,'#a1b5bc','#1c3450',1)
    s+=path('M12 -5 L12 3 L20 1 L20 4 L6 7','none','#0a182b',3)
    s+=f'<g class="monitor-edge"><path d="M-4 -35 L-1 -36 L0 -2 L-3 -1 Z" fill="#35c8d4"/></g>'
    return s+'</g>'
def desk(x,y,wide=92):
    return f'<g class="furniture desk" transform="translate({x} {y})">'+path(f'M0 0 L{wide-10} -14 L{wide+5} -4 L16 13 Z','#dca06f','#3a3346',3)+path(f'M16 13 L{wide+5} -4 L{wide+5} 3 L16 22 Z','#875c5c','#432f39',2)+rect(17,15,7,37,'#87615c')+rect(wide-12,5,7,31,'#87615c')+'</g>'
def worker(x,y,kind='working',shirt='#937de7',label='IA',key=''):
    # seated workers, keyboard is to their right and screen rightward (facing worker), monitor back toward spectator
    opacity='0' if kind=='hidden' else '1'
    anim='typing' if kind=='working' else 'sleeping' if kind=='sleep' else 'walking' if kind=='walking' else 'waiting'
    s=f'<g class="sprite worker {anim}" id="worker-{key}" opacity="{opacity}" transform="translate({x} {y})">'
    s+=ellipse(1,12,18,7,'#10233e99')+rect(-12,-1,28,9,'#293a60','#0a1930',2)+rect(-9,5,8,16,'#334968')
    s+=rect(-4,-22,23,22,shirt,'#122343',2)
    s+=rect(0,-41,22,21,'#dca778','#3c2f46',2)
    s+=path('M-3 -38 L-1 -46 L20 -47 L25 -41 L25 -33 L19 -38 L0 -35 Z','#24314e','#10213d',2)
    s+=rect(20,-32,7,3,'#2d2632') # nose toward monitor at right
    s+=rect(17,-34,3,3,'#151b32')
    s+=f'<g class="arm"><path d="M14 -17 L24 -8 L32 -8" stroke="#dca778" stroke-width="6" stroke-linecap="square" fill="none"/></g>'
    if kind=='sleep': s+=text(22,-63,'Zz','#a9bde6',12)
    return s+'</g>'
def rack(x,y,mode='idle',n=4):
    fill='#fe6c80' if mode=='alert' else '#65dbbd' if mode=='active' else '#f0b86c'
    s=f'<g class="device rack" transform="translate({x} {y})">'+path('M0 0 L30 -9 L57 -1 L27 9 Z','#4e6d88','#07162c',2)+path('M0 0 L27 9 L27 74 L0 64 Z','#12263e','#07162c',3)+path('M27 9 L57 -1 L57 65 L27 74 Z','#1f3d5a','#07162c',3)
    for j in range(n):
        s+=rect(5,8+j*14,15,8,'#203c52','#07162c',1)
        for k in range(3):s+=rect(7+k*4,11+j*14,2,2,fill,extra=f'class="led led-{j%3}"')
    s+=text(10,82,'▥','#90b9cf',12)
    return s+'</g>'
def floor_background(i,y,label,color):
    s=f'<g class="floor-group" id="layer-floor-{i}" data-floor="{i}" data-sector="{escape(label)}">'
    # rear wall & bevels
    s+=path(f'M290 {y+9} L1086 {y+9} L1112 {y-5} L316 {y-5} Z','#304b6c','#0b1930',3)
    s+=rect(290,y+12,796,76,'#1c3553','#0d2037',3)
    # back wall pixel windows
    for col in range(13):
        x=322+col*57
        s+=rect(x,y+18,41,21,'#153251','#33567b',1)+rect(x+3,y+19,34,3,'#3a6993')
    s+=path(f'M286 {y+91} L1086 {y+91} L1130 {y+113} L331 {y+113} Z','#3e6688','#0b1a32',4)
    s+=path(f'M331 {y+113} L1130 {y+113} L1130 {y+121} L331 {y+121} Z','#152b47','#0b1a32',2)
    for tx in range(347,1075,65):s+=path(f'M{tx} {y+111} l40 -19','none','#526d8c',1)
    s+=rect(945,y+47,132,36,'#132b49','#0d2137',2,rx=3)+text(954,y+65,f'{i:02d}',color,20,900)+text(987,y+65,label[:13].upper(),'#c2e3ef',10)
    return s

def reception(y,mode):
    s=rect(380,y+61,170,11,'#dfae6a','#442e33',2)+rect(406,y+70,20,23,'#67475b')+rect(512,y+70,20,23,'#67475b')
    s+=text(409,y+50,'RECEPÇÃO','#fcd48f',12)+rect(408,y+24,112,18,'#23566a','#0a243d',2)+text(423,y+37,'CLOUD WORKSPACE','#aaf4f1',10)
    s+=worker(560,y+92,'walking' if mode=='active' else 'waiting','#a97acf','CW',f'reception-{mode}')
    s+=path(f'M706 {y+54} l120 -9 l25 12 l-120 11 Z','#9a7b79','#21324d',3)+rect(727,y+66,96,19,'#78596c','#21324d',2)
    s+=plant(880,y+93)+lamp(340,y+49)
    s+=text(626,y+42,'VISÃO GERAL','#9fd3ea',12)
    return s

def boss(y,mode):
    s=text(325,y+43,'CHEFE / CONTROLE',C['gold'],15)
    s+=rect(368,y+55,155,5,'#915a60')+desk(417,y+68,138)+lamp(566,y+36)+plant(906,y+93)
    if mode=='active':s+=worker(401,y+95,'working','#e3b266','CW',f'boss-{mode}')
    s+=rect(738,y+25,114,47,'#142b48','#568cad',3)+rect(748,y+30,92,23,'#12344a')
    for n in range(4):s+=rect(758+n*19,y+54-n*3,12,n*3+8,'#54c9df')
    s+=text(743,y+86,'CONTROLE','#acd8e6',10)
    return s

def agents(y,mode):
    s=text(331,y+42,'EQUIPE IA',C['cyan'],15)
    # all desk computers show dark backs to viewer, screens facing workers (to their right)
    for j,(x,shirt) in enumerate([(422,'#9179dc'),(633,'#d47c9b'),(826,'#5cb5bd')]):
        s+=desk(x-35,y+66,115)+monitor(x+44,y+63,tag='BACK')
        kind='working' if mode=='active' else 'sleep' if j==1 and mode=='idle' else 'waiting'
        s+=worker(x-25,y+89,kind,shirt,('GPT','AG','CX')[j],f'agent-{j}-{mode}')
    s+=plant(1046,y+98)
    if mode=='active':s+=text(873,y+25,'● ATIVIDADE DEMO','#7cf4bb',11)
    return s

def infra(y,mode):
    s=text(330,y+39,'MCP  /  TESTES',C['cyan'],15)
    s+=desk(448,y+66,150)+monitor(536,y+69)
    s+=worker(450,y+94,'working' if mode=='active' else 'waiting','#b47cbc','MCP',f'infra-{mode}')
    s+=rect(654,y+25,140,51,'#12273d','#42809a',2)
    for j,t in enumerate(['MCP', 'PLAYWRIGHT', 'PROCESSOS']):
        s+=rect(664,y+32+j*12,8,6,'#58aeca')+text(681,y+40+j*12,t,'#a6cedd',10)
    s+=rect(834,y+52,91,32,'#25344f','#0c2038',2)+text(845,y+71,'TESTES','#eecc88',11)
    s+=plant(1030,y+99)
    return s

def servers(y,mode):
    s=text(320,y+40,'DRIVE  ·  GITHUB  ·  HOSTINGER',C['cyan'],12)
    for j in range(5):s+=rack(430+j*103,y+16,mode)
    if mode=='alert':s+=text(995,y+35,'! ALERTA',C['red'],13)
    else:s+=text(980,y+33,'NUVEM','#a2c8ed',12)
    s+=plant(1053,y+98)
    return s

def office_svg(mode):
    s='''<svg xmlns="http://www.w3.org/2000/svg" width="1360" height="780" viewBox="0 0 1360 780" role="img" aria-label="Prédio isométrico Cloud Workspace IA com cinco andares em demonstração">
    <defs><linearGradient id="sky" x2="0.2" y2="1"><stop stop-color="#09172e"/><stop offset="1" stop-color="#123153"/></linearGradient>
    <linearGradient id="glass" x2="1" y2="1"><stop stop-color="#3c7197"/><stop offset="1" stop-color="#183a64"/></linearGradient></defs>
    <style><![CDATA[
    svg{shape-rendering:crispEdges;font-synthesis:none}
    .floor-group {transition:opacity .2s}
    .led-0{animation:blink 1.5s steps(1) infinite}
    .led-1{animation:blink 1.2s steps(1) .3s infinite}
    .led-2{animation:blink 1.7s steps(1) .8s infinite}
    .typing .arm{transform-box:fill-box;transform-origin:0% 10%;animation:typing .44s steps(2) infinite alternate}
    .sleeping{animation:bob 2.5s steps(3) infinite}
    .waiting{animation:bob 3.4s steps(3) infinite}
    .walking{animation:patrol 8s steps(16) infinite alternate}
    .walking .arm{transform-box:fill-box;transform-origin:top center;animation:typing .7s steps(2) infinite alternate}
    .scenery.plant{animation:leaf-sway 5s steps(3) infinite alternate}
    .skyline-window{animation:blink 6s steps(1) infinite}
    .monitor-edge{animation:pulse 2.2s steps(2) infinite}
    .elevator-car{animation:elevator 8s steps(5) infinite}
    .alert-glow{animation:warn 1.6s steps(2) infinite}
    @keyframes blink{0%,45%{opacity:1}46%,72%{opacity:.3}73%,100%{opacity:1}}
    @keyframes bob{0%,100%{translate:0 0}50%{translate:0 2px}}
    @keyframes typing{0%{rotate:-8deg}100%{rotate:7deg}}
    @keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
    @keyframes elevator{0%,100%{translate:0 0}25%{translate:0 -96px}50%{translate:0 -192px}75%{translate:0 -96px}}
    @keyframes warn{0%,100%{opacity:.25}50%{opacity:.8}}
    @keyframes patrol{0%,100%{translate:0 0}50%{translate:76px 0}}
    @keyframes leaf-sway{0%,100%{translate:0 0}50%{translate:1px 0}}
    @media(prefers-reduced-motion:reduce){.led-0,.led-1,.led-2,.typing .arm,.sleeping,.waiting,.walking,.scenery.plant,.skyline-window,.monitor-edge,.elevator-car,.alert-glow{animation:none}}
    ]]></style>'''
    s+=rect(0,0,1360,780,'url(#sky)')
    # city backdrop
    for x,h in [(0,120),(65,175),(152,96),(228,187),(1150,150),(1218,195),(1300,130)]:
        s+=rect(x,640-h,55,h,'#10263e')
        for xx in range(x+8,x+51,13):
            for yy in range(648-h,623,21):s+=rect(xx,yy,5,8,'#335b71',extra='class="skyline-window"')
    s+=ellipse(660,711,540,45,'#051426aa')
    # building shell left facade
    s+=path('M178 146 L286 114 L286 645 L210 615 Z','#152941','#091a30',6)
    s+=path('M208 118 L285 91 L1140 98 L1085 126 Z','#365779','#07172b',5)
    s+=rect(199,150,58,480,'#1b4268','#0b1e32',3)
    for sy in range(178,604,101):
        s+=rect(208,sy,40,79,'#1b3955','#386487',2)
        for n in range(4):s+=rect(213+n*8,sy+7,4,60,'#44769a')
    s+=rect(178,235,91,104,'#10263c','#1b4662',3)+text(193,270,'CW',C['gold'],42,900)
    s+=text(189,293,'CLOUD',C['cyan'],10)+text(189,309,'WORKSPACE','#a8d6e9',10)
    # floors from bottom up; draw independently named layers
    configs=[(5,116,'SERVIDORES',C['cyan'],servers),(4,214,'MCP / TESTES','#b7b0ff',infra),(3,312,'AGENTES IA',C['green'],agents),(2,410,'CONTROLE',C['gold'],boss),(1,508,'RECEPÇÃO','#f8bf91',reception)]
    for idx,y,label,color,renderer in configs:
        s+=floor_background(idx,y,label,color)
        s+=renderer(y,mode)
        s+='</g>'
    # right elevator shaft
    s+=rect(1126,115,50,548,'#0b243e','#457da0',4)
    for ey in [155,253,351,449,547]:
        s+=rect(1135,ey,33,57,'#133452','#5b9fc0',2)
        s+=text(1140,ey+42,'⇧','#58badc',23)
    s+=f'<g class="elevator-car">'+rect(1138,565,27,43,'#e7b775','#143652',3)+text(1144,594,'CW','#10243e',11)+'</g>'
    s+=path('M188 664 L1165 664 L1230 694 L267 704 Z','#3b5479','#142a49',5)
    for x in range(279,1230,76):s+=rect(x,705,28,4,'#ffd182')
    s+=text(293,741,'SEDE OPERACIONAL  •  PRÉVIA INTERATIVA — 5 ANDARES',C['cyan'],14)
    s+=rect(1010,19,300,42,'#0f253b','#45839a',2,6)+text(1028,45,'ESTADOS DE DEMONSTRAÇÃO',C['gold'],14)
    if mode=='alert':
        s+=rect(1057,116,80,432,'#ff43551d',extra='class="alert-glow"')
        s+=rect(986,16,22,22,C['red'],rx=3)+text(994,32,'!', '#102436',16)
    elif mode=='active':
        s+=text(21,45,'◉ DEMO: TAREFAS EM EXECUÇÃO',C['green'],15)
    else:
        s+=text(21,45,'○ DEMO: NENHUMA TAREFA',C['gold'],15)
    return s+'</svg>'
for mode in ('idle','active','alert'):
    (OUT/f'building-{mode}.svg').write_text(office_svg(mode),encoding='utf-8')
    print(mode, (OUT/f'building-{mode}.svg').stat().st_size)