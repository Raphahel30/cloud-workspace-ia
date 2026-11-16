from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageOps,ImageDraw
import io
out=Path('/mnt/data')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu-sandbox'])
    page=browser.new_page(viewport={'width':1600,'height':1060},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda err: errors.append(str(err)))
    page.goto('file:///mnt/data/cloud-workspace-ia/preview/index.html',wait_until='load')
    page.wait_for_timeout(600)
    page.screenshot(path=str(out/'CLOUD_WORKSPACE_TELA_PRINCIPAL_REPOUSO.png'),full_page=True)
    page.locator('#scene-state').select_option('active')
    page.wait_for_timeout(600)
    page.screenshot(path=str(out/'CLOUD_WORKSPACE_TELA_PRINCIPAL_TRABALHANDO.png'),full_page=True)
    page.locator('#scene-state').select_option('alert')
    page.wait_for_timeout(300)
    page.screenshot(path=str(out/'CLOUD_WORKSPACE_TELA_PRINCIPAL_ALERTA.png'),full_page=True)
    page.locator('#scene-state').select_option('active')
    page.wait_for_timeout(500)
    bbox=page.locator('.office-stage').bounding_box()
    print('bbox',bbox,'page errors',errors,'title',page.title())
    frames=[]
    for i in range(8):
        data=page.screenshot(type='png',clip={'x':bbox['x'],'y':bbox['y'],'width':bbox['width'],'height':bbox['height']})
        im=Image.open(io.BytesIO(data)).convert('P',palette=Image.Palette.ADAPTIVE,colors=144)
        frames.append(im)
        page.wait_for_timeout(220)
    frames[0].save(out/'CLOUD_WORKSPACE_ANIMACAO_ESCRITORIO.gif',save_all=True,append_images=frames[1:],duration=220,loop=0,optimize=True,disposal=2)
    print('frames',len(frames),'gif bytes',(out/'CLOUD_WORKSPACE_ANIMACAO_ESCRITORIO.gif').stat().st_size)
    browser.close()