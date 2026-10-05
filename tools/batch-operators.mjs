// Development-only postprocess for an already simplified, retargeted operator.
// Every part must use the same skin, material and local transform. No bones or
// animation tracks are edited. Refuse incompatible source rigs.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';
const require=createRequire(process.env.BLACKSITE_BUILD_MODULES+'/package.json');
const {NodeIO}=await import(pathToFileURL(require.resolve('@gltf-transform/core')));
const {joinPrimitives,prune}=await import(pathToFileURL(require.resolve('@gltf-transform/functions')));
const [input,output]=process.argv.slice(2),io=new NodeIO(),document=await io.read(input),root=document.getRoot();
const nodes=root.listNodes().filter(n=>n.getMesh()&&n.getSkin()),base=nodes.find(n=>n.getName()==='SuperHero_Male')||nodes[0];
for(const node of nodes){if(node.getSkin()!==base.getSkin()||JSON.stringify(node.getMatrix())!==JSON.stringify(base.getMatrix())||node.getParentNode()!==base.getParentNode())throw Error('Operator parts have incompatible skin or transforms');}
const primitives=nodes.flatMap(n=>n.getMesh().listPrimitives());if(primitives.some(p=>p.getMaterial()!==primitives[0].getMaterial()))throw Error('Operator materials must be baked into vertex colors first');
const combined=joinPrimitives(primitives);base.setMesh(document.createMesh('Batched operator').addPrimitive(combined));
for(const node of nodes)if(node!==base)node.dispose();
await document.transform(prune());await io.write(output,document);
console.log(JSON.stringify({output,bytes:fs.statSync(output).size,meshes:root.listMeshes().length,clips:root.listAnimations().length}));
