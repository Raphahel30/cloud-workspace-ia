import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto('http://127.0.0.1:1420');
const host=page.getByTestId('office-renderer');await page.waitForFunction(()=>document.querySelector('.pixi-host')?.dataset.frames);
const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
const measurements=[];
for(const [mode,duration] of [['active',5000],['idle',3000]]){
 await page.locator('#scene-state').selectOption(mode);
 if(mode==='active')await page.waitForFunction(()=>document.querySelector('.pixi-host')?.dataset.pose==='type');
 await page.waitForTimeout(800);
 const before=await cdp.send('Performance.getMetrics');const t=Date.now(),frames=Number(await host.getAttribute('data-frames'));
 await page.waitForTimeout(duration);
 const after=await cdp.send('Performance.getMetrics');const get=(m,name)=>m.metrics.find(x=>x.name===name)?.value;
 const elapsed=Date.now()-t,count=Number(await host.getAttribute('data-frames'))-frames;
 measurements.push({mode,frames:count,durationMs:elapsed,effectiveFps:count/(elapsed/1000),mainThreadTaskSeconds:get(after,'TaskDuration')-get(before,'TaskDuration'),heapBytes:get(after,'JSHeapUsedSize'),staticCaches:Number(await host.getAttribute('data-static-caches'))});
}
await browser.close();await writeFile(process.argv[2]||'docs/codex/benchmark-isolado.json',JSON.stringify(measurements,null,2));console.log(JSON.stringify(measurements));
