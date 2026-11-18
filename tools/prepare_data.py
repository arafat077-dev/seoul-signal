"""Build the public aggregate snapshot from the project kit, never individual records."""
import sys,csv,json,shutil
from pathlib import Path
from collections import defaultdict
from itertools import product
base=Path(__file__).resolve().parent.parent
source=Path(sys.argv[1]);out=base/'docs/assets/data'
def read(p):
 with p.open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
Q=read(source/'Power_BI/dashboard_district_detail.csv');R=read(source/'Analysis/electronics_data_corrected.csv');M=read(source/'Analysis/H1_2026_vs_2025_matched_pairs.csv')
names=sorted({r['district'] for r in Q});cats=['Computers and Peripherals','Home Appliances','Mobile Phones'];qr=sorted({int(r['quarter_code']) for r in Q})
korean={r['District_Name_English']:r['District_Name_Korean'] for r in R}
rows=[[int(r['quarter_code']),names.index(r['district']),cats.index(r['category']),int(r['total_sales_krw']),int(r['total_transactions'])] for r in Q]
assert len(names)==25 and len(rows)==len({tuple(r[:3]) for r in rows})==1637 and len(qr)==22
lookup={(q,d,c):(s,t) for q,d,c,s,t in rows}
p={}
for d,c in product(range(25),range(3)):
 try:a,b,e,f=(lookup[(v,d,c)] for v in (20251,20252,20261,20262))
 except KeyError:continue
 p[names[d],cats[c]]=(e[0]+f[0]-a[0]-b[0],e[0]>a[0] and f[0]>b[0] and e[1]+f[1]>a[1]+b[1])
assert len(p)==len(M)==74 and sum(g for g,ok in p.values())==-40215424559 and sum(ok for g,ok in p.values())==11
assert all(p[r['district'],r['category']]==(int(r['sales_gain_krw']),r['qualifies'].lower()=='true') for r in M)
data=dict(districts=names,korean=korean,quarters=qr,rows=rows,cats=cats)
out.mkdir(parents=True,exist_ok=True);(out/'snapshot.js').write_text('globalThis.SEOUL_DATA='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
shutil.copyfile(source/'Power_BI/dashboard_district_detail.csv',out/'quarterly-district-sales.csv');shutil.copyfile(source/'Analysis/H1_2026_vs_2025_matched_pairs.csv',out/'matched-pairs.csv')
print('Snapshot:',len(rows),'quarterly district-category records;',len(p),'matched against original SQL.')
