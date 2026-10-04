"""Software rasterization of actual game geometry, UVs and downloaded textures.

BLACKSITE_MAP_EXPORT=/tmp/maps.json node tools/validate.mjs
python3 tools/environment-preview.py /tmp/maps.json assets/environment
This preview uses simple CPU lighting; it is not a WebGL gameplay capture.
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
data=json.loads(Path(sys.argv[1]).read_text());out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
textures={};geometries=[]
for g in data['geometries']:
    p=np.array(g['positions']);n=np.array(g['normals']) if g['normals'] else np.zeros_like(p)
    geometries.append((np.c_[p,np.ones(len(p))],n,np.array(g['uv']) if g['uv'] else np.zeros((len(p),2)),np.array(g['indices']).reshape(-1,3)))
def render(m,camera,W,H):
    sky=np.array(m['sky'])**(1/2.2);img=np.zeros((H,W,3))+sky;zbuffer=np.full((H,W),np.inf)
    view=np.array(camera['view']).reshape(4,4).T;projection=np.array(camera['projection']).reshape(4,4).T
    light=np.array([-.45,.82,.33]);light/=np.linalg.norm(light)
    for mesh in m['meshes']:
        p,n,uv,ix=geometries[mesh['geometry']];matrix=np.array(mesh['matrix']).reshape(4,4).T
        clip=p@matrix.T@view.T@projection.T;valid=clip[:,3]>.05;ndc=clip[:,:3]/np.maximum(.001,clip[:,3,None]);xy=np.c_[(ndc[:,0]+1)*W/2,(1-ndc[:,1])*H/2]
        normal=n@np.linalg.inv(matrix[:3,:3]);normal/=np.maximum(.001,np.linalg.norm(normal,axis=1,keepdims=True));shade=.5+.65*np.maximum(0,normal@light)
        tex=None
        if mesh.get('texture'):
            path=mesh['texture']
            if path not in textures:textures[path]=np.asarray(Image.open(ROOT/path).convert('RGB'),dtype=float)/255
            tex=textures[path]
        color=np.array(mesh['color'],dtype=float);repeat=np.array(mesh['repeat']);uv=uv*repeat
        triangles=[]
        for ids in ix:
            q=clip[ids];attrs=np.c_[uv[ids],shade[ids]]
            if not np.any(q[:,3]>.05):continue
            if not np.all(q[:,3]>.05):
                polygon=[]
                for k in range(3):
                    a=q[k];b=q[(k+1)%3];aa=attrs[k];bb=attrs[(k+1)%3];inside=a[3]>=.05;other=b[3]>=.05
                    if inside:polygon.append((a,aa))
                    if inside!=other:
                        t=(.05-a[3])/(b[3]-a[3]);polygon.append((a+(b-a)*t,aa+(bb-aa)*t))
                for k in range(1,len(polygon)-1):triangles.append(([polygon[0][0],polygon[k][0],polygon[k+1][0]],[polygon[0][1],polygon[k][1],polygon[k+1][1]]))
            else:triangles.append((q,attrs))
        for q,attrs in triangles:
            q=np.array(q);attrs=np.array(attrs);nd=q[:,:3]/q[:,3,None];t=np.c_[(nd[:,0]+1)*W/2,(1-nd[:,1])*H/2];x0=max(0,int(t[:,0].min()));x1=min(W-1,int(t[:,0].max()+1));y0=max(0,int(t[:,1].min()));y1=min(H-1,int(t[:,1].max()+1))
            if x0>x1 or y0>y1:continue
            a,b,c=t;den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
            if abs(den)<1e-6:continue
            yy,xx=np.mgrid[y0:y1+1,x0:x1+1];xx=xx+.5;yy=yy+.5
            u=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den
            v=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den;w=1-u-v
            depth=u*nd[0,2]+v*nd[1,2]+w*nd[2,2]
            sub=zbuffer[y0:y1+1,x0:x1+1];mask=(u>=-1e-5)&(v>=-1e-5)&(w>=-1e-5)&(depth<sub)&(depth>=-1)&(depth<=1)
            if not mask.any():continue
            weights=np.stack([u[mask],v[mask],w[mask]],1)/q[:,3];weights/=weights.sum(1,keepdims=True)
            rgb=np.tile(color,(len(weights),1));brightness=weights@attrs[:,2]
            if tex is not None:
                coords=weights@attrs[:,:2];coords%=1
                if mesh['flipY']:coords[:,1]=1-coords[:,1]
                tx=np.clip((coords[:,0]*tex.shape[1]).astype(int),0,tex.shape[1]-1);ty=np.clip((coords[:,1]*tex.shape[0]).astype(int),0,tex.shape[0]-1)
                rgb*=tex[ty,tx]**2.2
            rgb=np.clip(rgb*brightness[:,None],0,1)**(1/2.2);img[y0:y1+1,x0:x1+1][mask]=rgb;sub[mask]=depth[mask]
    return Image.fromarray((img*255).astype('uint8'))
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',12)
sheet=Image.new('RGB',(1600,3*570+72),(19,26,23));d=ImageDraw.Draw(sheet);d.text((22,18),'BLACKSITE / TEXTURED MILITARY ENVIRONMENTS',font=font,fill=(208,219,195))
for i,m in enumerate(data['maps']):
    overview=render(m,m['overview'],840,600);overview.save(out/(m['key']+'-scene.jpg'),quality=89)
    street=render(m,m['street'],960,540);street.save(out/(m['key']+'-street.jpg'),quality=89)
    y=62+i*570;sheet.paste(overview.resize((700,500)),(12,y));sheet.paste(street.resize((864,486)),(724,y+7));d.text((24,y+514),m['name'].upper(),font=font,fill=(206,217,194));d.text((725,y+516),'Actual game meshes / UVs / bundled textures · CPU lighting preview',font=small,fill=(151,168,149))
    print('Rendered',m['key'],flush=True)
sheet.save(out/'environment-overview.jpg',quality=90)
