"""CPU projection of actual game geometry/transforms; not a GPU gameplay capture.
BLACKSITE_ANIMATION_EXPORT=/tmp/motion.json node tools/validate.mjs
python3 tools/animation-preview.py /tmp/motion.json /tmp/motion.gif
Requires NumPy and Pillow for this optional visual check only.
"""
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

data=json.loads(Path(sys.argv[1]).read_text())
W,H=480,270
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',10)
geometries=[]
for g in data['geometries']:
    p=np.array(g['positions']);n=np.array(g['normals']);ix=np.array(g['indices']).reshape(-1,3)
    geometries.append((np.c_[p,np.ones(len(p))],n,ix))

def project(meshes,camera):
    image=Image.new('RGB',(W,H),(32,40,37));draw=ImageDraw.Draw(image)
    view=np.array(camera['view']).reshape(4,4).T
    projection=np.array(camera['projection']).reshape(4,4).T
    triangles=[]
    light=np.array([-.4,.75,-.52]);light/=np.linalg.norm(light)
    for mesh in meshes:
        p,n,ix=geometries[mesh['geometry']]
        matrix=np.array(mesh['matrix']).reshape(4,4).T
        clip=p@matrix.T@view.T@projection.T
        safe=clip[:,3]>.01
        ndc=clip[:,:3]/np.maximum(.01,clip[:,3,None])
        xy=np.c_[(ndc[:,0]+1)*W/2,(1-ndc[:,1])*H/2]
        normal=n@np.linalg.inv(matrix[:3,:3]);normal/=np.maximum(.001,np.linalg.norm(normal,axis=1,keepdims=True))
        shade=.33+.67*np.maximum(0,normal@light)
        valid=np.all(safe[ix],axis=1)
        points=xy[ix]
        valid&=(points[:,:,0].max(axis=1)>=0)&(points[:,:,0].min(axis=1)<=W)&(points[:,:,1].max(axis=1)>=0)&(points[:,:,1].min(axis=1)<=H)
        color=np.array(mesh['color'])
        for ids,poly,depth in zip(ix[valid],points[valid],ndc[ix[valid],2].mean(axis=1)):
            rgb=tuple((np.clip(color*shade[ids].mean(),0,1)**(1/2.2)*255).astype(int))
            triangles.append((depth,poly,rgb))
    triangles.sort(key=lambda t:-t[0])
    for _,poly,color in triangles:draw.polygon([tuple(v) for v in poly],fill=color)
    return image

frames=[]
for i,frame in enumerate(data['frames']):
    canvas=Image.new('RGB',(W*2+36,H+88),(17,23,21));draw=ImageDraw.Draw(canvas)
    draw.text((14,12),'BLACKSITE / MOTION & HANDLING',font=font,fill=(213,218,200))
    draw.text((14,34),'MP5 / STAGED RELOAD',font=small,fill=(173,186,153))
    draw.text((W+24,34),'WARDEN / ARTICULATED GAIT',font=small,fill=(173,186,153))
    canvas.paste(project(frame['weapon'],frame['weaponCamera']),(12,53))
    canvas.paste(project(frame['bot'],frame['botCamera']),(W+24,53))
    draw.text((14,H+64),'Actual bundled meshes and animation transforms / CPU preview; GPU lighting is not shown.',font=small,fill=(144,153,142))
    frames.append(canvas)
frames[0].save(sys.argv[2],save_all=True,append_images=frames[1:],duration=150,loop=0,optimize=False)
sheet=Image.new('RGB',(frames[0].width*2,frames[0].height*2))
for index,f in enumerate([0,4,8,14]):sheet.paste(frames[f],((index%2)*frames[0].width,(index//2)*frames[0].height))
sheet.save(str(Path(sys.argv[2]).with_suffix('.png')))
print(f'Saved {len(frames)} actual-model frames: {sys.argv[2]}')
