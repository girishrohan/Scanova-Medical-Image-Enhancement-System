import numpy as np
import struct
import json
import os

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "models")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def write_glb(filepath, vertices, normals, indices):
    vertices = np.array(vertices, dtype=np.float32)
    normals = np.array(normals, dtype=np.float32)
    indices = np.array(indices, dtype=np.uint16)

    vert_bytes = vertices.tobytes()
    norm_bytes = normals.tobytes()
    idx_bytes = indices.tobytes()

    def pad4(b):
        r = len(b) % 4
        return b + b'\x00' * (4 - r) if r else b

    idx_padded = pad4(idx_bytes)
    vert_padded = pad4(vert_bytes)
    norm_padded = pad4(norm_bytes)

    total_buf = idx_padded + vert_padded + norm_padded
    idx_offset = 0
    vert_offset = len(idx_padded)
    norm_offset = vert_offset + len(vert_padded)

    v_min = vertices.min(axis=0).tolist()
    v_max = vertices.max(axis=0).tolist()

    gltf = {
        "asset": {"version": "2.0", "generator": "SCANOVA-ModelGen"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": os.path.splitext(os.path.basename(filepath))[0]}],
        "meshes": [{
            "primitives": [{
                "attributes": {"POSITION": 1, "NORMAL": 2},
                "indices": 0,
                "mode": 4
            }]
        }],
        "accessors": [
            {
                "bufferView": 0,
                "componentType": 5123,
                "count": len(indices),
                "type": "SCALAR",
                "max": [int(indices.max())],
                "min": [int(indices.min())]
            },
            {
                "bufferView": 1,
                "componentType": 5126,
                "count": len(vertices),
                "type": "VEC3",
                "max": v_max,
                "min": v_min
            },
            {
                "bufferView": 2,
                "componentType": 5126,
                "count": len(normals),
                "type": "VEC3"
            }
        ],
        "bufferViews": [
            {"buffer": 0, "byteOffset": idx_offset, "byteLength": len(idx_bytes), "target": 34963},
            {"buffer": 0, "byteOffset": vert_offset, "byteLength": len(vert_bytes), "byteStride": 12, "target": 34962},
            {"buffer": 0, "byteOffset": norm_offset, "byteLength": len(norm_bytes), "byteStride": 12, "target": 34962},
        ],
        "buffers": [{"byteLength": len(total_buf)}]
    }

    gltf_json = json.dumps(gltf, separators=(',', ':')).encode('utf-8')
    json_pad = (4 - len(gltf_json) % 4) % 4
    gltf_json += b' ' * json_pad

    json_chunk = struct.pack('<II', len(gltf_json), 0x4E4F534A) + gltf_json
    bin_chunk = struct.pack('<II', len(total_buf), 0x004E4942) + total_buf
    total_length = 12 + len(json_chunk) + len(bin_chunk)
    header = struct.pack('<III', 0x46546C67, 2, total_length)

    with open(filepath, 'wb') as f:
        f.write(header + json_chunk + bin_chunk)

    print(f"  Written: {os.path.basename(filepath)} ({len(vertices)} verts, {len(indices)//3} tris)")


# === CHEST / RIBCAGE ===
vertices = []
normals = []
indices = []

u_steps, v_steps = 32, 24
for j in range(v_steps + 1):
    v = j / v_steps
    for i in range(u_steps + 1):
        u = i / u_steps
        theta = (u - 0.5) * np.pi * 1.2
        phi = v * np.pi

        r = 0.35 + 0.05 * np.sin(phi)
        x = r * np.sin(theta)
        y = 0.3 - v * 0.7
        z = r * np.cos(theta) * 0.6 + 0.1

        if abs(theta) < 0.3:
            z -= 0.05

        vertices.append([x, y, z])
        nx = np.sin(theta)
        ny = -0.3
        nz = np.cos(theta) * 0.6
        ln = np.sqrt(nx*nx + ny*ny + nz*nz) + 1e-8
        normals.append([nx/ln, ny/ln, nz/ln])

for j in range(v_steps):
    for i in range(u_steps):
        a = j * (u_steps + 1) + i
        b = a + 1
        c = a + (u_steps + 1)
        d = c + 1
        indices.extend([a, b, c, b, d, c])

max_idx = len(vertices) - 1
indices = [min(idx, max_idx) for idx in indices]
write_glb(os.path.join(OUTPUT_DIR, "chest.glb"), vertices, normals, indices)
print(f"  chest.glb: {len(vertices)} verts")

# === HEART ===
vertices = []
normals = []
indices = []

u_steps, v_steps = 40, 32
for j in range(v_steps + 1):
    v = j / v_steps
    phi = v * np.pi
    for i in range(u_steps + 1):
        u_val = i / u_steps
        theta = u_val * 2 * np.pi

        r = 0.12
        x = r * np.sin(phi) * np.cos(theta)
        y = r * np.cos(phi) * 1.1
        z = r * np.sin(phi) * np.sin(theta)

        if x < 0:
            x *= 1.15
            y -= 0.02

        if y < -0.05:
            taper = 1.0 - 0.4 * min(1.0, (-y - 0.05) / 0.1)
            x *= taper
            z *= taper

        if y > 0.08:
            x *= 0.8
            z *= 0.8

        vertices.append([x, y + 0.05, z + 0.05])
        nx, ny, nz = x, y, z
        ln = np.sqrt(nx*nx + ny*ny + nz*nz) + 1e-8
        normals.append([nx/ln, ny/ln, nz/ln])

for j in range(v_steps):
    for i in range(u_steps):
        a = j * (u_steps + 1) + i
        b = a + 1
        c = a + (u_steps + 1)
        d = c + 1
        indices.extend([a, b, c, b, d, c])

max_idx = len(vertices) - 1
indices = [min(idx, max_idx) for idx in indices]
write_glb(os.path.join(OUTPUT_DIR, "heart.glb"), vertices, normals, indices)
print(f"  heart.glb: {len(vertices)} verts")

# === LUNGS ===
vertices = []
normals = []
indices = []

for side in [-1, 1]:
    base_idx = len(vertices)
    u_steps, v_steps = 32, 28
    for j in range(v_steps + 1):
        v = j / v_steps
        phi = v * np.pi
        for i in range(u_steps + 1):
            u_val = i / u_steps
            theta = u_val * 2 * np.pi

            r_x = 0.12
            r_y = 0.2
            r_z = 0.1

            x = side * (r_x * np.sin(phi) * np.cos(theta) + 0.05)
            y = r_y * np.cos(phi)
            z = r_z * np.sin(phi) * np.sin(theta)

            if side * x < 0.05:
                x *= 0.6

            if y < -0.1:
                taper = 1.0 - 0.5 * min(1.0, (-y - 0.1) / 0.1)
                x *= taper
                z *= taper

            vertices.append([x, y, z + 0.05])
            nx = (x - side * 0.05) / r_x
            ny = y / r_y
            nz = z / r_z
            ln = np.sqrt(nx*nx + ny*ny + nz*nz) + 1e-8
            normals.append([nx/ln, ny/ln, nz/ln])

    for j in range(v_steps):
        for i in range(u_steps):
            a = base_idx + j * (u_steps + 1) + i
            b = a + 1
            c = a + (u_steps + 1)
            d = c + 1
            indices.extend([a, b, c, b, d, c])

max_idx = len(vertices) - 1
indices = [min(idx, max_idx) for idx in indices]
write_glb(os.path.join(OUTPUT_DIR, "lungs.glb"), vertices, normals, indices)
print(f"  lungs.glb: {len(vertices)} verts")

print("\nDone! Generated chest.glb, heart.glb, lungs.glb")