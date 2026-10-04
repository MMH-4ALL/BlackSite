"""Convert licensed environment sources to small browser GLBs and JPGs.

Usage: python3 tools/convert-map-assets.py /path/to/map-sources
Sources and licenses: assets/environment/LICENSE.md. Requires NumPy and Pillow.
No network requests. Original geometry is retained; flat-color OBJ surfaces get
world-sized planar UVs for ambientCG textures. Authored Hesco/warehouse UVs stay.
"""
import io, json, struct, sys, hashlib
from pathlib import Path
import numpy as np
from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[1] / 'assets/environment'
ROOT.mkdir(parents=True, exist_ok=True)

def jpg(source, destination, size=1024, saturation=.35):
    im = Image.open(source).convert('RGB'); im.thumbnail((size,size))
    im = ImageEnhance.Color(im).enhance(saturation)
    im.save(ROOT/destination, quality=88, optimize=True)

def save(j, binary, destination):
    binary += b'\0' * (-len(binary)%4)
    j['buffers']=[{'byteLength':len(binary)}]
    text=json.dumps(j,separators=(',',':')).encode();text+=b' '*(-len(text)%4)
    output=struct.pack('<III',0x46546c67,2,28+len(text)+len(binary))+struct.pack('<II',len(text),0x4e4f534a)+text+struct.pack('<II',len(binary),0x004e4942)+binary
    (ROOT/destination).write_bytes(output)
    print(destination,len(output),'bytes')

def obj(source, name, textured=False):
    pos=[];uv=[];norm=[];faces=[];material='surface'
    for line in source.read_text(errors='replace').splitlines():
        p=line.split()
        if not p:continue
        if p[0]=='v':pos.append(list(map(float,p[1:4])))
        elif p[0]=='vn':norm.append(list(map(float,p[1:4])))
        elif p[0]=='vt':uv.append(list(map(float,p[1:3])))
        elif p[0]=='usemtl':material=p[1]
        elif p[0]=='f':
            f=[]
            for v in p[1:]:
                parts=v.split('/');ids=[]
                for k,count in zip(parts,[len(pos),len(uv),len(norm)]):
                    i=int(k) if k else 0;ids.append(i-1 if i>0 else count+i if i<0 else -1)
                f.append((ids+[-1,-1])[:3])
            for i in range(1,len(f)-1):faces.append((material,[f[0],f[i],f[i+1]]))
    pos=np.array(pos);lo=pos.min(0);hi=pos.max(0);width=hi[0]-lo[0]
    # Unit X width, centered in X/Z and standing on Y=0.
    pos=(pos-np.array([(hi[0]+lo[0])/2,lo[1],(hi[2]+lo[2])/2]))/width
    j={'asset':{'version':'2.0','generator':'BlackSite environment converter','copyright':'Yughues CC0' if textured else 'Zsky CC-BY-4.0'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0,'name':name}],'meshes':[{'name':name,'primitives':[]}],'materials':[],'bufferViews':[],'accessors':[], 'extras':{'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sourceWidth':width,'license':'CC0-1.0' if textured else 'CC-BY-4.0'}}
    if textured:j.update(images=[{'uri':'hesco-color.jpg'},{'uri':'hesco-normal.jpg'}],textures=[{'source':0},{'source':1}])
    binary=bytearray()
    def acc(a,kind):
        a=np.array(a,dtype='<f4');binary.extend(b'\0'*(-len(binary)%4));view=len(j['bufferViews']);j['bufferViews'].append({'buffer':0,'byteOffset':len(binary),'byteLength':a.nbytes});binary.extend(a.tobytes());v={'bufferView':view,'componentType':5126,'count':len(a),'type':kind}
        if kind=='VEC3':v.update(min=a.min(0).tolist(),max=a.max(0).tolist())
        j['accessors'].append(v);return len(j['accessors'])-1
    buckets={}
    for mat,f in faces:
        xyz=pos[[v[0] for v in f]];n=np.cross(xyz[1]-xyz[0],xyz[2]-xyz[0]);length=np.linalg.norm(n)
        if length<1e-10:continue
        flat=n/length; b=buckets.setdefault(mat,[[],[],[]]);axis=int(np.argmax(abs(flat)))
        for vi,ti,ni in f:
            normal=np.array(norm[ni]) if ni>=0 else flat;normal=normal/max(np.linalg.norm(normal),1e-12)
            b[0].append(pos[vi]);b[1].append(normal)
            # Runtime repeats these normalized, planar coordinates by model width.
            b[2].append(uv[ti] if textured and ti>=0 else pos[vi][[2,1] if axis==0 else [0,2] if axis==1 else [0,1]])
    for mat,(p,n,t) in buckets.items():
        mi=len(j['materials']);metal=not any(x in mat.lower() for x in ['sand','wall','door','window','lightyellow'])
        m={'name':mat,'pbrMetallicRoughness':{'baseColorFactor':[.42,.46,.41,1] if metal else [.56,.54,.46,1],'metallicFactor':.3 if metal else 0,'roughnessFactor':.8}}
        if textured:m={'name':'Hesco sand and wire','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':.95},'normalTexture':{'index':1}}
        j['materials'].append(m);j['meshes'][0]['primitives'].append({'attributes':{'POSITION':acc(p,'VEC3'),'NORMAL':acc(n,'VEC3'),'TEXCOORD_0':acc(t,'VEC2')},'material':mi})
    save(j,binary,name+'.glb')

