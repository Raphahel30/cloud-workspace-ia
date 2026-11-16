from pathlib import Path
from html import escape
p=Path(__file__).parent/'public'
p.mkdir(exist_ok=True)

INK='#13263d'; GOLD='#f7b663'; CREAM='#f4dcb6'; LBLUE='#7cd3d4'; BLUE='#5c8abb'; MINT='#74dcb2'; RED='#f18a88'; NAVY='#132338'

def rect(x,y,w,h,fill,stroke=None,sw=2,rx=0,klass=None):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="{sw}"' if stroke else '')+(f' rx="{rx}"' if rx else '')+(f' class="{klass}"' if klass else '')+'/>'

def polygon(points,fill,stroke=INK,sw=3,klass=None):
    pts=' '.join(f'{x},{y}' for x,y in points)
    return f'<polygon points="{pts}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="bevel"'+(f' class="{klass}"' if klass else '')+'/>'

def txt(x,y,s,size=15,color=CREAM,weight='700',anchor='start',klass=None):
    return f'<text x="{x}" y="{y}" font-family="ui-monospace,Consolas,monospace" font-size="{size}" font-weight="{weight}" fill="{color}" text-anchor="{anchor}"'+(f' class="{klass}"' if klass else '')+'>'+escape(s)+'</text>'

def iso_floor(cx,top,wx,hy,base,side):
    L=(cx-wx,top+hy); T=(cx,top); R=(cx+wx,top+hy); B=(cx,top+2*hy)
    out=polygon([L,T,R,B],base,INK,3)
    out+=polygon([L,B,(B[0],B[1]+17),(L[0],L[1]+17)],side,INK,3)
    out+=polygon([B,R,(R[0],R[1]+17),(B[0],B[1]+17)],'#1e3347',INK,3)
    # diamond tile lines
    for i in (0.25,0.5,0.75):
        # interpolation between left-bottom and top-right
        a=(L[0]+(T[0]-L[0])*i,L[1]+(T[1]-L[1])*i)
        b=(B[0]+(R[0]-B[0])*i,B[1]+(R[1]-B[1])*i)
        out+=f'<path d="M{a[0]} {a[1]} L{b[0]} {b[1]}" stroke="#4d7281" stroke-width="1" opacity=".34"/>'
        a=(T[0]+(R[0]-T[0])*i,T[1]+(R[1]-T[1])*i)
        b=(L[0]+(B[0]-L[0])*i,L[1]+(B[1]-L[1])*i)
        out+=f'<path d="M{a[0]} {a[1]} L{b[0]} {b[1]}" stroke="#4d7281" stroke-width="1" opacity=".34"/>'
    return out

def walls(cx,top,wx,hy,col,back):
    L=(cx-wx,top+hy);T=(cx,top);R=(cx+wx,top+hy)
    # left wall and right wall, 69px height
    out=polygon([(L[0],L[1]),(T[0],T[1]),(T[0],T[1]-75),(L[0],L[1]-75)],col)
    out+=polygon([(T[0],T[1]),(R[0],R[1]),(R[0],R[1]-75),(T[0],T[1]-75)],back)
    out+=f'<path d="M{T[0]} {T[1]-75}V{T[1]}" stroke="#273b50" stroke-width="4"/>'
    return out

def desk(x,y,scale=1,color='#a77657'):
    # isometric desk top parallelogram and legs
    s=f'<g transform="translate({x} {y}) scale({scale})">'
    s+=polygon([(0,11),(54,-17),(112,14),(58,44)],color)
    s+=polygon([(0,11),(58,44),(58,54),(0,22)],'#77543e')
    s+=polygon([(58,44),(112,14),(112,25),(58,54)],'#62483b')
    s+=rect(9,29,8,31,'#634637')+rect(95,32,9,22,'#634637')
    s+=polygon([(36,1),(64,-15),(96,2),(68,19)],'#253e52')
    s+=polygon([(43,-20),(75,-37),(100,-23),(68,-6)],'#122136')
    s+=polygon([(49,-20),(75,-34),(92,-24),(67,-11)],'#62b3bd',INK,1)
    s+=polygon([(55,3),(73,-5),(81,-1),(62,9)],'#d3a377',INK,1)
    s+='</g>'
    return s

