"""Single-file offline edition. No web requests are necessary for any core feature."""
import base64,json,re,html
from pathlib import Path
d=Path(__file__).resolve().parents[1]/'docs'
def data(f,m=None):
 ext=f.suffix;m=m or {'.ttf':'font/ttf','.svg':'image/svg+xml','.png':'image/png','.csv':'text/csv'}[ext]
 return 'data:'+m+';base64,'+base64.b64encode(f.read_bytes()).decode()
p=(d/'index.html').read_text()
style=(d/'style.css').read_text()
style=re.sub(r'url\((assets/[^)]+)\)',lambda m:'url('+data(d/m[1])+')',style)
p=p.replace('<link rel="stylesheet" href="style.css">','<style>'+style+'</style>').replace('href="assets/brand.svg"','href="'+data(d/'assets/brand.svg')+'"')
p=re.sub(r'<link rel="preload"[^>]*>','',p)
proofs={f.stem:data(f) for f in (d/'assets/evidence').glob('*.png')}
csvs={k:{'name':name,'uri':data(d/'assets/data'/name)} for k,name in [('raw','quarterly-district-sales.csv'),('pairs','matched-pairs.csv')]}
offline='<script>window.SEOUL_OFFLINE=true;window.SeoulOfflineEvidence='+json.dumps(proofs,separators=(',',':'))+';window.SeoulOfflineCSVs='+json.dumps(csvs,separators=(',',':'))+';</script>'
p=p.replace('<script src="assets/data/snapshot.js">',offline+'<script src="assets/data/snapshot.js">')
def inline(m):
 script=(d/m[1]).read_text().replace('</script','<\\/script')
 return '<script>\n'+script+'\n</script>'
p=re.sub(r'<script src="([^"]+)"></script>',inline,p)
p=p.replace('<a id="portable" href="Seoul_Signal_Offline.html" download>Offline edition</a>','<span>Offline edition</span>')
licenses='\n\n'.join((d/'assets/licenses'/f).read_text() for f in ['manrope-OFL.txt','grotesk-OFL.txt','map-apache-2.txt'])+'\n\n'+(d/'assets/map-sources.txt').read_text()
p=p.replace('</body>','<script id="bundled-licenses" type="text/plain">'+licenses.replace('</script','&lt;/script')+'</script>\n</body>')
out=d/'Seoul_Signal_Offline.html';out.write_text(p)
print('Portable:',out.stat().st_size,'bytes; embeds tables, 25 map boundaries, fonts, evidence, and CSV exports.')