def warehouse(source, texture):
    raw=source.read_bytes();size=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+size]);b=bytearray(raw[28+size:])
    for mesh in j['meshes']:
        for p in mesh['primitives']:
            a=j['accessors'][p['attributes']['POSITION']];v=j['bufferViews'][a['bufferView']];xyz=np.ndarray((a['count'],3),dtype='<f4',buffer=b,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',12),4));lo=xyz.min(0);hi=xyz.max(0);xyz[:]=(xyz-np.array([(hi[0]+lo[0])/2,lo[1],(hi[2]+lo[2])/2]))/(hi-lo)[0];a.update(min=xyz.min(0).tolist(),max=xyz.max(0).tolist())
    # Source includes a scene placement 25m from its origin. Bake a clean origin.
    j['nodes']=[{'mesh':0,'name':'Warehouse'}];j['scenes']=[{'nodes':[0]}]
    j['materials'][0]['pbrMetallicRoughness'].update(metallicFactor=0,roughnessFactor=.9)
    j['images']=[{'uri':texture}];j['asset']['copyright']='32kda, CC0-1.0';j['extras']={'license':'CC0-1.0','source':'https://opengameart.org/content/warehouse-building-low-poly','sourceSha256':hashlib.sha256(raw).hexdigest()}
    # Drop embedded PNG buffer view; retain geometry views and truncate binary.
    used=max(v.get('byteOffset',0)+v['byteLength'] for v in j['bufferViews'][:4]);j['bufferViews']=j['bufferViews'][:4];save(j,b[:used],'warehouse.glb')

if __name__=='__main__':
    src=Path(sys.argv[1])
    for key in ['Concrete034','Asphalt010','Metal032']:
        for suffix,out in [('Color','color'),('NormalGL','normal'),('Roughness','roughness')]:
            jpg(src/key/(key+'_1K-JPG_'+suffix+'.jpg'),key.lower()+'-'+out+'.jpg',1024,1 if out!='color' else .4)
    jpg(src/'warehouse02/Set_01_DiffuseMap.png','warehouse-color.jpg',2048,.32)
    jpg(src/'hesco/diffuse.tga','hesco-color.jpg',1024,.35);jpg(src/'hesco/normal.tga','hesco-normal.jpg',1024,1)
    obj(src/'hesco/hesco_sand.obj','hesco',True)
    for name in ['Quarter','SniperTower','RadioStation','GateKeeperStation','GasTank','LightPole','Container_01','SandsSack']:
        obj(src/'military-base/Military_Base/OBJ'/(name+'.obj'),name.lower())
    warehouse(src/'warehouse02/warehouse02.glb','warehouse-color.jpg')