def character(x,y,abbr,body='#507b99',state='idle',scale=1):
    cls='typing' if state=='active' else 'sleeping' if state=='idle' else 'worried' if state=='error' else ''
    s=f'<g transform="translate({x} {y}) scale({scale})" class="{cls}">'
    s+=polygon([(9,29),(25,22),(42,31),(26,41)],'#1a3048') # seat shadow
    s+=rect(10,26,29,27,body,INK,2,3)
    s+=rect(14,50,8,12,'#263b53')+rect(30,50,8,12,'#263b53')
    s+=rect(2,32,13,10,'#dcad7d',INK,1,2,klass='arm-left')
    s+=rect(37,31,13,10,'#dcad7d',INK,1,2,klass='arm-right')
    s+=polygon([(11,0),(40,0),(49,9),(42,33),(11,33),(3,20)],'#f2d5a3')
    s+=polygon([(11,2),(39,2),(46,12),(39,29),(12,29),(7,18)],'#283b52')
    s+=rect(16,8,21,13,'#f3dda9',INK,1,2)
    s+=txt(26,18,abbr,9,INK,anchor='middle')
    if state=='idle':
        s+=txt(44,-3,'Z',14,'#d7c0a1',klass='floatingz')+txt(56,-13,'z',11,'#d7c0a1',klass='floatingz2')
    if state=='active':
        s+=rect(49,1,5,5,MINT,klass='blink')
    if state=='error':
        s+=txt(50,0,'!',17,RED,klass='blink')
    s+='</g>'
    return s

def rack(x,y,label,on=True,active=False,error=False):
    s=f'<g transform="translate({x} {y})">'
    s+=polygon([(0,13),(35,-7),(64,9),(29,28)],'#233a53')
    s+=polygon([(0,13),(29,28),(29,116),(0,100)],'#101f33')
    s+=polygon([(29,28),(64,9),(64,98),(29,116)],'#15293f')
    s+=rect(4,23,22,74,'#203c52')
    for k in range(5):
        s+=rect(7,26+13*k,16,8,'#122636')
        s+=rect(18,28+13*k,4,3,(RED if error else MINT if on else '#536478'),klass='blink' if active else None)
    s+=txt(4,120,label,9,'#c8dfea')
    s+='</g>'
    return s

def room_title(x,y,number,title):
    return f'<g>'+rect(x,y,180,30,'#14283b','#3a6073',2,4)+rect(x+7,y+7,23,16,'#e6ad67')+txt(x+18,y+19,number,11,INK,anchor='middle')+txt(x+37,y+20,title,13,'#e3e8df')+'</g>'

