// SVG 파일을 투명 바탕 PNG로 그린다(4배로 그려서 나중에 줄인다).
const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{
  const [,, dir, ...names] = process.argv;
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:400,height:400},deviceScaleFactor:4});
  for(const n of names){
    const svg=fs.readFileSync(`${dir}/${n}.svg`,'utf8').replace('<svg ','<svg width="400" height="400" style="display:block" ');
    await p.setContent(`<!doctype html><body style="margin:0;background:transparent">${svg}</body>`);
    await p.waitForTimeout(300);
    await p.screenshot({path:`${dir}/${n}@4x.png`,omitBackground:true,clip:{x:0,y:0,width:400,height:400}});
  }
  await b.close();
})();
