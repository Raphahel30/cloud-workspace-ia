import {test,expect} from '@playwright/test';

for(const [width,height] of [[1280,800],[1440,900]])test(`real scene ${width}x${height}`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width,height});await page.goto('/');
  const host=page.getByTestId('office-renderer');
  await expect(host).toHaveAttribute('data-camera','overview');
  await expect(host).toHaveAttribute('data-floor03-pilot','layered');
  await expect(host.locator('canvas')).toHaveCount(1);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Ampliar andar/})).toHaveCount(5);
  await expect(page.getByRole('button',{name:/Ampliar andar 4: Infraestrutura \/ MCP \/ Testes/})).toBeVisible();
  const stageBounds=await page.locator('.pixi-stage').boundingBox();
  expect(stageBounds!.y+stageBounds!.height).toBeLessThanOrEqual(height);
  await page.screenshot({path:`docs/codex/screenshots/overview-${width}x${height}.png`});
  for(let i=1;i<=5;i++) {
    const button=page.getByRole('button',{name:new RegExp(`Ampliar andar ${i}:`)});
    await button.click();await expect(host).not.toHaveAttribute('data-camera','overview');
    await expect(page.getByRole('button',{name:/Voltar ao prédio/})).toBeVisible();
    await page.getByRole('button',{name:/Voltar ao prédio/}).click();
  }
  const focus=page.getByRole('button',{name:/Ampliar andar 3:/});
  await focus.focus();await page.keyboard.press('Enter');
  await expect(host).toHaveAttribute('data-camera','agents');
  await page.waitForTimeout(750);
  await page.screenshot({path:`docs/codex/screenshots/agents-zoom-${width}x${height}.png`});
  await page.keyboard.press('Escape');await expect(host).toHaveAttribute('data-camera','overview');
  await expect(focus).toBeFocused();
  await page.keyboard.press('5');await expect(host).toHaveAttribute('data-camera','servers');
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

test('demo states, motion, visibility, teardown and metrics',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:900});await page.goto('/');
  const host=page.getByTestId('office-renderer');
  await expect(host).toHaveAttribute('data-pose','unknown');
  await page.locator('#scene-state').selectOption('active');
  await expect(host).toHaveAttribute('data-pose','walk');
  await expect(host).toHaveAttribute('data-pose','type',{timeout:6000});
  const activeStart=Number(await host.getAttribute('data-frames'));const activeAt=Date.now();
  await page.waitForTimeout(1200);
  const activeMetrics={mode:'active',frames:Number(await host.getAttribute('data-frames'))-activeStart,durationMs:Date.now()-activeAt};
  await test.info().attach('measured-active',{body:JSON.stringify(activeMetrics),contentType:'application/json'});
  await page.getByRole('button',{name:'Ⅱ Pausar'}).click();
  await page.waitForTimeout(750);
  const pausedTime=await host.getAttribute('data-visual-time');
  const pausedFrames=await host.getAttribute('data-frames');
  await page.waitForTimeout(350);
  expect(await host.getAttribute('data-visual-time')).toBe(pausedTime);
  expect(await host.getAttribute('data-frames')).toBe(pausedFrames);
  await page.screenshot({path:'docs/codex/screenshots/demo-working-1440x900.png'});
  await page.getByRole('button',{name:'▶ Retomar'}).click();
  for(const [scene,pose] of [['waiting','wait'],['alert','error'],['idle','idle'],['unknown','unknown']]){
    await page.locator('#scene-state').selectOption(scene);await expect(host).toHaveAttribute('data-pose',pose);
  }
  await page.locator('#scene-state').selectOption('absent');
  await expect(host).toHaveAttribute('data-actors','0',{timeout:9000});
  await page.locator('#scene-state').selectOption('active');
  await page.getByRole('button',{name:'Movimento reduzido',exact:true}).click();
  await page.waitForTimeout(800);
  const reduced=await host.getAttribute('data-frames');await page.waitForTimeout(300);
  expect(await host.getAttribute('data-frames')).toBe(reduced);
  await host.evaluate(el=>(el as HTMLElement).style.display='none');
  await expect(host).toHaveAttribute('data-suspended','true');
  const hiddenFrames=await host.getAttribute('data-frames');
  await page.waitForTimeout(350);expect(await host.getAttribute('data-frames')).toBe(hiddenFrames);
  await host.evaluate(el=>(el as HTMLElement).style.display='');
  await expect(host).toHaveAttribute('data-suspended','false');
  // Chromium lifecycle suspension (does not fabricate an MCP event).
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Page.setWebLifecycleState',{state:'frozen'});
  await page.waitForTimeout(300);
  await cdp.send('Page.setWebLifecycleState',{state:'active'});
  await page.getByRole('button',{name:'Movimento reduzido',exact:true}).click();
  await page.locator('#scene-state').selectOption('idle');
  await page.waitForTimeout(800);
  const start=Number(await host.getAttribute('data-frames'));const started=Date.now();
  await page.waitForTimeout(2000);
  const measured={mode:'idle',frames:Number(await host.getAttribute('data-frames'))-start,durationMs:Date.now()-started,heap:await page.evaluate(()=>((performance as unknown as {memory?:{usedJSHeapSize:number}}).memory?.usedJSHeapSize??null))};
  await test.info().attach('measured-rendering',{body:JSON.stringify(measured),contentType:'application/json'});
  expect(measured.frames).toBeGreaterThan(0);expect(measured.frames).toBeLessThanOrEqual(23);
  await page.getByRole('button',{name:'Projetos',exact:true}).click();
  await expect(host).toHaveCount(0);
  await page.getByRole('button',{name:'Escritório',exact:true}).click();
  await expect(host.locator('canvas')).toHaveCount(1);
  await expect(host).toHaveAttribute('data-camera','overview');
  expect(errors).toEqual([]);
});

