#!/usr/bin/env python3
from pathlib import Path
from html.parser import HTMLParser
import hashlib,json,re,sys
ROOT=Path(__file__).resolve().parent
REPOS=['fasting-clock','water-tracker','food-wheel','image-compressor','bingo-generator','vocabulary-trainer','travel-guide','kids-reward-board','group-randomizer']
REQUIRED=['index.html','README.md','DESIGN.md','tests/contract.json','evidence/RED.md','evidence/GREEN.md','evidence/VISUAL_REVIEW.md']
REMOTE=re.compile(r'''(?:src|href)\s*=\s*["']https?://''',re.I)
LOCAL_SCRIPT=re.compile(r'''<script[^>]+src\s*=\s*["']([^"']+)["']''',re.I)
results=[];errors=[]
for repo in REPOS:
 d=ROOT/repo;entry={'repo':repo,'files':{},'checks':{}}
 for rel in REQUIRED:
  p=d/rel;ok=p.is_file();entry['files'][rel]=ok
  if not ok:errors.append(f'{repo}: missing {rel}')
 html=d/'index.html'
 if html.is_file():
  text=html.read_text(errors='replace')
  implementation=[text]
  for src in LOCAL_SCRIPT.findall(text):
   script=(d/src.split('?',1)[0].split('#',1)[0]).resolve()
   if script.is_relative_to(d.resolve()) and script.is_file():implementation.append(script.read_text(errors='replace'))
  implementation_text='\n'.join(implementation)
  entry['checks']['no_remote_assets']=not bool(REMOTE.search(text));entry['checks']['has_viewport']='name="viewport"' in text or "name='viewport'" in text;entry['checks']['has_reset']=bool(re.search(r'重設|清除|reset',text,re.I));entry['checks']['has_local_storage']='localStorage' in implementation_text;entry['sha256']=hashlib.sha256(html.read_bytes()).hexdigest()
  for k,v in entry['checks'].items():
   if not v:errors.append(f'{repo}: failed {k}')
 if (d/'tests/contract.json').is_file():
  try:json.loads((d/'tests/contract.json').read_text())
  except Exception as e:errors.append(f'{repo}: invalid contract.json: {e}')
 results.append(entry)
hub=(ROOT/'index.html').read_text(errors='replace') if (ROOT/'index.html').is_file() else ''
for repo in REPOS:
 if f'{repo}/index.html' not in hub:errors.append(f'hub: missing link {repo}')
out={'status':'PASS' if not errors else 'FAIL','repo_count':len(REPOS),'results':results,'errors':errors}
(ROOT/'STATIC_VERIFICATION.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':out['status'],'repo_count':len(REPOS),'error_count':len(errors),'errors':errors},ensure_ascii=False,indent=2))
raise SystemExit(0 if not errors else 1)
