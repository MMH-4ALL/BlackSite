#!/usr/bin/env python3
"""Adapt Pichuliru's CC0 Flat Guns GLBs; needs NumPy. See ATTRIBUTION.md.

Usage: python3 tools/convert-cc0-weapons.py /path/to/extracted/weapon-source
Keeps the author's geometry, separates rigid magazine/slide/bolt parts using
the existing rig weights, removes the unused rig/textures, and adds muted PBR.
"""
import hashlib
import json
import struct
import sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
PROFILES = {
 'ak47': ('east', 'Rifle_Assault_East', .96),
 'mp5': ('west', 'SMG_Full_West', .78),
 'c9': ('west', 'Pistol_Compact_West', .32),
 'h45': ('west', 'Pistol_Full_West', .38),
}

def convert(source_root, key):
 region, name, length = PROFILES[key]
 source = source_root / region / ('Flat Guns '+region.title()) / 'GLB' / (name+'.glb')
 raw = source.read_bytes(); size = struct.unpack_from('<I', raw, 12)[0]
 original = json.loads(raw[20:20+size]); data = raw[28+size:]
 def read(index):
  a=original['accessors'][index]; v=original['bufferViews'][a['bufferView']]
  dtype={5126:'<f4',5123:'<u2',5125:'<u4',5121:'u1'}[a['componentType']]
  width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]; item=np.dtype(dtype).itemsize
  return np.ndarray((a['count'],width), dtype=dtype, buffer=data, offset=v.get('byteOffset',0)+a.get('byteOffset',0), strides=(v.get('byteStride',width*item),item)).copy()
 primitives=original['meshes'][0]['primitives']
 all_positions=np.concatenate([read(p['attributes']['POSITION']) for p in primitives])
 center=(all_positions.min(0)+all_positions.max(0))/2
 scale=length/np.ptp(all_positions,axis=0).max()
 joints=original['skins'][0]['joints']; buckets={}
 for primitive in primitives:
  attrs=primitive['attributes']; p=(read(attrs['POSITION'])-center)*scale; n=read(attrs['NORMAL'])
  weights=read(attrs['WEIGHTS_0']); joint=read(attrs['JOINTS_0'])
  assert np.all(weights.max(axis=1)>.999), 'only rigid source parts are supported'
  dominant=joint[np.arange(len(joint)), weights.argmax(axis=1)]
  triangles=read(primitive['indices']).reshape(-1,3)
  material_name=original['materials'][primitive['material']].get('name','Steel')
  for triangle in triangles:
   names=[original['nodes'][joints[int(dominant[i])]]['name'] for i in triangle]
   assert len(set(names))==1, 'triangle crosses rig parts'
   part=names[0] if names[0] in ['Magazine','Slide','Bolt'] else 'Body'
   bucket=buckets.setdefault((part,material_name), {'p':[], 'n':[]})
   bucket['p'].extend(p[triangle]); bucket['n'].extend(n[triangle])
 result={'asset':{'version':'2.0','generator':'BlackSite CC0 weapon converter','copyright':'Pichuliru; CC0-1.0; adapted by BlackSite'},'scene':0,'scenes':[{'nodes':[]}],'nodes':[],'meshes':[],'materials':[],'accessors':[],'bufferViews':[], 'extras':{'source':'https://opengameart.org/content/cc0-flat-guns-'+region,'sourceSha256':hashlib.sha256(raw).hexdigest(),'license':'CC0-1.0','changes':'Original rigid geometry split by rig parts; normalized; muted PBR; unused rig and palette removed'}}
 binary=bytearray(); materials={}; parts={}
 def accessor(array,kind,target,bounds=False):
  binary.extend(b'\0'*(-len(binary)%4)); view=len(result['bufferViews'])
  result['bufferViews'].append({'buffer':0,'byteOffset':len(binary),'byteLength':array.nbytes,'target':target});binary.extend(array.tobytes())
  value={'bufferView':view,'componentType':5126,'count':len(array),'type':kind}
  if bounds:value.update(min=array.min(0).tolist(),max=array.max(0).tolist())
  result['accessors'].append(value);return len(result['accessors'])-1
 for (part,name),bucket in buckets.items():
  if name not in materials:
   wood='Brown' in name; polymer='Black' in name
   color=[.12,.105,.085,1] if wood else [.07,.082,.085,1] if polymer else [.18,.20,.21,1]
   if 'White' in name:color=[.30,.32,.30,1]
   materials[name]=len(result['materials']);result['materials'].append({'name':name,'pbrMetallicRoughness':{'baseColorFactor':color,'metallicFactor':.08 if wood or polymer else .75,'roughnessFactor':.72 if wood or polymer else .43}})
  p=np.array(bucket['p'],dtype='<f4');n=np.array(bucket['n'],dtype='<f4');n/=np.maximum(np.linalg.norm(n,axis=1,keepdims=True),1e-9)
  primitive={'attributes':{'POSITION':accessor(p,'VEC3',34962,True),'NORMAL':accessor(n,'VEC3',34962)},'material':materials[name]}
  parts.setdefault(part,[]).append(primitive)
 for part,primitives in parts.items():
  index=len(result['meshes']);result['meshes'].append({'name':part,'primitives':primitives});result['nodes'].append({'name':part,'mesh':index});result['scenes'][0]['nodes'].append(index)
 binary.extend(b'\0'*(-len(binary)%4));result['buffers']=[{'byteLength':len(binary)}]
 encoded=json.dumps(result,separators=(',',':')).encode();encoded+=b' '*(-len(encoded)%4)
 output=struct.pack('<III',0x46546c67,2,28+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary
 (ROOT/'assets'/(key+'.glb')).write_bytes(output)
 print(key,len(output),'bytes',sum(len(b['p'])//3 for b in buckets.values()),'triangles',list(parts))

if __name__=='__main__':
 for key in PROFILES:convert(Path(sys.argv[1]),key)