test('system reduced motion and notebook resize',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  const host=page.getByTestId('office-renderer');
  await expect(host).toHaveAttribute('data-fps','0');
  await expect(page.getByRole('button',{name:'Movimento reduzido',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.setViewportSize({width:1024,height:768});
  await page.getByRole('button',{name:/Ampliar andar 1:/}).click();
  await expect(host).toHaveAttribute('data-camera','reception');
  await page.setViewportSize({width:1440,height:900});
  await expect(host).toHaveAttribute('data-camera','reception');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});


test('floor geometry accepts pointer selection independently of React buttons',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await page.goto('/');
  const host=page.getByTestId('office-renderer');await expect(host).toHaveAttribute('data-camera','overview');
  const bounds=(await host.boundingBox())!;
  for(let i=0;i<5;i++) {
    const scale=Math.min(bounds.width/1100,bounds.height/800);
    // A clear glass panel on each floor, in the shared world coordinates.
    const x=bounds.x+bounds.width/2+(305-555)*scale;
    const y=bounds.y+bounds.height/2+(610-i*108-50-360)*scale;
    await page.mouse.click(x,y);
    await expect(host).not.toHaveAttribute('data-camera','overview');
    await page.getByRole('button',{name:/Voltar ao prédio/}).click();
    await page.waitForTimeout(700);
  }
});

test('individual DEMO states remain independent',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/');
 const host=page.getByTestId('office-renderer');await expect(host).toHaveAttribute('data-camera','overview');
 await page.getByLabel('DEMO individual Codex',{exact:true}).selectOption('working');
 await page.getByLabel('DEMO individual ChatGPT',{exact:true}).selectOption('waiting');
 await host.scrollIntoViewIfNeeded();
 await expect.poll(async()=>JSON.parse((await host.getAttribute('data-agent-states'))||'{}').codex?.state).toBe('working');
 await expect.poll(async()=>JSON.parse((await host.getAttribute('data-agent-states'))||'{}').chatgpt?.state).toBe('waiting');
 await expect.poll(async()=>JSON.parse((await host.getAttribute('data-agent-states'))||'{}').claude?.state).toBe('unknown');
 await page.screenshot({path:'docs/codex/screenshots/demo-independent-1440x900.png'});
});

test('renderer chunk failure shows accessible fallback',async({page})=>{
 await page.route('**/src/scene/OfficeRenderer.ts*',route=>route.abort());
 await page.goto('/');await expect(page.getByRole('alert')).toContainText('A cena WebGL não pôde iniciar');
 await page.getByRole('button',{name:/Ampliar andar 3:/}).click();
 await expect(page.getByRole('button',{name:/Voltar ao prédio/})).toBeVisible();
});

test('cached architecture keeps animated feet grounded through sitting, waiting and exit',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/');
 const host=page.getByTestId('office-renderer');
 await expect(host).toHaveAttribute('data-static-caches','8');
 const codex=async()=>JSON.parse((await host.getAttribute('data-actor-poses'))||'{}').codex;
 await expect.poll(codex).toBeTruthy();
 const initial=await codex();expect(initial.y).toBeLessThanOrEqual(-initial.x*.068-3);
 await page.locator('#scene-state').selectOption('active');
 await expect.poll(async()=>(await codex()).phase,{intervals:[30,60,80]}).toBe('sit');
 await expect.poll(async()=>(await codex()).pose).toBe('type');
 const working=await codex();await page.waitForTimeout(350);
 expect((await codex()).x).toBe(working.x);expect((await codex()).y).toBe(working.y);
 await page.getByRole('button',{name:/Ampliar andar 3:/}).click();
 await page.getByRole('button',{name:'Ⅱ Pausar'}).click();await page.waitForTimeout(750);
 await page.screenshot({path:'docs/codex/screenshots/premium-working-zoom-1440x900.png'});
 await page.setViewportSize({width:1280,height:800});await page.waitForTimeout(250);
 await page.screenshot({path:'docs/codex/screenshots/premium-working-zoom-1280x800.png'});
 await page.getByRole('button',{name:'▶ Retomar'}).click();
 await page.locator('#scene-state').selectOption('waiting');
 expect((await codex()).x).toBe(working.x);expect((await codex()).y).toBe(working.y);
 await page.locator('#scene-state').selectOption('absent');
 await expect.poll(async()=>(await codex()).pose,{intervals:[30,60,80]}).toBe('stand');
 await expect.poll(async()=>(await codex()).pose).toBe('walk');
 await expect(host).toHaveAttribute('data-fps','30');
 await expect.poll(async()=>(await codex()).visible,{timeout:9000}).toBe(false);
 await page.getByRole('button',{name:'Movimento reduzido',exact:true}).click();
 await page.locator('#scene-state').selectOption('unknown');
 await expect.poll(async()=>(await codex()).visible).toBe(true);
 await expect.poll(async()=>(await codex()).pose).toBe('unknown');
 await page.locator('#scene-state').selectOption('idle');
 await expect.poll(async()=>(await codex()).visible).toBe(true);
});
