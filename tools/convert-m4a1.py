"""Convert chasieboy317's Free3D OBJ to the modified game asset.

Usage: python3 tools/convert-m4a1.py /path/to/M4A1.obj assets/m4a1.glb
Requires NumPy. Download the source from the URL in ATTRIBUTION.md.
No external executable, downloaded script, or network request is used.
"""
import hashlib
import json
import struct
import sys
from pathlib import Path

import numpy as np


def convert(source, destination, profile="m4a1"):
    positions, normals, polygons = [], [], []
    group = "default"
    for line in source.read_text().splitlines():
        fields = line.split()
        if not fields:
            continue
        if fields[0] == "v":
            positions.append([float(v) for v in fields[1:4]])
        elif fields[0] == "vn":
            normals.append([float(v) for v in fields[1:4]])
        elif fields[0] == "g":
            group = " ".join(fields[1:])
        elif fields[0] == "f":
            face = []
            for field in fields[1:]:
                parts = field.split("/")
                vertex = int(parts[0])
                normal = int(parts[2]) if len(parts) > 2 and parts[2] else 0
                face.append((vertex - 1 if vertex > 0 else len(positions) + vertex,
                             normal - 1 if normal > 0 else len(normals) + normal))
            polygons.append((group, face))

    positions = np.asarray(positions, dtype=np.float64)
    normals = np.asarray(normals, dtype=np.float64)
    if profile == "sv98":
        polygons = [(g,f) for g,f in polygons if g != "pPlane1"]
    if profile == "m82":
        # Remove the deployed bipod and level the source's tilted barrel.
        polygons = [(g,f) for g,f in polygons if g != "polySurface233"]
        angle = -np.arctan(.226)
        rotation = np.array([[1,0,0],[0,np.cos(angle),-np.sin(angle)],[0,np.sin(angle),np.cos(angle)]])
        positions = positions @ rotation.T
        normals = normals @ rotation.T
    used = np.unique([v for _,f in polygons for v,_ in f])
    center = (positions[used].min(0) + positions[used].max(0)) * .5
    length = {"m4a1":.95,"sv98":1.2,"m82":1.35}[profile]
    scale = length / np.ptp(positions[used], axis=0).max()
    positions = (positions - center) * scale
    materials = [
        {"name": "Parkerized steel", "pbrMetallicRoughness": {"baseColorFactor": [.10, .125, .135, 1], "metallicFactor": .72, "roughnessFactor": .46}},
        {"name": "Polymer furniture", "pbrMetallicRoughness": {"baseColorFactor": [.075, .088, .083, 1], "metallicFactor": .05, "roughnessFactor": .77}},
        {"name": "Magazine", "pbrMetallicRoughness": {"baseColorFactor": [.18, .20, .21, 1], "metallicFactor": .62, "roughnessFactor": .53}},
        {"name": "Sight glass", "pbrMetallicRoughness": {"baseColorFactor": [.17, .24, .23, .20], "metallicFactor": .1, "roughnessFactor": .16}, "alphaMode": "BLEND", "doubleSided": True},
    ]
    # Separate the magazine for reloading; merge the many tiny source objects
    # into four draw calls. Cluster only close vertices with similar normals.
    if profile != "m4a1":
        materials[1]["pbrMetallicRoughness"]["baseColorFactor"] = [.15,.175,.125,1] if profile=="sv98" else [.10,.105,.105,1]
        materials[3] = {"name":"Scope housing", "pbrMetallicRoughness":{"baseColorFactor":[.07,.085,.09,1],"metallicFactor":.65,"roughnessFactor":.4}}
    buckets = {name: {"vertices": [], "normals": [], "indices": [], "lookup": {}}
               for name in ["Receiver", "Furniture", "Magazine", "Sight" if profile=="m4a1" else "Scope"]}
    source_triangles = 0
    for name, face in polygons:
        if profile == "sv98":
            if name == "group4 polySurface2":kind = "Magazine"
            elif name in ["group4 polySurface13","group4 polySurface14","group4 pSphere2","group4 pSphere3","group4 pCylinder18","group4 pCylinder19"]:kind = "Scope"
            elif name in ["group4 pCube4","pCube1 group4","group4 pCube2","group4 pCube3","group4 pCube5","group4 pCube6","group4 pCube7","group4 pCube8"]:kind="Furniture"
            else:kind="Receiver"
        elif profile == "m82":
            number = int(name.replace("polySurface", ""))
            if number >= 378:kind="Magazine"
            elif 345 <= number <= 352:kind="Scope"
            elif number in [247,249,250,251,252,291]:kind="Furniture"
            else:kind="Receiver"
        elif "desmont:magpul" in name or "group16" in name:
            kind = "Magazine"
        elif name == "M4_carbine:pPlane1":
            kind = "Sight"
        elif "verticalgrip" in name or "pCube7 M4_carbine:group2" == name or "group2 M4_carbine:pCube3" in name:
            kind = "Furniture"
        else:
            kind = "Receiver"
        bucket = buckets[kind]
        for i in range(1, len(face) - 1):
            source_triangles += 1
            triangle = [face[0], face[i], face[i + 1]]
            xyz = positions[[v for v, _ in triangle]]
            cross = np.cross(xyz[1] - xyz[0], xyz[2] - xyz[0])
            if np.linalg.norm(cross) < 1e-10:
                continue
            flat = cross / np.linalg.norm(cross)
            indices = []
            for vi, ni in triangle:
                p = positions[vi]
                n = normals[ni] if len(normals) and ni >= 0 else flat
                if np.linalg.norm(n) < 1e-9:
                    n = flat
                n = n / max(np.linalg.norm(n), 1e-12)
                key = (*np.round(p / .0015).astype(int), *np.round(n * 24).astype(int))
                index = bucket["lookup"].get(key)
                if index is None:
                    index = len(bucket["vertices"])
                    bucket["lookup"][key] = index
                    bucket["vertices"].append(p)
                    bucket["normals"].append(n)
                indices.append(index)
            if len(set(indices)) == 3:
                bucket["indices"].extend(indices)

    binary = bytearray()
    gltf = {"asset": {"version": "2.0", "generator": "BlackSite Free3D OBJ converter",
                      "copyright": profile.upper()+" by chasieboy317; modified by the BlackSite project; see ATTRIBUTION.md"},
            "scene": 0, "scenes": [{"nodes": []}], "nodes": [], "meshes": [],
            "materials": materials, "bufferViews": [], "accessors": [],
            "extras": {"source": {"m4a1":"https://free3d.com/3d-model/m4a1-33156.html","sv98":"https://free3d.com/3d-model/sv98-sniper-rifle-72000.html","m82":"https://free3d.com/3d-model/m82-barrett-10543.html"}[profile],
                       "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                       "sourceTriangles": source_triangles,
                       "changes": "Triangulated, indexed, close-vertex clustering, merged parts, normalized, original PBR materials; magazine kept separate; non-weapon ground / deployed M82 bipod removed"}}

    def accessor(array, component, shape, target, normalized=False, bounds=False):
        while len(binary) % 4:
            binary.append(0)
        view = len(gltf["bufferViews"])
        buffer_view = {"buffer": 0, "byteOffset": len(binary), "byteLength": array.nbytes, "target": target}
        if shape == "VEC3" and array.ndim == 2 and array.shape[1] == 4:
            buffer_view["byteStride"] = 4
        gltf["bufferViews"].append(buffer_view)
        binary.extend(array.tobytes())
        acc = {"bufferView": view, "componentType": component, "count": len(array), "type": shape}
        if normalized:
            acc["normalized"] = True
        if bounds:
            acc["min"], acc["max"] = array.min(0).tolist(), array.max(0).tolist()
        gltf["accessors"].append(acc)
        return len(gltf["accessors"]) - 1

    total = 0
    for material, (name, bucket) in enumerate(buckets.items()):
        if not bucket["indices"]:
            continue
        p = np.asarray(bucket["vertices"], dtype="<f4")
        n = np.zeros((len(p), 4), dtype="i1")
        n[:, :3] = np.round(np.asarray(bucket["normals"]) * 127).clip(-127, 127).astype("i1")
        ix = np.asarray(bucket["indices"], dtype="<u2" if len(p) < 65536 else "<u4")
        primitive = {"attributes": {"POSITION": accessor(p, 5126, "VEC3", 34962, bounds=True),
                                    "NORMAL": accessor(n, 5120, "VEC3", 34962, normalized=True)},
                     "indices": accessor(ix, 5123 if ix.dtype.itemsize == 2 else 5125, "SCALAR", 34963),
                     "material": material}
        index = len(gltf["meshes"])
        gltf["meshes"].append({"name": name, "primitives": [primitive]})
        gltf["nodes"].append({"name": name, "mesh": index})
        gltf["scenes"][0]["nodes"].append(index)
        total += len(ix) // 3
        print(f"{name}: {len(p):,} vertices, {len(ix) // 3:,} triangles")
    # Integer NORMAL attributes require the quantization extension in glTF.
    gltf["extensionsUsed"] = ["KHR_mesh_quantization"]
    gltf["extensionsRequired"] = ["KHR_mesh_quantization"]
    while len(binary) % 4:
        binary.append(0)
    gltf["buffers"] = [{"byteLength": len(binary)}]
    encoded = json.dumps(gltf, separators=(",", ":")).encode()
    encoded += b" " * (-len(encoded) % 4)
    data = struct.pack("<III", 0x46546C67, 2, 28 + len(encoded) + len(binary))
    data += struct.pack("<II", len(encoded), 0x4E4F534A) + encoded
    data += struct.pack("<II", len(binary), 0x004E4942) + binary
    destination.write_bytes(data)
    print(f"{source_triangles:,} source triangles -> {total:,}; {len(data):,} bytes; {destination}")


if __name__ == "__main__":
    convert(Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3] if len(sys.argv)>3 else "m4a1")
