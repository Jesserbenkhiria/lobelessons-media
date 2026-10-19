import sys
R='/home/claude/lobelessons-media/characters/'
def sheet(name,title,accent,sub,friend_svg,out):
    s={p:open(f'{R}{name}/svg/{name}_{p}.svg').read() for p in ['explain','idea','shock','approve','calm']}
    poses=''.join(f'<div class="p">{s[p]}</div>' for p in ['idea','shock','approve','calm'])
    html=f'''<html><head><style>body{{margin:0;width:1400px;background:#F5F1EA;font-family:Inter,sans-serif;color:#111}}
.top{{display:flex;gap:40px;padding:60px 70px 10px;align-items:flex-end}} .big{{width:420px}} .lb{{width:330px}}
h1{{font:800 72px 'Inter Display',Inter;letter-spacing:-.03em;margin:0}} h1 span{{color:{accent}}} .sub{{font:500 28px Inter;color:#8a8478;margin-top:10px}}
.pill{{display:inline-block;background:#111;color:#F5C84C;font:700 22px Inter;padding:10px 22px;border-radius:30px;margin-bottom:18px}}
.row{{display:flex;padding:0 50px 50px}} .p{{width:325px}} .cap{{text-align:center;font:600 22px Inter;color:#8a8478}}</style></head><body>
<div class="top"><div class="big">{s['explain']}</div><div><div class="pill">LOBE &amp; FRIENDS · NEW CHARACTER</div><h1>{title}</h1><div class="sub">{sub}</div></div><div class="lb">{friend_svg}<div class="cap">his friend Lobe</div></div></div>
<div class="row">{poses}</div></body></html>'''
    open(out,'w').write(html)
lobe=open('/home/claude/lobelessons-media/pipeline/assets/mascot/brain_explain.svg').read()
sheet('lumi','<span>Lumi</span>','#D9A93A','The lightbulb who teaches creators:<br>hooks, lighting, editing, growth.',lobe,R+'lumi/sheet.html')
sheet('nimbus','<span>Nimbus</span>','#6F9FD6','The calm cloud for a lighter mind:<br>sleep, stress, small calm habits.',lobe,R+'nimbus/sheet.html')
# family lineup
fam=[('/home/claude/lobelessons-media/pipeline/assets/mascot/brain_explain.svg','Lobe','Books'),(R+'drbeat/svg/drbeat_explain.svg','Dr. Beat','Body & science'),(R+'lumi/svg/lumi_explain.svg','Lumi','Creator tips'),(R+'nimbus/svg/nimbus_calm.svg','Nimbus','Calm mind')]
cells=''.join(f'<div class="f">{open(f).read()}<h2>{n}</h2><p>{d}</p></div>' for f,n,d in fam)
open(R+'family.html','w').write(f'''<html><head><style>body{{margin:0;width:1400px;background:#F5F1EA;font-family:Inter,sans-serif}}
h1{{font:800 76px 'Inter Display',Inter;letter-spacing:-.03em;text-align:center;margin:56px 0 0}} h1 span{{color:#C9A24B}} .s{{text-align:center;font:500 28px Inter;color:#8a8478;margin-top:8px}}
.row{{display:flex;justify-content:center;padding:20px 40px 50px}} .f{{width:330px;text-align:center}} h2{{font:800 40px 'Inter Display',Inter;margin:0}} p{{font:600 22px Inter;color:#8a8478;margin:6px 0 0}}</style></head><body>
<h1>Lobe <span>&amp;</span> Friends</h1><div class="s">One style. Four friends. One lesson a day.</div><div class="row">{cells}</div></body></html>''')
