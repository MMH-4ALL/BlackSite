"""Generate small vector previews from the actual bundled meshes (NumPy only).
Usage: python3 tools/weapon-previews.py
No textures, remote images, external software, or generated artwork is used.
"""
import json
import struct
from collections import defaultdict
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'assets/ui';OUTPUT.mkdir(exist_ok=True)

def preview(name,source):
    data=(ROOT/'assets'/source).read_bytes();jlen=struct.unpack_from('<I',data,12)[0]
    gltf=json.loads(data[20:20+jlen]);binary=data[28+jlen:]
    def accessor(index):
        a=gltf['accessors'][index];v=gltf['bufferViews'][a['bufferView']]
        dtype={5126:'<f4',5123:'<u2',5125:'<u4',5120:'i1',5121:'u1',5122:'<i2'}[a['componentType']]
        n={'SCALAR':1,'VEC3':3,'VEC2':2}[a['type']];item=np.dtype(dtype).itemsize
        array=np.ndarray((a['count'],n),dtype=dtype,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',n*item),item)).copy()
        return array
    triangles=[];colors=[]
    def visit(index,parent):
        node=gltf['nodes'][index];local=np.eye(4)
        if 'matrix' in node:local=np.array(node['matrix']).reshape(4,4).T
        else:
            x,y,z,w=node.get('rotation',[0,0,0,1])
            local[:3,:3]=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])@np.diag(node.get('scale',[1,1,1]))
            local[:3,3]=node.get('translation',[0,0,0])
        world=parent@local
        if 'mesh' in node:
            for primitive in gltf['meshes'][node['mesh']]['primitives']:
                p=accessor(primitive['attributes']['POSITION']);p=(np.c_[p,np.ones(len(p))]@world.T)[:,:3]
                if name=='pistol':p[:,[0,2]]*=-1
                ix=accessor(primitive['indices']).ravel() if 'indices' in primitive else np.arange(len(p))
                xyz=p[ix.reshape(-1,3)];triangles.extend(xyz)
                material=gltf.get('materials',[{}])[primitive.get('material',0)]
                color=material.get('pbrMetallicRoughness',{}).get('baseColorFactor',[.2,.23,.21,1])[:3]
                if name=='pistol':color=[.16,.20,.18]
                colors.extend([color]*len(xyz))
        for child in node.get('children',[]):visit(child,world)
    for node in gltf['scenes'][gltf.get('scene',0)]['nodes']:visit(node,np.eye(4))
    xyz=np.array(triangles);color=np.array(colors)
    cross=np.cross(xyz[:,1]-xyz[:,0],xyz[:,2]-xyz[:,0]);n=cross/np.maximum(np.linalg.norm(cross,axis=1,keepdims=True),1e-9)
    horizontal=np.array([.24,0,-.97]);vertical=np.array([-.14,.99,-.035]);depth=np.cross(horizontal,vertical)
    xy=np.stack((xyz@horizontal,-xyz@vertical),axis=-1);flat=xy.reshape(-1,2);lo=flat.min(0);hi=flat.max(0)
    scale=min(560/(hi[0]-lo[0]),175/(hi[1]-lo[1]));xy=(xy-(lo+hi)/2)*scale+[300,110]
    a=xy[:,1]-xy[:,0];b=xy[:,2]-xy[:,0];area=np.abs(a[:,0]*b[:,1]-a[:,1]*b[:,0])/2
    visible=(n@depth>0)&(area>.23);z=(xyz@depth).mean(1)
    light=np.array([.55,.80,.25]);light/=np.linalg.norm(light)
    rgb=np.clip((np.power(color,.45)*(.5+.5*np.maximum(0,n@light))[:,None])*255,0,255).astype(int)
    # Depth layers preserve overlap while grouping adjacent faces into SVG paths.
    layers=defaultdict(list);span=max(1e-6,np.ptp(z));minz=z.min()
    for i in np.flatnonzero(visible):
        layer=int((z[i]-minz)/span*64);shade=tuple((rgb[i]//12*12).tolist());pts=np.round(xy[i],1)
        layers[(layer,shade)].append('M'+'L'.join(','.join(f'{v:g}' for v in p) for p in pts)+'Z')
    body=''.join(f'<path fill="rgb{shade}" stroke="rgb{shade}" stroke-width=".35" stroke-linejoin="round" d="{"".join(paths)}"/>' for (layer,shade),paths in sorted(layers.items()))
    # SVG uses its native sRGB fills; the game uses the full PBR materials.
    text='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 220" role="img"><title>'+name.upper()+' model preview</title>'+body+'</svg>'
    (OUTPUT/(name+'.svg')).write_text(text)
    print(name,len(text),int(visible.sum()),'visible faces')

for name,source in [('m4a1','m4a1.glb'),('sv98','sv98.glb'),('m82','m82.glb'),('pistol','blaster-b.glb')]:preview(name,source)