def scene(mode):
    active=mode=='active'; alert=mode=='alert'
    svg=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 580" width="1080" height="580">']
    svg.append('''<style>
      * {shape-rendering: crispEdges} .blink{animation:blinker .85s steps(2,end) infinite;} .typing .arm-right{transform-box:fill-box; transform-origin:10% 0%;animation:type .34s steps(2,end) infinite;}
      .typing{animation:work .7s steps(2,end) infinite}.sleeping{animation:nap 3s ease-in-out infinite}.floatingz{animation:floatz 2.5s linear infinite}.floatingz2{animation:floatz 3s linear infinite}
      .worried{animation:work .6s steps(2,end) infinite}
      @keyframes blinker{50%{opacity:.25}} @keyframes type{50%{transform:translate(2px,2px)}} @keyframes work{50%{transform:translateY(-2px)}}
      @keyframes nap{50%{transform:translateY(2px)}} @keyframes floatz{50%{opacity:.25;transform:translateY(-7px)}}
    </style>''')
    svg.append(rect(0,0,1080,580,'#111f30'))
    # atmospheric pixels grid
    for x in range(25,1080,48):
        for y in range(28,580,48):
            svg.append(rect(x,y,2,2,'#294158'))
    svg.append(rect(24,20,1032,535,'#16283b','#3e5c73',2,12))
    svg.append(rect(43,38,994,37,'#21374c'))
    svg.append(txt(65,63,'CLOUD WORKSPACE // ESCRITÓRIO DIGITAL',16,'#cfe4e5'))
    svg.append(rect(852,46,12,12, MINT if active else RED if alert else '#8a9fb0',klass='blink' if active else None))
    svg.append(txt(876,58,'DEMONSTRAÇÃO',13,'#e8bc7d'))
    svg.append('''<g transform="translate(4 12)">''')
    # iso rooms
    svg.append(iso_floor(216,194,158,82,'#416478','#233c4f'))
    svg.append(walls(216,194,158,82,'#324f67','#36586c'))
    # wall decorations and shelves
    svg.append(polygon([(88,197),(154,163),(154,193),(88,228)],'#213b53'))
    svg.append(txt(95,196,'CEO',14,'#edd7aa'))
    svg.append(polygon([(226,147),(294,184),(294,214),(226,178)],'#244157'))
    svg.append(desk(154,260,.8,'#aa8260'))
    if active or alert:
        svg.append(character(252,249,'CW',body='#b9875b',state='active' if active else 'error',scale=.87))
    else:
        svg.append(txt(109,354,'SALA VAZIA',13,'#ced5d5'))
    svg.append(room_title(68,405,'01','SALA DO CHEFE'))
    # staff room
    svg.append(iso_floor(532,175,224,115,'#396979','#29465b'))
    svg.append(walls(532,175,224,115,'#285066','#326378'))
    svg.append(polygon([(344,248),(414,209),(414,251),(344,289)],'#1c384b'))
    svg.append(txt(360,244,'EQUIPE IA',10,'#c3e5e4'))
    # back window with lights
    svg.append(polygon([(567,126),(648,170),(648,203),(567,160)],'#1c3c54','#355a6a',2))
    svg.append(polygon([(580,146),(633,174),(633,188),(580,159)],'#80b9bf','#2d4d60',1))
    svg.append(desk(380,285,.73,'#b58560'))
    svg.append(desk(502,346,.73,'#b58560'))
    svg.append(desk(539,244,.66,'#b58560'))
    svg.append(desk(657,309,.65,'#b58560'))
    if mode=='idle':
        svg.append(character(447,280,'GPT','#436b8f','idle',.78))
        svg.append(character(567,342,'AG','#735e99','idle',.78))
        svg.append(character(605,239,'CX','#4f8787','idle',.72))
        # Claude closed, absent
    elif mode=='active':
        svg.append(character(447,280,'GPT','#436b8f','active',.78))
        svg.append(character(567,342,'AG','#735e99','active',.78))
        svg.append(character(605,239,'CX','#4f8787','idle',.72))
        svg.append(character(721,306,'CL','#b87964','active',.73))
    else:
        svg.append(character(447,280,'GPT','#436b8f','error',.78))
        svg.append(character(567,342,'AG','#735e99','idle',.78))
        svg.append(character(605,239,'CX','#4f8787','idle',.72))
    svg.append(room_title(337,487,'02','FUNCIONÁRIOS IA'))
    # server room
    svg.append(iso_floor(864,192,140,78,'#37566e','#243949'))
    svg.append(walls(864,192,140,78,'#294660','#2b4b65'))
    svg.append(polygon([(892,162),(966,204),(966,233),(892,191)],'#162a3e'))
    svg.append(txt(910,190,'NET',12,'#9fc5c6'))
    svg.append(rack(761,234,'DRIVE',on=active,active=active))
    svg.append(rack(835,243,'GITHUB',on=active,active=active))
    svg.append(rack(898,211,'HOST',on=active and not alert,active=active and not alert,error=alert))
    svg.append(room_title(797,427,'03','SERVIDORES'))
    svg.append('</g>')
    # global overlays
    svg.append(rect(44,515,200,24,'#162c40','#385970',1,3))
    svg.append(txt(55,532,{'idle':'○ PAUSADO / OCIOSO','active':'● TAREFA EM EXECUÇÃO','alert':'! ATENÇÃO NECESSÁRIA'}[mode],11,RED if alert else MINT if active else '#c1cad4'))
    svg.append(rect(813,516,212,24,'#162c40','#385970',1,3))
    svg.append(txt(824,532,'STATUS SIMULADO',12,'#e8bc7d'))
    svg.append('</svg>')
    return '\n'.join(svg)

for m in ('idle','active','alert'):
    f=p/f'office-{m}.svg';f.write_text(scene(m),encoding='utf-8')
    print(f, f.stat().st_size)